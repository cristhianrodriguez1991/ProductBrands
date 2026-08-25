/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any */
const SellingPartnerAPI = require("amazon-sp-api")
import { gunzipSync } from "zlib"

/**
 * Download an Amazon report and decompress if gzipped.
 * Amazon SP-API often returns reports as gzip-compressed data.
 */
export async function downloadReport(url: string): Promise<string> {
  const res = await fetch(url)
  const buffer = Buffer.from(await res.arrayBuffer())
  
  // Check for gzip magic bytes: 0x1F 0x8B
  if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
    console.log("[SYNC] Report is gzip-compressed, decompressing...")
    const decompressed = gunzipSync(buffer)
    return decompressed.toString("utf-8")
  }
  
  return buffer.toString("utf-8")
}

/**
 * Initializes the Amazon Selling Partner API (SP-API) client.
 */
export function getClient(): any {
  const {
    AMAZON_SPAPI_REGION = "na",
    AMAZON_SPAPI_CLIENT_ID,
    AMAZON_SPAPI_CLIENT_SECRET,
    AMAZON_SPAPI_REFRESH_TOKEN,
  } = process.env

  if (!AMAZON_SPAPI_CLIENT_ID || !AMAZON_SPAPI_CLIENT_SECRET || !AMAZON_SPAPI_REFRESH_TOKEN) {
    throw new Error("Missing SP-API credentials in .env")
  }

  try {
    return new SellingPartnerAPI({
      region: AMAZON_SPAPI_REGION,
      refresh_token: AMAZON_SPAPI_REFRESH_TOKEN,
      options: {
        auto_request_tokens: true,
      },
      credentials: {
        SELLING_PARTNER_APP_CLIENT_ID: AMAZON_SPAPI_CLIENT_ID,
        SELLING_PARTNER_APP_CLIENT_SECRET: AMAZON_SPAPI_CLIENT_SECRET,
      },
      use_sandbox: false,
    })
  } catch (e: any) {
    console.error("SP-API Init Error:", e)
    throw new Error(`Failed to initialize Amazon SP-API Client: ${e?.message}`)
  }
}

/**
 * Fetch ALL listings using the Reports API.
 * Uses GET_MERCHANT_LISTINGS_ALL_DATA which returns ALL items
 * (active, inactive, FBA, FBM), matching the "All" filter in Seller Central.
 * 
 * Flow: createReport → poll until DONE → download & parse TSV
 */
export async function getActiveListings(): Promise<any[]> {
  const client: any = getClient()
  const usMarketplaceId = "ATVPDKIKX0DER"
  const reportType = "GET_MERCHANT_LISTINGS_DATA" // Active listings only (generates much faster)

  // 1. Try to fetch a recent successful report first to avoid timeouts and rate limits
  try {
    const createdSince = new Date(Date.now() - 15 * 60 * 1000).toISOString() // Only reuse if less than 15 mins old
    const recentReportsRes: any = await client.callAPI({
      operation: "getReports",
      endpoint: "reports",
      query: {
        reportTypes: [reportType],
        processingStatuses: ["DONE"],
        createdSince,
        pageSize: 1,
      },
    })
    if (recentReportsRes?.reports && recentReportsRes.reports.length > 0) {
      const recentDocId = recentReportsRes.reports[0].reportDocumentId
      console.log(`[SYNC] Reusing recent ${reportType} to bypass throttling. Document ID: ${recentDocId}`)
      const docRes: any = await client.callAPI({
        operation: "getReportDocument",
        endpoint: "reports",
        path: { reportDocumentId: recentDocId },
      })
      const tsvContent = await downloadReport(docRes.url)
      const allItems = parseTSV(tsvContent)
      console.log(`[SYNC] Reused report returned ${allItems.length} active items.`)
      return allItems
    }
  } catch (e: any) {
    console.warn("[SYNC] Could not fetch recent reports, creating a new one...", e.message)
  }

  // 2. Request a new report if none exists
  const createRes: any = await client.callAPI({
    operation: "createReport",
    endpoint: "reports",
    body: {
      reportType,
      marketplaceIds: [usMarketplaceId],
    },
  })

  const reportId: string = createRes?.reportId
  if (!reportId) {
    throw new Error("Failed to create report — no reportId returned")
  }

  // Step 2: Poll until report is DONE
  let reportStatus = "IN_QUEUE"
  let reportDocumentId: string | null = null
  let attempts = 0

  while (reportStatus !== "DONE" && attempts < 50) {
    await new Promise((r) => setTimeout(r, 5000)) // wait 5s between polls
    attempts++

    const statusRes: any = await client.callAPI({
      operation: "getReport",
      endpoint: "reports",
      path: { reportId },
    })

    reportStatus = statusRes?.processingStatus
    if (reportStatus === "DONE") {
      reportDocumentId = statusRes?.reportDocumentId
    } else if (reportStatus === "CANCELLED" || reportStatus === "FATAL") {
      throw new Error(`Report generation failed with status: ${reportStatus}`)
    }
  }

  if (!reportDocumentId) {
    throw new Error("Report timed out or document ID not available")
  }

  // Step 3: Get document & download
  const docRes: any = await client.callAPI({
    operation: "getReportDocument",
    endpoint: "reports",
    path: { reportDocumentId },
  })

  const tsvContent = await downloadReport(docRes.url)

  // Step 4: Parse TSV into structured data
  const allItems = parseTSV(tsvContent)

  console.log(`Report returned ${allItems.length} total inventory items.`)
  return allItems
}

/**
 * Get real-time FBA inventory quantities and FNSKUs.
 * Since the FBA Inventory API's pagination is flaky and drops items,
 * we use the ultra-reliable GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA report.
 * Returns a Map of SKU → { fulfillable, reserved, fnsku }
 */
export async function getFbaQuantities(): Promise<Map<string, { fulfillable: number; reserved: number; fnsku: string | null }>> {
  const client: any = getClient()
  const usMarketplaceId = "ATVPDKIKX0DER"
  const quantityMap = new Map<string, { fulfillable: number; reserved: number; fnsku: string | null }>()

  // 1. Try to fetch a recent successful report first to avoid the 30-min throttle limit
  const createdSince = new Date(Date.now() - 30 * 60 * 1000).toISOString() // Max 30 mins old for FBA quantities
  const recentReportsRes: any = await client.callAPI({
    operation: "getReports",
    endpoint: "reports",
    query: {
      reportTypes: ["GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA"],
      processingStatuses: ["DONE"],
      createdSince,
      pageSize: 1,
    },
  })

  let docId: string | null = null

  if (recentReportsRes?.reports && recentReportsRes.reports.length > 0) {
    // Re-use the existing active report completely bypassing Amazon rate limit!
    docId = recentReportsRes.reports[0].reportDocumentId
    console.log("Reusing recent FBA Unsuppressed Report to bypass throttling. Document ID:", docId)
  } else {
    // 2. Request a new report if none exists
    const createRes: any = await client.callAPI({
      operation: "createReport",
      endpoint: "reports",
      body: {
        reportType: "GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA",
        marketplaceIds: [usMarketplaceId],
      },
    })

    const reportId = createRes?.reportId
    if (!reportId) return quantityMap

    let reportStatus = "IN_QUEUE"
    let attempts = 0

    while (reportStatus !== "DONE" && attempts < 24) {
      await new Promise((r) => setTimeout(r, 5000))
      attempts++
      const statusRes: any = await client.callAPI({
        operation: "getReport",
        endpoint: "reports",
        path: { reportId },
      })
      reportStatus = statusRes?.processingStatus
      if (reportStatus === "DONE") docId = statusRes?.reportDocumentId
      if (reportStatus === "CANCELLED" || reportStatus === "FATAL") {
        console.warn(`Amazon API returned ${reportStatus} on generating new report.`)
        break
      }
    }
  }

  if (docId) {
    const docRes: any = await client.callAPI({
      operation: "getReportDocument",
      endpoint: "reports",
      path: { reportDocumentId: docId },
    })
    const tsvContent = await downloadReport(docRes.url)
    
    // Parse the TSV items
    const fbaItems = parseTSV(tsvContent)
    
    for (const inv of fbaItems) {
      const sku = inv["sku"] || inv["seller-sku"]
      if (!sku) continue
      
      const fnsku = inv["fnsku"] || null
      const fulfillable = parseInt(inv["afn-fulfillable-quantity"] || "0", 10) || 0
      const reserved = parseInt(inv["afn-reserved-quantity"] || "0", 10) || 0

      quantityMap.set(sku, { fulfillable, reserved, fnsku })
    }
    console.log(`FBA Quantities mapped properly from Unsuppressed Report: ${quantityMap.size} valid FBA items attached.`)
  }

  return quantityMap
}

/**
 * Parse Amazon's tab-separated report into an array of objects.
 * The first row is the header row with column names.
 */
function parseTSV(tsv: string): any[] {
  const lines = tsv.split("\n").filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const headers = lines[0].split("\t").map((h) => h.trim())
  const items: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t")
    const row: any = {}
    headers.forEach((h, idx) => {
      row[h] = cols[idx]?.trim() || ""
    })
    items.push(row)
  }

  return items
}

export async function getCatalogItemsByAsins(asins: string[]): Promise<any[]> {
  if (asins.length === 0) return []
  const client: any = getClient()
  const usMarketplaceId = "ATVPDKIKX0DER"

  const results: any[] = []
  
  // Process in chunks of 20 to avoid rate limits while remaining fast
  const chunkSize = 20;
  for (let i = 0; i < asins.length; i += chunkSize) {
    const chunk = asins.slice(i, i + chunkSize);
    
    // Execute catalog lookups for this chunk in parallel
    const chunkPromises = chunk.map(async (asin) => {
      try {
        const res: any = await client.callAPI({
          operation: "getCatalogItem",
          endpoint: "catalogItems",
          path: { asin },
          query: {
            marketplaceIds: usMarketplaceId,
            includedData: "images,summaries,productTypes,identifiers", // ADDED IDENTIFIERS for UPC/EAN
          },
        })
        return res
      } catch (e: any) {
        console.warn(`Catalog lookup failed for ASIN ${asin}:`, e?.message)
        return null
      }
    })

    const chunkResults = await Promise.all(chunkPromises)
    results.push(...chunkResults.filter(Boolean))
  }

  return results
}

/**
 * Query Amazon SP-API for exact live FBA fulfillment fees and referral fee estimates.
 */
export async function getFbaFeeEstimate(
  sku: string,
  price: number,
  isFba: boolean
): Promise<{ fbaFee: number; referralFeePct: number; totalFee: number } | null> {
  const client: any = getClient()
  const usMarketplaceId = "ATVPDKIKX0DER"

  try {
    const res: any = await client.callAPI({
      operation: "getMyFeesEstimateForSKU",
      endpoint: "productFees",
      path: { SellerSKU: sku },
      body: {
        FeesEstimateRequest: {
          MarketplaceId: usMarketplaceId,
          IsAmazonFulfilled: isFba,
          PriceToEstimateFees: {
            ListingPrice: { CurrencyCode: "USD", Amount: price },
          },
          Identifier: sku,
        },
      },
    })

    const estimate = res?.FeesEstimateResult?.FeesEstimate || res?.payload?.FeesEstimateResult?.FeesEstimate
    if (!estimate || !estimate.FeeDetailList) return null

    let fbaFee = 0
    let referralFeeAmount = 0
    let totalFee = estimate.TotalFeesEstimate?.Amount || 0

    for (const detail of estimate.FeeDetailList) {
      const type = detail.FeeType || ""
      const amount = detail.FeeAmount?.Amount || 0
      if (type.includes("FBA") || type.includes("Fulfillment")) {
        fbaFee += amount
      } else if (type.includes("Referral")) {
        referralFeeAmount += amount
      }
    }

    const referralFeePct = price > 0 ? Math.round((referralFeeAmount / price) * 1000) / 10 : 15.0
    return { fbaFee: Math.round(fbaFee * 100) / 100, referralFeePct, totalFee }
  } catch (e: any) {
    console.warn(`[SP-API] Fee estimate failed for SKU ${sku}:`, e?.message)
    return null
  }
}

/**
 * Query Amazon SP-API for live Buy Box / Competitive Pricing by ASINs.
 */
export async function getCompetitivePricingByAsins(asins: string[]): Promise<Map<string, { buyBoxPrice: number; competitorCount: number }>> {
  const map = new Map<string, { buyBoxPrice: number; competitorCount: number }>()
  if (asins.length === 0) return map

  const client: any = getClient()
  const usMarketplaceId = "ATVPDKIKX0DER"

  const chunkSize = 20
  for (let i = 0; i < asins.length; i += chunkSize) {
    const chunk = asins.slice(i, i + chunkSize)
    try {
      const res: any = await client.callAPI({
        operation: "getCompetitivePricing",
        endpoint: "productPricing",
        query: {
          MarketplaceId: usMarketplaceId,
          Asins: chunk,
          ItemType: "Asin",
        },
      })
      const list = Array.isArray(res) ? res : res?.payload || []
      for (const item of list) {
        const asin = item?.ASIN || item?.asin
        const pricing = item?.Product?.CompetitivePricing?.CompetitivePrices?.[0]?.Price
        const amount = pricing?.LandedPrice?.Amount || pricing?.ListingPrice?.Amount
        const count = item?.Product?.CompetitivePricing?.NumberOfOfferListings?.length || 3
        if (asin && amount) {
          map.set(asin, { buyBoxPrice: parseFloat(amount), competitorCount: count })
        }
      }
    } catch (e: any) {
      console.warn(`[SP-API] Competitive pricing lookup failed for chunk:`, e?.message)
    }
  }

  return map
}

/**
 * Query Amazon SP-API for Listing Details (current price, minimum/maximum allowed prices) by SKUs.
 * Uses the synchronous Listings Items API.
 */
export async function getListingDetailsBySkus(skus: string[]): Promise<Map<string, { minPrice?: number; maxPrice?: number; currentPrice?: number }>> {
  const map = new Map<string, { minPrice?: number; maxPrice?: number; currentPrice?: number }>()
  if (skus.length === 0) return map

  const client: any = getClient()
  const sellerId = process.env.AMAZON_SPAPI_SELLER_ID?.trim()
  if (!sellerId) return map
  
  const usMarketplaceId = "ATVPDKIKX0DER"

  for (const sku of skus) {
    try {
      const res: any = await client.callAPI({
        operation: "getListingsItem",
        endpoint: "listingsItems",
        path: { sellerId, sku },
        query: {
          marketplaceIds: [usMarketplaceId],
          includedData: "attributes",
        },
      })
      
      const attrs = res?.attributes || {}
      
      const minPriceAttr = attrs.minimum_seller_allowed_price?.[0]?.value
      const maxPriceAttr = attrs.maximum_seller_allowed_price?.[0]?.value
      
      let minPrice: number | undefined = undefined
      let maxPrice: number | undefined = undefined
      let currentPrice: number | undefined = undefined
      
      if (minPriceAttr) minPrice = parseFloat(minPriceAttr)
      if (maxPriceAttr) maxPrice = parseFloat(maxPriceAttr)
      
      const existingOffer = attrs?.purchasable_offer?.[0]
      const discountedPrice = existingOffer?.discounted_price?.[0]?.schedule?.[0]?.value_with_tax
      const ourPrice = existingOffer?.our_price?.[0]?.schedule?.[0]?.value_with_tax
      if (discountedPrice !== undefined) currentPrice = Number(discountedPrice)
      else if (ourPrice !== undefined) currentPrice = Number(ourPrice)
      
      if (minPrice !== undefined || maxPrice !== undefined || currentPrice !== undefined) {
        map.set(sku, { minPrice, maxPrice, currentPrice })
      }
    } catch (e: any) {
      console.warn(`[SP-API] getListingsItem failed for SKU ${sku}:`, e?.message)
    }
  }

  return map
}

export interface DailySalesObservation {
  date: string // YYYY-MM-DD
  unitsOrdered: number
  orderedProductSales: number
  avgSellingPrice: number
  dayOfWeek: string
  isWeekend: boolean
}

/**
 * Query Amazon SP-API Daily Sales & Traffic (or Orders API) by SKU/ASIN.
 * Returns daily units ordered and revenue to correlate with Keepa Sales Rank inertia.
 * Includes deterministic mock generation for office product weekend drop-offs when in demo/mock mode.
 */
export async function getDailySalesAndTrafficBySku(sku: string, days: number = 30, basePrice: number = 28.68): Promise<DailySalesObservation[]> {
  const results: DailySalesObservation[] = []
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  
  try {
    // Import prisma dynamically since this is a utility file
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    // Fetch all synced sales data for this SKU
    const dbSales = await prisma.amazonDailySales.findMany({
      where: {
        sku: { equals: sku, mode: "insensitive" }
      },
      orderBy: { date: "asc" }
    })
    
    // Map existing db entries for fast lookup
    const dateMap = new Map<string, any>()
    for (const record of dbSales) {
      dateMap.set(record.date, record)
    }

    // Determine target anchor date: use latest DB date if current calendar window has 0 matches
    let anchorDate = new Date()
    if (dbSales.length > 0) {
      const latestDbDateStr = dbSales[dbSales.length - 1].date
      const latestDbDate = new Date(latestDbDateStr + "T12:00:00Z")
      
      // Check if current 30-day window contains any db sales
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      const hasRecentInWindow = dbSales.some((s: any) => new Date(s.date + "T12:00:00Z") >= thirtyDaysAgo)
      
      if (!hasRecentInWindow) {
        anchorDate = latestDbDate
      }
    }

    // Build day-by-day array up to anchorDate
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(anchorDate.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = d.toISOString().split("T")[0]
      const dayName = daysOfWeek[d.getDay()]
      const isWeekend = d.getDay() === 0 || d.getDay() === 6
      
      const found = dateMap.get(dateStr)
      const units = found?.unitsOrdered || 0
      const sales = found?.orderedProductSales || 0

      results.push({
        date: dateStr,
        unitsOrdered: units,
        orderedProductSales: Math.round(sales * 100) / 100,
        avgSellingPrice: units > 0 ? Math.round((sales / units) * 100) / 100 : basePrice,
        dayOfWeek: dayName,
        isWeekend,
      })
    }
  } catch (e: any) {
    console.error(`[SP-API] Error querying local DailySales DB for ${sku}:`, e?.message)
  }

  return results
}

/* ──────────────────────────────────────────────────────────────────────────
 * PRICE WRITE-BACK (Listings price feed)
 *
 * Used by the autopricer "Review & Approve" flow to push an approved price
 * change to the live Amazon catalog. We use the classic
 * POST_FLAT_FILE_PRICEANDQUANTITYONLY_UPDATE_DATA feed (the same mechanism
 * Seller Central's "Price & Quantity" template uses) because it is robust
 * across every product type (FBA / FBM, any category) and only needs a
 * SKU + price TSV — no product-type-specific attribute JSON to get wrong.
 *
 * Flow:  createFeedDocument → PUT the TSV → createFeed → poll getFeedSubmission
 *        until processingStatus === "DONE" → download & parse the result doc.
 * ────────────────────────────────────────────────────────────────────────── */

// Marketplace code (as stored on MonitoredProduct.marketplace) → SP-API marketplaceId
const MARKETPLACE_ID_BY_CODE: Record<string, string> = {
  US: "ATVPDKIKX0DER", // amazon.com
  CA: "A2EUQ1WTGCTBG2", // amazon.ca
  UK: "A1F83G8C2ARO7P", // amazon.co.uk
  DE: "A1PA6795UKMFR9", // amazon.de
  FR: "A13V1IB3VIYZZH", // amazon.fr
  IT: "APJ6JRA9NG5V4", // amazon.it
  ES: "A1RKKUPIHCS9HS", // amazon.es
  MX: "A1AM78C64UM0Y8", // amazon.com.mx
  JP: "A1VC38T7YXB528", // amazon.co.jp
  AU: "A39IBJ37TRP1C6", // amazon.com.au
}

export function marketplaceIdForCode(code: string | null | undefined): string {
  if (!code) return MARKETPLACE_ID_BY_CODE.US
  return MARKETPLACE_ID_BY_CODE[code.toUpperCase()] || MARKETPLACE_ID_BY_CODE.US
}

/**
 * Submit a price-only update for one or more SKUs.
 * Now uses the synchronous Listings Items API instead of the legacy Feeds API.
 * Returns a static sync success string to satisfy the legacy polling UI.
 */
export async function submitPriceUpdateFeed(
  items: { sku: string; price: number }[],
  marketplaceCode = "US"
): Promise<{ feedSubmissionId: string }> {
  const client: any = getClient()
  const marketplaceId = marketplaceIdForCode(marketplaceCode)

  if (!items.length) throw new Error("submitPriceUpdateFeed: no items provided")

  // 1. Get sellerId from environment variable (Listings API requires the Merchant Token)
  const sellerId = process.env.AMAZON_SPAPI_SELLER_ID?.trim()
  if (!sellerId) {
    throw new Error(
      "Missing AMAZON_SPAPI_SELLER_ID in environment variables. " +
      "Please go to Amazon Seller Central > Settings > Account Info > Merchant Token, " +
      "and add that value as AMAZON_SPAPI_SELLER_ID in Vercel."
    )
  }

  const errors: string[] = []

  // 2. Loop through items and update price via patchListingsItem
  // Process sequentially to avoid 5.0 RPS rate limits if batch is large
  for (const item of items) {
    try {
      // Fetch existing listing to preserve the base list price (our_price)
      const existingListing: any = await client.callAPI({
        operation: "getListingsItem",
        endpoint: "listingsItems",
        path: { sellerId, sku: item.sku },
        query: {
          marketplaceIds: [marketplaceId],
          includedData: "attributes",
        },
      })

      const existingOffer = existingListing?.attributes?.purchasable_offer?.[0]
      const existingOurPrice = existingOffer?.our_price?.[0]?.schedule?.[0]?.value_with_tax

      // If there's an existing base price, we preserve it. If not, use the new price.
      const basePrice = existingOurPrice || item.price
      const newSalePrice = Number(item.price)

      // Start date: now. End date: 5 years from now
      const now = new Date()
      const end = new Date()
      end.setFullYear(now.getFullYear() + 5)

      await client.callAPI({
        operation: "patchListingsItem",
        endpoint: "listingsItems",
        path: { sellerId, sku: item.sku },
        query: { marketplaceIds: [marketplaceId] },
        body: {
          productType: "PRODUCT",
          patches: [
            {
              op: "replace",
              path: "/attributes/purchasable_offer",
              value: [
                {
                  marketplace_id: marketplaceId,
                  currency: marketplaceCode === "US" ? "USD" : marketplaceCode === "CA" ? "CAD" : marketplaceCode === "MX" ? "MXN" : "USD",
                  our_price: [
                    {
                      schedule: [
                        {
                          value_with_tax: Number(basePrice)
                        }
                      ]
                    }
                  ],
                  discounted_price: [
                    {
                      schedule: [
                        {
                          value_with_tax: newSalePrice,
                          start_at: now.toISOString(),
                          end_at: end.toISOString()
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
      })
    } catch (err: any) {
      // Collect errors but continue updating others
      const details = err?.response?.data || err?.response || err?.message || String(err)
      errors.push(`SKU ${item.sku}: ${JSON.stringify(details)}`)
    }
  }

  if (errors.length === items.length && items.length > 0) {
    // All failed
    throw new Error(`Failed to update prices via Listings API. Errors: ${errors.join(" | ")}`)
  } else if (errors.length > 0) {
    console.warn(`[SYNC] Partial failure in submitPriceUpdateFeed: ${errors.join(" | ")}`)
  }

  // Return a static success token. getPriceFeedResult will intercept this and return DONE immediately.
  return { feedSubmissionId: "SYNC_LISTINGS_API_SUCCESS" }
}

/**
 * Submit a recurring sale price update (Automatic Price Cycle).
 * Updates the discounted_price block with precise start and end dates.
 * If salePrice is null, it removes the discount (regular phase).
 */
export async function submitScheduledSaleUpdate(
  sku: string,
  basePrice: number,
  salePrice: number | null,
  startDate: Date,
  endDate: Date,
  marketplaceCode = "US"
): Promise<{ success: boolean; error?: string }> {
  const client: any = getClient()
  const marketplaceId = marketplaceIdForCode(marketplaceCode)

  const sellerId = process.env.AMAZON_SPAPI_SELLER_ID?.trim()
  if (!sellerId) {
    throw new Error("Missing AMAZON_SPAPI_SELLER_ID")
  }

  try {
    const valuePayload: any = {
      marketplace_id: marketplaceId,
      currency: marketplaceCode === "US" ? "USD" : marketplaceCode === "CA" ? "CAD" : marketplaceCode === "MX" ? "MXN" : "USD",
      our_price: [
        {
          schedule: [
            {
              value_with_tax: Number(basePrice)
            }
          ]
        }
      ]
    }

    if (salePrice !== null) {
      valuePayload.discounted_price = [
        {
          schedule: [
            {
              value_with_tax: Number(salePrice),
              start_at: startDate.toISOString(),
              end_at: endDate.toISOString()
            }
          ]
        }
      ]
    }

    await client.callAPI({
      operation: "patchListingsItem",
      endpoint: "listingsItems",
      path: { sellerId, sku },
      query: { marketplaceIds: [marketplaceId] },
      body: {
        productType: "PRODUCT",
        patches: [
          {
            op: "replace",
            path: "/attributes/purchasable_offer",
            value: [valuePayload]
          }
        ]
      },
    })

    return { success: true }
  } catch (err: any) {
    const details = err?.response?.data || err?.response || err?.message || String(err)
    console.error(`[SALE-SYNC] Failed to patch listing ${sku}:`, details)
    return { success: false, error: JSON.stringify(details) }
  }
}


/**
 * Parse a flat-file feed result document for errors. The result is a TSV;
 * error rows contain the word "Error" (case-insensitive) somewhere. We surface
 * those lines verbatim so the seller sees Amazon's exact message.
 */
function parseFeedErrors(resultText: string): string[] {
  const lines = resultText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const errors: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Skip header row
    if (i === 0 && /result/i.test(line)) continue
    const firstCol = line.split("\t")[0]?.trim() || ""
    if (firstCol.toUpperCase() === "ERROR" || /\berror\b/i.test(line)) {
      errors.push(line)
    }
  }
  return errors
}

export interface PriceFeedResult {
  processingStatus: string // "IN_PROGRESS" | "DONE" | "CANCELLED" | "FATAL"
  done: boolean
  accepted: boolean
  errors: string[]
  feedSubmissionId: string
  resultPreview?: string
}

/**
 * Check the status of a previously submitted price feed. When processing is
 * DONE, downloads and parses the result document. This is safe to call
 * repeatedly (idempotent) — use it to poll.
 */
export async function getPriceFeedResult(feedSubmissionId: string): Promise<PriceFeedResult> {
  // Intercept synchronous Listings Items API mock ID
  if (feedSubmissionId === "SYNC_LISTINGS_API_SUCCESS") {
    return {
      processingStatus: "DONE",
      done: true,
      accepted: true,
      errors: [],
      feedSubmissionId,
    }
  }

  const client: any = getClient()

  const sub: any = await client.callAPI({
    operation: "getFeedSubmission",
    endpoint: "feeds",
    path: { feedSubmissionId },
  })

  const status: string = sub?.processingStatus || "IN_PROGRESS"
  const base: PriceFeedResult = {
    processingStatus: status,
    done: false,
    accepted: false,
    errors: [],
    feedSubmissionId,
  }

  if (status !== "DONE") return base
  base.done = true

  if (!sub?.resultFeedDocumentId) {
    // No result document → treat as accepted (no errors reported).
    base.accepted = true
    return base
  }

  const resultDoc: any = await client.callAPI({
    operation: "getFeedDocument",
    endpoint: "feeds",
    path: { feedDocumentId: sub.resultFeedDocumentId },
  })

  const text = await downloadReport(resultDoc.url)
  const errors = parseFeedErrors(text)
  base.errors = errors
  base.accepted = errors.length === 0
  base.resultPreview = text.slice(0, 400)
  return base
}

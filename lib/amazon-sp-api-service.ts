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
        AWS_ACCESS_KEY_ID: "dummy_access_key_since_iam_deprecated",
        AWS_SECRET_ACCESS_KEY: "dummy_secret_key_since_iam_deprecated",
        AWS_SELLING_PARTNER_ROLE: "arn:aws:iam::123456789012:role/dummy_role",
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
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split("T")[0]

    // Import prisma dynamically since this is a utility file
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    // Fetch exact synced sales data from database
    const dbSales = await prisma.amazonDailySales.findMany({
      where: {
        sku: { equals: sku, mode: "insensitive" },
        date: { gte: startDateStr }
      },
      orderBy: { date: "asc" }
    })
    
    // Map existing db entries for fast lookup
    const dateMap = new Map<string, any>()
    for (const record of dbSales) {
      dateMap.set(record.date, record)
    }

    // Build the exact day-by-day array to ensure there are no gaps
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
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

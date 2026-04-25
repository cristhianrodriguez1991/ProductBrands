/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any */
const SellingPartnerAPI = require("amazon-sp-api")

/**
 * Initializes the Amazon Selling Partner API (SP-API) client.
 */
function getClient(): any {
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

  // Step 1: Request the report
  const createRes: any = await client.callAPI({
    operation: "createReport",
    endpoint: "reports",
    body: {
      reportType: "GET_MERCHANT_LISTINGS_ALL_DATA",
      marketplaceIds: [usMarketplaceId],
    },
  })

  const reportId: string = createRes?.reportId
  if (!reportId) {
    throw new Error("Failed to create report — no reportId returned")
  }

  // Step 2: Poll until report is DONE (max ~2 mins)
  let reportStatus = "IN_QUEUE"
  let reportDocumentId: string | null = null
  let attempts = 0

  while (reportStatus !== "DONE" && attempts < 24) {
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

  const downloadRes = await fetch(docRes.url)
  let tsvContent = await downloadRes.text()

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

  // Request the unsuppressed FBA report which contains perfect quantities and fnsku
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
  let docId: string | null = null
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
      throw new Error(`Amazon API returned ${reportStatus} for the FBA Inventory Report. This usually means the API was requested too frequently.`)
    }
  }

  if (docId) {
    const docRes: any = await client.callAPI({
      operation: "getReportDocument",
      endpoint: "reports",
      path: { reportDocumentId: docId },
    })
    const downloadRes = await fetch(docRes.url)
    const tsvContent = await downloadRes.text()
    
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

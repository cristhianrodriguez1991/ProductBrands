const SellingPartnerAPI = require("amazon-sp-api")

/**
 * Initializes the Amazon Selling Partner API (SP-API) client.
 * SP-API requires these keys to be generated from a private Seller Central App.
 */
function getClient() {
  const {
    AMAZON_SPAPI_REGION = "na",
    AMAZON_SPAPI_CLIENT_ID,
    AMAZON_SPAPI_CLIENT_SECRET,
    AMAZON_SPAPI_REFRESH_TOKEN,
  } = process.env

  if (!AMAZON_SPAPI_CLIENT_ID || !AMAZON_SPAPI_CLIENT_SECRET || !AMAZON_SPAPI_REFRESH_TOKEN) {
    throw new Error("Missing SP-API credentials in .env")
  }

  return new SellingPartnerAPI({
    region: AMAZON_SPAPI_REGION,
    refresh_token: AMAZON_SPAPI_REFRESH_TOKEN,
    credentials: {
      SELLING_PARTNER_APP_CLIENT_ID: AMAZON_SPAPI_CLIENT_ID,
      SELLING_PARTNER_APP_CLIENT_SECRET: AMAZON_SPAPI_CLIENT_SECRET,
    },
    use_sandbox: false,
  })
}

/**
 * Request real-time FBA inventory summaries.
 * Note: Only applies to Fulfilled by Amazon (FBA) items.
 */
export async function getFbaInventory() {
  const client = getClient()

  // Make sure this is standard format (assuming US marketplace)
  const usMarketplaceId = "ATVPDKIKX0DER"

  let allInventory: any[] = []
  let nextToken: string | undefined = undefined

  do {
    const res = await client.callAPI({
      operation: "getInventorySummaries",
      endpoint: "fbaInventory",
      query: {
        details: false,
        granularityType: "Marketplace",
        granularityId: usMarketplaceId,
        marketplaceIds: usMarketplaceId,
        nextToken: nextToken,
      },
    })

    if (res && res.inventorySummaries) {
      allInventory.push(...res.inventorySummaries)
    }

    nextToken = res?.pagination?.nextToken
  } while (nextToken)

  return allInventory
}

/**
 * Lookup detailed product information (Title, Images, Product Types) 
 * given a list of ASINs via the Catalog Items v2022-04-01 API
 */
export async function getCatalogItemsByAsins(asins: string[]) {
  if (asins.length === 0) return []
  const client = getClient()
  const usMarketplaceId = "ATVPDKIKX0DER"

  // SP-API Catalog Items `searchCatalogItems` allows max 20 ASINs per request
  const batches: string[][] = []
  for (let i = 0; i < asins.length; i += 20) {
    batches.push(asins.slice(i, i + 20))
  }

  const results: any[] = []

  for (const batch of batches) {
    const res = await client.callAPI({
      operation: "searchCatalogItems",
      endpoint: "catalogItems",
      query: {
        identifiers: batch.join(","),
        identifiersType: "ASIN",
        marketplaceIds: usMarketplaceId,
        includedData: ["images", "summaries", "productTypes"],
      },
    })
    
    if (res && res.items) {
      results.push(...res.items)
    }
  }

  return results
}

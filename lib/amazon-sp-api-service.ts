/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any */
const SellingPartnerAPI = require("amazon-sp-api")

/**
 * Initializes the Amazon Selling Partner API (SP-API) client.
 * SP-API requires these keys to be generated from a private Seller Central App.
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
 * Request real-time FBA inventory summaries.
 * Note: Only applies to Fulfilled by Amazon (FBA) items.
 */
export async function getFbaInventory(): Promise<any[]> {
  const client: any = getClient()

  // Make sure this is standard format (assuming US marketplace)
  const usMarketplaceId = "ATVPDKIKX0DER"

  const allInventory: any[] = []
  let nextToken: string | undefined = undefined

  do {
    const res: any = await client.callAPI({
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
 * Lookup detailed product information (Title, Images) 
 * given a list of ASINs via the Catalog Items API.
 * Uses individual getCatalogItem calls per ASIN for maximum compatibility.
 */
export async function getCatalogItemsByAsins(asins: string[]): Promise<any[]> {
  if (asins.length === 0) return []
  const client: any = getClient()
  const usMarketplaceId = "ATVPDKIKX0DER"

  const results: any[] = []

  for (const asin of asins) {
    try {
      const res: any = await client.callAPI({
        operation: "getCatalogItem",
        endpoint: "catalogItems",
        path: { asin },
        query: {
          marketplaceIds: usMarketplaceId,
          includedData: "images,summaries",
        },
      })

      if (res) {
        results.push(res)
      }
    } catch (e: any) {
      // Skip individual failures — don't block the rest
      console.warn(`Catalog lookup failed for ASIN ${asin}:`, e?.message)
    }
  }

  return results
}

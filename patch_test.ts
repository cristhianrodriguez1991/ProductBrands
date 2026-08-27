

import { getClient } from "./lib/amazon-sp-api-service"

async function main() {
  try {
    const client: any = await getClient()
    const sellerId = process.env.AMAZON_SPAPI_SELLER_ID
    const sku = "WB-B3V2-ZNMA"

    console.log("Fetching listing attributes...")
    const res = await client.callAPI({
      operation: "getListingsItem",
      endpoint: "listingsItems",
      path: { sellerId, sku },
      query: { 
        marketplaceIds: ["ATVPDKIKX0DER"],
        includedData: "attributes"
      }
    })

    console.log("Attributes found:", JSON.stringify(res.attributes, null, 2))
  } catch (err: any) {
    console.error("Error:", err?.response?.data || err?.message || err)
  }
}

main()

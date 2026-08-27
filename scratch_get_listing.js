const { getClient } = require('./lib/amazon-sp-api-service');

async function main() {
  try {
    const client = await getClient();
    const sellerId = process.env.AMAZON_SPAPI_SELLER_ID;
    const sku = "WB-B3V2-ZNMA";
    
    console.log("Fetching listing for SKU:", sku);

    const res = await client.callAPI({
      operation: "getListingsItem",
      endpoint: "listingsItems",
      path: { sellerId, sku },
      query: { 
        marketplaceIds: ["ATVPDKIKX0DER"],
        includedData: "attributes,issues,offers,summaries"
      }
    });

    console.log("Result:");
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("Error:", err?.response?.data || err?.message || err);
  }
}

main();

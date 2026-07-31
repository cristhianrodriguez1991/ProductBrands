const { getClient } = require("../lib/amazon-sp-api-service");

async function test() {
  const client = getClient();
  const sellerId = process.env.AMAZON_SPAPI_SELLER_ID;
  const sku = "EC-N5SW-Z4PM";
  
  const res = await client.callAPI({
    operation: "getListingsItem",
    endpoint: "listingsItems",
    path: { sellerId, sku },
    query: {
      marketplaceIds: ["ATVPDKIKX0DER"],
      includedData: "attributes"
    }
  });
  console.log(JSON.stringify(res.attributes, null, 2));
}

test().catch(console.error);

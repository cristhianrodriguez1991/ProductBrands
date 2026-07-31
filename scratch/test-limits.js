const { getClient } = require("../lib/amazon-sp-api-service");
async function test() {
  const client = getClient();
  const sellerId = process.env.AMAZON_SPAPI_SELLER_ID;
  const sku = "EC-N5SW-Z4PM";
  
  try {
    const res = await client.callAPI({
      operation: "getListingsItem",
      endpoint: "listingsItems",
      path: { sellerId, sku },
      query: {
        marketplaceIds: ["ATVPDKIKX0DER"],
        includedData: "attributes" // Try attributes or purchasableOffer? Wait, comma separated? 'attributes' is allowed.
      }
    });
    console.log("Success:", JSON.stringify(res, null, 2).slice(0, 500));
  } catch (e) {
    console.log("Error:", e.response ? e.response.data : e.message);
  }
}
test();

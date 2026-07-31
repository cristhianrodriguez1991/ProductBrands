import { getClient } from "../lib/amazon-sp-api-service";

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
        includedData: "attributes"
      }
    });
    console.log(JSON.stringify(res.attributes?.purchasable_offer, null, 2));
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}
test();

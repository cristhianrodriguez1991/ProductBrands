import { getClient } from "../lib/amazon-sp-api-service";

async function run() {
  const client = getClient();
  const usMarketplaceId = "ATVPDKIKX0DER";
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const interval = `${thirtyDaysAgo.toISOString()}--${now.toISOString()}`;
  
  console.log("Calling getOrderMetrics...");
  const res = await client.callAPI({
    operation: "getOrderMetrics",
    endpoint: "sales",
    query: {
      marketplaceIds: [usMarketplaceId],
      interval,
      granularity: "Total",
      sku: "MILK-CHOC-WAFER-1LB" // I don't know the exact SKU, but it should return an empty array if invalid
    }
  });
  console.log(JSON.stringify(res, null, 2));
}
run().catch(console.error);

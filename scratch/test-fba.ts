import { getFbaQuantities } from "../lib/amazon-sp-api-service";

async function run() {
  const fbaQty = await getFbaQuantities();
  const entries = Array.from(fbaQty.entries()).slice(0, 5);
  console.log("Sample FBA Quantities:");
  for (const [sku, val] of entries) {
    console.log("SKU:", sku, "ASIN:", val.asin);
  }
}
run().catch(console.error);

import { getFbaQuantities, getRealTimeInventoryBySkus } from "../lib/amazon-sp-api-service";

async function run() {
  console.log("Fetching FBA Quantities...");
  const fbaQtyMap = await getFbaQuantities();
  const targetAsin = "B0G5XPGD53".toUpperCase();
  const skus: string[] = [];

  for (const [sku, val] of fbaQtyMap.entries()) {
    if (val.asin?.toUpperCase() === targetAsin) {
      console.log(`Found FBA SKU for ASIN: ${sku}`, val);
      skus.push(sku);
    }
  }

  if (skus.length === 0) {
    console.log(`No SKUs found for ASIN ${targetAsin} in FBA Report.`);
  } else {
    console.log(`Fetching real-time inventory for SKUs:`, skus);
    const realTime = await getRealTimeInventoryBySkus(skus);
    for (const sku of skus) {
      console.log(`Real-Time Inventory for ${sku}:`, realTime.get(sku) || 0);
    }
  }
}
run();

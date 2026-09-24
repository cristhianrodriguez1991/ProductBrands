import { prisma } from "../lib/prisma";
import { getFbaQuantities } from "../lib/amazon-sp-api-service";

async function run() {
  const asin = "B0G5XPGD53";
  console.log("FBA Qty map...");
  const fbaQty = await getFbaQuantities();
  let realSku = null;
  for (const [key, val] of fbaQty.entries()) {
    if (val.asin === asin) {
      realSku = key;
      console.log("Found real SKU:", realSku, "Inventory:", val.fulfillable + val.reserved);
      break;
    }
  }

  if (realSku) {
    const sales = await prisma.amazonDailySales.findMany({ where: { sku: realSku }});
    console.log("Sales for real SKU count:", sales.length);
    let sales30 = 0;
    const now = new Date();
    sales.forEach(s => {
      const diff = Math.ceil((now.getTime() - new Date(s.date).getTime()) / (1000 * 3600 * 24));
      if (diff <= 30) sales30 += s.unitsOrdered;
    });
    console.log("Sales in last 30 days:", sales30);
  }
}
run().catch(console.error);

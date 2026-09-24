import { keepaProvider } from "../lib/keepa/provider";

async function run() {
  const asin = "B0G5XPGD53";
  console.log("Keepa check...");
  const keepa = await keepaProvider.getProductHistory({ asin, domainId: 1, history: false });
  console.log(JSON.stringify(keepa, null, 2));
}
run().catch(console.error);

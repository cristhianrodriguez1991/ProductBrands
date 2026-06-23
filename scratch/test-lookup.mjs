import fetch from "node-fetch";
const code = "850086867017";
console.log("Tier 2: UPCItemDB");
try {
  const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`);
  console.log("UPCItemDB:", r.status, await r.text());
} catch(e) { console.error(e.message) }

console.log("Tier 4: Go-UPC");
try {
  const r = await fetch(`https://go-upc.com/api/v1/code/${code}`, { headers: { "User-Agent": "WarehouseInventory/1.0" }});
  console.log("Go-UPC:", r.status, await r.text());
} catch(e) { console.error(e.message) }

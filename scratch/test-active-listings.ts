import { getClient, downloadReport } from "../lib/amazon-sp-api-service";

function parseTSV(tsv: string): any[] {
  const lines = tsv.split("\n").filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const headers = lines[0].split("\t").map((h) => h.trim().toLowerCase())
  const items: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t")
    const row: any = {}
    headers.forEach((h, idx) => {
      row[h] = cols[idx]?.trim() || ""
    })
    items.push(row)
  }

  return items
}

async function run() {
  const client: any = getClient();
  const usMarketplaceId = "ATVPDKIKX0DER";

  console.log("Requesting GET_MERCHANT_LISTINGS_ALL_DATA...");
  const createRes: any = await client.callAPI({
    operation: "createReport",
    endpoint: "reports",
    body: {
      reportType: "GET_MERCHANT_LISTINGS_ALL_DATA",
      marketplaceIds: [usMarketplaceId],
    },
  });

  const reportId = createRes?.reportId;
  let reportStatus = "IN_QUEUE";
  let docId = null;

  while (reportStatus !== "DONE") {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes: any = await client.callAPI({
      operation: "getReport",
      endpoint: "reports",
      path: { reportId },
    });
    reportStatus = statusRes?.processingStatus;
    if (reportStatus === "DONE") docId = statusRes?.reportDocumentId;
  }

  if (docId) {
    const docRes: any = await client.callAPI({
      operation: "getReportDocument",
      endpoint: "reports",
      path: { reportDocumentId: docId },
    });
    const tsvContent = await downloadReport(docRes.url);
    const items = parseTSV(tsvContent);

    const match = items.find(i => (i["asin1"] || "").toUpperCase() === "B0G5XPGD53" || (i["asin"] || "").toUpperCase() === "B0G5XPGD53");
    if (match) {
      console.log("Found in ALL LISTINGS!");
      console.log(match);
    } else {
      console.log("Not found in ALL LISTINGS");
    }
  }
}

run().catch(console.error);

const { getClient, downloadReport } = require('./lib/amazon-sp-api-service.ts');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function main() {
  const client = getClient();
  const docRes = await client.callAPI({
    operation: "getReportDocument",
    endpoint: "reports",
    path: { reportDocumentId: "amzn1.spdoc.1.4.na.e2ebc8de-45e2-465a-a56e-1912849030cd.T3VKCDRBT5DOPC.44900" },
  });
  console.log(docRes.url);
  const jsonContent = await downloadReport(docRes.url);
  const data = JSON.parse(jsonContent);
  fs.writeFileSync('scratch/report-sample.json', JSON.stringify(data, null, 2));
  console.log("Keys:", Object.keys(data));
  if (data.salesAndTrafficByAsin) {
    console.log("salesAndTrafficByAsin[0]:", data.salesAndTrafficByAsin[0]);
  }
  if (data.salesAndTrafficByDate) {
    console.log("salesAndTrafficByDate[0]:", data.salesAndTrafficByDate[0]);
  }
}
main().catch(console.error);

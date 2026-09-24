import { getClient } from "../lib/amazon-sp-api-service"

async function test() {
  const client: any = getClient()
  const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  
  try {
    const res: any = await client.callAPI({
      operation: "listFinancialEventGroups",
      endpoint: "finances",
      query: {
        FinancialEventGroupStartedAfter: pastDate.toISOString(),
        MaxResultsPerPage: 100
      }
    })
    console.log(JSON.stringify(res, null, 2))
  } catch (e: any) {
    console.log("Error:", e.message)
  }
}

test()

import { NextResponse } from "next/server"
import { getClient } from "@/lib/amazon-sp-api-service"

export async function GET() {
  try {
    const client: any = getClient()
    const sellerId = process.env.AMAZON_SPAPI_SELLER_ID

    const sku = "WB-B3V2-ZNMA"

    const res = await client.callAPI({
      operation: "getListingsItem",
      endpoint: "listingsItems",
      path: { sellerId, sku },
      query: { 
        marketplaceIds: ["ATVPDKIKX0DER"],
        includedData: "attributes,issues,offers,summaries"
      }
    })

    return NextResponse.json({ success: true, res })
  } catch (err: any) {
    const details = err?.response?.data || err?.response || err?.message || String(err)
    return NextResponse.json({ error: details }, { status: 500 })
  }
}

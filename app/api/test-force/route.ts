import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getClient } from "@/lib/amazon-sp-api-service"

export async function GET() {
  try {
    const products = await prisma.monitoredProduct.findMany({
      where: {
        productName: {
          contains: "Peanut",
          mode: "insensitive"
        }
      }
    })

    const client: any = await getClient()
    const sellerId = process.env.AMAZON_SPAPI_SELLER_ID

    const results = []
    for (const p of products) {
      if (!p.sku) continue
      try {
        const existingListing: any = await client.callAPI({
          operation: "getListingsItem",
          endpoint: "listingsItems",
          path: { sellerId, sku: p.sku },
          query: {
            marketplaceIds: ["ATVPDKIKX0DER"],
            includedData: "attributes",
          },
        })
        results.push({ db: p, amazon: existingListing?.attributes?.purchasable_offer })
      } catch (e: any) {
        results.push({ db: p, error: String(e) })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

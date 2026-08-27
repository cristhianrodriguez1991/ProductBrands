import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { submitScheduledSaleUpdate } from "@/lib/amazon-sp-api-service"

export async function GET(request: Request) {
  try {
    const activeProducts = await prisma.monitoredProduct.findMany({
      where: { priceCycleStatus: "ACTIVE" }
    })

    const results = []

    for (const product of activeProducts) {
      if (!product.sku) continue

      const basePriceForCalc = Number(product.priceCycleBasePrice || product.currentPrice)
      let salePriceToPush: number | null = null

      if (product.priceCyclePhase === "DISCOUNT") {
        const pct = Number(product.priceCycleDiscountPct || 10)
        salePriceToPush = Number((basePriceForCalc * (1 - pct / 100)).toFixed(2))
      }

      const now = new Date()
      const end = new Date()
      end.setFullYear(now.getFullYear() + 5)

      const res = await submitScheduledSaleUpdate(
        product.sku,
        basePriceForCalc,
        salePriceToPush,
        now,
        end,
        product.marketplace || "US"
      )

      results.push({ sku: product.sku, success: res.success, error: res.error })
    }

    return NextResponse.json({
      message: "Sync complete",
      totalProcessed: activeProducts.length,
      results
    })
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

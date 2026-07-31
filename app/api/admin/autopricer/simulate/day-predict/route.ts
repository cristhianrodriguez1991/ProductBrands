import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { predictDayStrategyWithGLM } from "@/lib/ai/pricing-analyzer"
import { getDailySalesHistory } from "@/lib/amazon-sp-api-service"

export const maxDuration = 120
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { productId, dayName, strategy } = await req.json()
    if (!productId || !dayName || !strategy) {
      return NextResponse.json({ error: "Missing required fields: productId, dayName, strategy" }, { status: 400 })
    }

    const product = await prisma.monitoredProduct.findUnique({
      where: { id: productId },
    })
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Get last 30 days of Keepa History
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentKeepaHistory = await prisma.keepaProductHistory.findMany({
      where: {
        monitoredProductId: productId,
        timestamp: { gte: thirtyDaysAgo },
      },
      select: { salesRank: true },
    })

    // Get last 30 days of Amazon SP-API Sales History
    const spApiSales = product.sku ? await getDailySalesHistory(product.sku, 30) : []
    const dbSales = await prisma.amazonDailySales.findMany({
      where: {
        monitoredProductId: productId,
        date: { gte: thirtyDaysAgo },
      },
    })
    
    // Merge sales data
    const dailySalesMap = new Map<string, any>()
    for (const d of dbSales) {
      dailySalesMap.set(d.date.toISOString().split("T")[0], d)
    }
    for (const d of spApiSales) {
      dailySalesMap.set(d.date, d)
    }
    const mergedSales = Array.from(dailySalesMap.values())

    const prediction = await predictDayStrategyWithGLM(
      product,
      dayName,
      strategy,
      mergedSales,
      recentKeepaHistory
    )

    return NextResponse.json({ success: true, prediction })
  } catch (error: any) {
    console.error("[DAY_PREDICT_ERROR]", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to predict day strategy" }, { status: 500 })
  }
}

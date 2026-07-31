import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"

export const dynamic = "force-dynamic"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = params
    const product = await prisma.monitoredProduct.findUnique({
      where: { id },
      select: {
        id: true,
        productName: true,
        sku: true,
        isAutopilot: true,
        autopilotStartedAt: true,
        autopilotStartRank: true,
        autopilotStartPrice: true,
        currentPrice: true,
      },
    })

    if (!product) {
      return new NextResponse("Product not found", { status: 404 })
    }

    // If autopilot is on, get data since it started. Otherwise just get last 30 days.
    const cutoffDate = product.isAutopilot && product.autopilotStartedAt
      ? product.autopilotStartedAt
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Fetch AI activity logs
    const activityLogs = await prisma.priceChangeLog.findMany({
      where: {
        monitoredProductId: id,
        requestedAt: { gte: cutoffDate },
      },
      orderBy: { requestedAt: "desc" },
    })

    // Fetch Keepa History for rank and price charting
    const rawKeepa = await prisma.keepaProductHistory.findMany({
      where: {
        monitoredProductId: id,
        timestamp: { gte: cutoffDate },
      },
      orderBy: { timestamp: "asc" },
      select: {
        timestamp: true,
        salesRank: true,
        amazonPrice: true,
        buyBoxPrice: true,
      },
    })

    // Subsample Keepa history to max 1 per day for clean charting
    const chartData: any[] = []
    const seenDays = new Set<string>()

    // Always push the start point if we have one
    if (product.isAutopilot && product.autopilotStartedAt) {
      chartData.push({
        date: product.autopilotStartedAt.toISOString().split("T")[0],
        rank: product.autopilotStartRank || 0,
        price: product.autopilotStartPrice || product.currentPrice,
        isStartMarker: true
      })
      seenDays.add(product.autopilotStartedAt.toISOString().split("T")[0])
    }

    for (const k of rawKeepa) {
      if (!k.salesRank || k.salesRank <= 0) continue
      const dateStr = k.timestamp.toISOString().split("T")[0]
      if (!seenDays.has(dateStr)) {
        seenDays.add(dateStr)
        chartData.push({
          date: dateStr,
          rank: k.salesRank,
          price: k.buyBoxPrice && k.buyBoxPrice > 0 ? k.buyBoxPrice : (k.amazonPrice && k.amazonPrice > 0 ? k.amazonPrice : product.currentPrice),
          isStartMarker: false
        })
      }
    }

    // Current snapshot
    const currentRank = chartData.length > 0 ? chartData[chartData.length - 1].rank : (product.autopilotStartRank || 0)

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        currentRank,
      },
      chartData,
      activityLogs,
    })
  } catch (error) {
    console.error("[AUTOPILOT_INSIGHTS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

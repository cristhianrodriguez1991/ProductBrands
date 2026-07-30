import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { keepaProvider, generateMockKeepaHistory } from "@/lib/keepa/provider"
import { analyzeWeekdayBehavior } from "@/lib/keepa/analytics/weekday-engine"
import { calculateRankTrend } from "@/lib/keepa/analytics/rank-trend"

export const dynamic = "force-dynamic"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id } = await params
    const product = await prisma.monitoredProduct.findUnique({
      where: { id },
      include: {
        keepaEvaluations: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        priceHistory: {
          orderBy: { requestedAt: 'desc' },
          take: 50
        }
      }
    })

    if (!product) {
      return NextResponse.json({ success: false, error: "Monitored product not found" }, { status: 404 })
    }

    let historyRecords = await prisma.keepaProductHistory.findMany({
      where: { monitoredProductId: id },
      orderBy: { timestamp: "asc" },
    })

    // If no records in DB yet, fetch or generate realistic fallback observations
    if (historyRecords.length === 0) {
      if (product.asin) {
        const res = await keepaProvider.getProductHistory({ asin: product.asin, days: 90 })
        if (res.success && res.observations.length > 0) {
          for (const obs of res.observations) {
            try {
              await prisma.keepaProductHistory.create({
                data: {
                  monitoredProductId: product.id,
                  asin: product.asin,
                  timestamp: obs.timestamp,
                  keepaTimestamp: obs.keepaTimestamp,
                  salesRank: obs.salesRank,
                  buyBoxPrice: obs.buyBoxPrice,
                  amazonPrice: obs.amazonPrice,
                  newPrice: obs.newPrice,
                  newFbaPrice: obs.newFbaPrice,
                  newFbmPrice: obs.newFbmPrice,
                  offerCount: obs.offerCount,
                  isAvailable: obs.isAvailable ?? true,
                },
              })
            } catch {
              // ignore duplicates
            }
          }
          historyRecords = await prisma.keepaProductHistory.findMany({
            where: { monitoredProductId: id },
            orderBy: { timestamp: "asc" },
          })
        }
      }
    }

    // Convert DB records to KeepaObservation format
    const observations = historyRecords.map((r) => ({
      timestamp: r.timestamp,
      keepaTimestamp: r.keepaTimestamp,
      salesRank: r.salesRank,
      buyBoxPrice: r.buyBoxPrice,
      amazonPrice: r.amazonPrice,
      newPrice: r.newPrice,
      newFbaPrice: r.newFbaPrice,
      newFbmPrice: r.newFbmPrice,
      offerCount: r.offerCount,
      isAvailable: r.isAvailable,
      isExcluded: r.isExcluded,
      exclusionReason: r.exclusionReason,
    }))

    // Use mock fallback if still empty
    const finalObs = observations.length > 0 ? observations : generateMockKeepaHistory(product.asin || "B08TEST123", 90)

    const weekdayData = analyzeWeekdayBehavior(finalObs)
    const trendAnalysis = calculateRankTrend(
      finalObs,
      product.targetRankMin,
      product.targetRankMax,
      product.warningRank
    )

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        asin: product.asin,
        sku: product.sku,
        productName: product.productName,
        currentPrice: product.currentPrice,
        unitCost: product.unitCost,
        targetRankMin: product.targetRankMin,
        targetRankMax: product.targetRankMax,
        warningRank: product.warningRank,
        criticalRank: product.criticalRank,
        keepaLastSyncedAt: product.keepaLastSyncedAt,
        keepaSyncStatus: product.keepaSyncStatus,
      },
      observations: finalObs,
      weekdayProfiles: weekdayData.profiles,
      weekdayHeatmap: weekdayData.heatmap,
      overallMedianRank: weekdayData.overallMedianRank,
      trendAnalysis,
      evaluations: product.keepaEvaluations || [],
      priceHistory: product.priceHistory || [],
    })
  } catch (error: any) {
    console.error("[KEEPA_HISTORY_GET]", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to fetch product history" }, { status: 500 })
  }
}

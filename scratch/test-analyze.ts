import { PrismaClient } from "@prisma/client"
import { analyzePricingWithGLM } from "../lib/ai/pricing-analyzer"
import { getDailySalesAndTrafficBySku } from "../lib/amazon-sp-api-service"
import { analyzeWeekdayBehavior } from "../lib/keepa/analytics/weekday-engine"

const prisma = new PrismaClient()

async function main() {
  const products = await prisma.monitoredProduct.findMany({
    where: { status: "ACTIVE" },
    include: {
      priceHistory: {
        orderBy: { requestedAt: 'desc' },
        take: 1
      },
    },
  })

  console.log(`Found ${products.length} products.`)

  for (const prod of products) {
    console.log(`\n--- Analyzing ${prod.sku} ---`)
    const lastChange = prod.priceHistory[0]
    let recentChangeContext = undefined
    if (lastChange && lastChange.status === "APPLIED" && lastChange.approvedAt) {
      const daysSince = (Date.now() - new Date(lastChange.approvedAt).getTime()) / (1000 * 60 * 60 * 24)
      console.log(`Last applied change was ${daysSince.toFixed(2)} days ago.`)
      if (daysSince <= 7) {
        const evalJob = await prisma.keepaEvaluationJob.findFirst({
          where: { priceChangeLogId: lastChange.id }
        })
        recentChangeContext = {
          hasRecentChange: true,
          daysSinceChange: daysSince,
          oldPrice: lastChange.oldPrice,
          newPrice: lastChange.newPrice,
          rankBefore: evalJob?.rankBefore,
          rankNow: evalJob?.rank3d || evalJob?.rank24h || evalJob?.rank12h || evalJob?.rank6h,
          evaluationStatus: evalJob?.status || "Unknown"
        }
      }
    } else {
      console.log(`No recent applied changes found.`)
    }

    const pendingApproval = await prisma.priceChangeLog.findFirst({
      where: { monitoredProductId: prod.id, status: "PENDING_APPROVAL" }
    })
    if (pendingApproval) {
      console.log(`Skipping because pending approval exists: ${pendingApproval.id}`)
      continue
    }

    const history = await prisma.keepaProductHistory.findMany({
      where: { monitoredProductId: prod.id },
      orderBy: { timestamp: "asc" },
      take: 1000,
    })
    const observations = history.map((h) => ({
      timestamp: h.timestamp,
      keepaTimestamp: 0,
      salesRank: h.salesRank,
      buyBoxPrice: h.buyBoxPrice,
      amazonPrice: h.amazonPrice,
      offerCount: h.offerCount,
      isAvailable: h.isAvailable,
    }))
    const weekdayAnalysis = analyzeWeekdayBehavior(observations)

    const dailySales = await getDailySalesAndTrafficBySku(prod.sku, 30, prod.currentPrice)
    const salesDiagnostic = { sku: prod.sku, totalRecordsForSku: dailySales.length, totalRecordsForAsin: dailySales.length, latestSaleDate: null as any }

    const assessment = await analyzePricingWithGLM(
      prod as any,
      dailySales,
      weekdayAnalysis.profiles,
      undefined,
      salesDiagnostic,
      recentChangeContext
    )
    console.log(`AI Result: ${assessment.recommendedAction} at $${assessment.proposedPrice}`)
    console.log(`Reason: ${assessment.strategicSummary}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { submitPriceUpdateFeed } from "@/lib/amazon-sp-api-service"
import { analyzePricingWithGLM } from "@/lib/ai/pricing-analyzer"
import { getDailySalesAndTrafficBySku } from "@/lib/amazon-sp-api-service"
import { analyzeWeekdayBehavior } from "@/lib/keepa/analytics/weekday-engine"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function getNextDateForDayName(dayName: string): Date {
  const targetDay = DAY_NAMES.findIndex(d => d.toLowerCase() === dayName.toLowerCase())
  const today = new Date()
  if (targetDay === -1) return today // fallback to today if invalid
  
  const currentDay = today.getDay()
  let daysUntil = targetDay - currentDay
  if (daysUntil <= 0) daysUntil += 7 // If today or past, get *next* occurrence

  const nextDate = new Date(today)
  nextDate.setDate(today.getDate() + daysUntil)
  nextDate.setHours(0, 0, 0, 0)
  return nextDate
}

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes max duration on Vercel Pro

export async function GET(req: Request) {
  try {
    // 1. Verify Cron Secret to prevent unauthorized access
    const authHeader = req.headers.get("authorization")
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // 2. Fetch all active monitored products
    const products = await prisma.monitoredProduct.findMany({
      where: { status: "ACTIVE" },
      include: {
        priceHistory: {
          orderBy: { requestedAt: 'desc' },
          take: 1
        },
      },
    })

    let analyzedCount = 0
    let recommendationsGenerated = 0

    for (const prod of products) {
      analyzedCount++

      // Get historical price changes to enforce Hold & Test logic
      let recentChangeContext = undefined
      const lastChange = prod.priceHistory[0]
      if (lastChange && lastChange.status === "APPLIED" && lastChange.approvedAt) {
        const daysSince = (Date.now() - new Date(lastChange.approvedAt).getTime()) / (1000 * 60 * 60 * 24)
        if (daysSince <= 7) {
          // Find evaluation job to check rank
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
      }

      // Check if there's already a pending approval to avoid duplicates
      const pendingApproval = await prisma.priceChangeLog.findFirst({
        where: { monitoredProductId: prod.id, status: "PENDING_APPROVAL" }
      })
      if (pendingApproval) {
        continue // Skip if already waiting for user approval
      }

      // 3. Get Keepa history
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

      // 4. Fetch daily sales
      const dailySales = await getDailySalesAndTrafficBySku(prod.sku, 30, prod.currentPrice)

      const [totalForSku, totalForAsin, latestSale] = await Promise.all([
        prisma.amazonDailySales.count({
          where: { sku: { equals: prod.sku, mode: "insensitive" } },
        }),
        prod.asin
          ? prisma.amazonDailySales.count({
              where: { asin: { equals: prod.asin, mode: "insensitive" } },
            })
          : Promise.resolve(0),
        prisma.amazonDailySales.findFirst({
          where: { sku: { equals: prod.sku, mode: "insensitive" } },
          orderBy: { date: "desc" },
          select: { date: true },
        }),
      ])
      const salesDiagnostic = {
        sku: prod.sku,
        asin: prod.asin,
        totalRecordsForSku: totalForSku,
        totalRecordsForAsin: totalForAsin,
        latestSaleDate: latestSale?.date ?? null,
      }

      // 5. Run AI Engine
      const assessment = await analyzePricingWithGLM(
        prod as any,
        dailySales,
        weekdayAnalysis.profiles,
        undefined,
        salesDiagnostic,
        recentChangeContext
      )

      // 6. Update Product Status
      await prisma.monitoredProduct.update({
        where: { id: prod.id },
        data: {
          recommendedAction: assessment.recommendedAction,
          recommendedPrice: assessment.proposedPrice,
          recommendationReason: assessment.strategicSummary,
          confidenceScore: assessment.confidenceScore,
          lastAnalyzedAt: new Date(),
        },
      })

      // 7. Create Pending Approval Log if AI recommends a change
      if ((assessment.recommendedAction === "RAISE" || assessment.recommendedAction === "LOWER") && 
          assessment.proposedPrice && 
          Math.abs(assessment.proposedPrice - prod.currentPrice) > 0.01) {
        
        let scheduledForDate = null
        if (assessment.scheduledDay) {
          scheduledForDate = getNextDateForDayName(assessment.scheduledDay)
        }

        await prisma.priceChangeLog.create({
          data: {
            monitoredProductId: prod.id,
            oldPrice: prod.currentPrice,
            newPrice: assessment.proposedPrice,
            recommendedAction: assessment.recommendedAction,
            reason: assessment.strategicSummary + "\n\nKey Takeaways:\n" + assessment.keyTakeaways.map(t => "- " + t).join("\n"),
            status: "PENDING_APPROVAL",
            scheduledFor: scheduledForDate,
          },
        })
        recommendationsGenerated++
      }
    }

    // 8. Execute Scheduled Approvals
    let executedScheduledCount = 0
    const now = new Date()
    const scheduledLogs = await prisma.priceChangeLog.findMany({
      where: {
        status: "APPROVED_SCHEDULED",
        scheduledFor: { lte: now }
      },
      include: { monitoredProduct: true }
    })

    if (scheduledLogs.length > 0) {
      // Group by marketplace
      const byMarketplace: Record<string, typeof scheduledLogs> = {}
      for (const log of scheduledLogs) {
        const mp = log.monitoredProduct.marketplace
        if (!byMarketplace[mp]) byMarketplace[mp] = []
        byMarketplace[mp].push(log)
      }

      for (const [marketplaceCode, logs] of Object.entries(byMarketplace)) {
        const feedItems = logs.map(l => ({ sku: l.monitoredProduct.sku, price: l.newPrice }))
        try {
          const submitted = await submitPriceUpdateFeed(feedItems, marketplaceCode)
          const feedId = submitted.feedSubmissionId
          
          for (const log of logs) {
            await prisma.priceChangeLog.update({
              where: { id: log.id },
              data: {
                status: "SUBMITTED_TO_AMAZON",
                notes: JSON.stringify({
                  feedSubmissionId: feedId,
                  submittedPrice: log.newPrice,
                  submittedAt: new Date().toISOString(),
                  wasScheduled: true
                })
              }
            })
          }
          executedScheduledCount += logs.length
        } catch (err: any) {
          console.error(`[CRON] Failed to submit scheduled price feed for ${marketplaceCode}:`, err)
        }
      }
    }

    return NextResponse.json({
      success: true,
      analyzedCount,
      recommendationsGenerated,
      executedScheduledCount,
      message: `Daily analysis complete. Analyzed ${analyzedCount} products, generated ${recommendationsGenerated} new price change recommendations, executed ${executedScheduledCount} scheduled price changes.`,
    })

  } catch (error) {
    console.error("[CRON_DAILY_ANALYSIS]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getDailySalesAndTrafficBySku, submitPriceUpdateFeed, submitScheduledSaleUpdate } from "@/lib/amazon-sp-api-service"
import { keepaProvider } from "@/lib/keepa/provider"
import { analyzeWeekdayBehavior } from "@/lib/keepa/analytics/weekday-engine"
import { analyzePricingWithGLM } from "@/lib/ai/pricing-analyzer"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // allow up to 5 minutes for cron

export async function POST(req: Request) {
  // Can be secured via Vercel cron secret in production
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // If running in development without CRON_SECRET, we allow it for testing,
    // otherwise reject.
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Unauthorized", { status: 401 })
    }
  }

  console.log("[AUTOPILOT_CRON] Starting 4:00 AM Mega-Sync...")
  let processed = 0
  let pushed = 0
  let errors = 0

  try {
    const products = await prisma.monitoredProduct.findMany({
      where: { 
        OR: [
          { status: "ACTIVE" },
          { status: "PRICE_CYCLE_ONLY" }
        ]
      },
    })

    if (products.length === 0) {
      return NextResponse.json({ success: true, message: "No products to process." })
    }

    for (const product of products) {
      try {
        console.log(`[AUTOPILOT_CRON] Processing product: ${product.productName} (SKU: ${product.sku})`)

        // -------------------------------------------------------------
        // 0. Automatic Price Cycle (Recurring Flash Sales) Check
        // -------------------------------------------------------------
        if (product.priceCycleEnabled && product.priceCycleStatus === "Active") {
          const now = new Date()
          const nextChange = product.priceCycleNextChangeAt ? new Date(product.priceCycleNextChangeAt) : new Date(0)
          
          if (now >= nextChange) {
            console.log(`[PRICE_CYCLE] Triggering phase change for SKU ${product.sku}.`)
            
            let nextPhase = product.priceCycleCurrentPhase === "REGULAR" ? "DISCOUNT" : "REGULAR"
            if (!product.priceCycleCurrentPhase) nextPhase = "REGULAR" // Initial state

            let salePriceToPush: number | null = null
            let startDate = new Date()
            let endDate = new Date()

            if (nextPhase === "DISCOUNT") {
              const pct = product.priceCycleDiscountPct || 10
              salePriceToPush = Number((Number(product.priceCycleBasePrice || product.currentPrice) * (1 - pct / 100)).toFixed(2))
              endDate.setDate(endDate.getDate() + (product.priceCycleDiscountDays || 7))
              console.log(`[PRICE_CYCLE] Shifting to DISCOUNT: $${salePriceToPush} for ${product.priceCycleDiscountDays} days`)
            } else {
              endDate.setDate(endDate.getDate() + (product.priceCycleRegularDays || 14))
              console.log(`[PRICE_CYCLE] Shifting to REGULAR: $${product.priceCycleBasePrice} for ${product.priceCycleRegularDays} days`)
            }

            const res = await submitScheduledSaleUpdate(
              product.sku,
              Number(product.priceCycleBasePrice || product.currentPrice),
              salePriceToPush,
              startDate,
              endDate,
              product.marketplace
            )

            if (res.success) {
               await prisma.monitoredProduct.update({
                 where: { id: product.id },
                 data: {
                   priceCycleCurrentPhase: nextPhase,
                   priceCycleNextChangeAt: endDate
                 }
               })
               // Create audit log
               await prisma.priceChangeLog.create({
                 data: {
                   monitoredProductId: product.id,
                   oldPrice: product.currentPrice,
                   newPrice: nextPhase === "DISCOUNT" ? (salePriceToPush || 0) : Number(product.priceCycleBasePrice || product.currentPrice),
                   recommendedAction: "MANUAL",
                   reason: `PRICE CYCLE SHIFT: Moving to ${nextPhase} phase`,
                   status: "APPLIED",
                   approvedAt: new Date(),
                   approvedByUserId: "SYSTEM_CRON"
                 }
               })
            } else {
              console.error(`[PRICE_CYCLE] Failed to push update for ${product.sku}:`, res.error)
              await prisma.monitoredProduct.update({
                 where: { id: product.id },
                 data: { priceCycleStatus: "Failed" }
              })
            }
          } else {
            console.log(`[PRICE_CYCLE] Active cycle, but next change is not until ${nextChange.toISOString()}`)
          }
          
          // Bypass AI logic since product is governed by a price cycle
          processed++
          continue
        }

        // 0.5 Skip AI for PRICE_CYCLE_ONLY products even if their cycle is paused
        if (product.status === "PRICE_CYCLE_ONLY") {
          console.log(`[AUTOPILOT_CRON] Skipping AI evaluation for PRICE_CYCLE_ONLY product: ${product.sku}`)
          processed++
          continue
        }

        // 1. Sync Keepa
        let observations: any[] = []
        const resp = await keepaProvider.getProductHistory({
          asin: product.asin,
          domainId: 1,
          days: 30,
        })
        if (resp.success && resp.observations) {
          observations = resp.observations
          
          // Optionally save Keepa history to DB so the UI has it fresh
          const lastObs = observations[observations.length - 1]
          if (lastObs) {
            await prisma.keepaProductHistory.create({
              data: {
                monitoredProductId: product.id,
                asin: product.asin,
                timestamp: lastObs.timestamp,
                keepaTimestamp: lastObs.keepaTimestamp || 0,
                salesRank: lastObs.salesRank || -1,
                buyBoxPrice: lastObs.buyBoxPrice,
                amazonPrice: lastObs.amazonPrice,
                offerCount: lastObs.offerCount,
                isAvailable: lastObs.isAvailable,
              }
            })
          }
        }

        // 2. Weekday Behavior
        const weekdayAnalysis = analyzeWeekdayBehavior(observations)

        // 3. Sync Sales (SP-API)
        const dailySales = await getDailySalesAndTrafficBySku(product.sku, 30, product.currentPrice)

        // 3.5 Prepare Recent Change Context
        const lastChange = await prisma.priceChangeLog.findFirst({
          where: { monitoredProductId: product.id, status: "APPLIED" },
          orderBy: { requestedAt: "desc" },
        })

        const recentLogs = await prisma.priceChangeLog.findMany({
          where: { monitoredProductId: product.id, status: "APPLIED" },
          orderBy: { requestedAt: "desc" },
          take: 5
        })

        let aiActivityLog = ""
        if (recentLogs.length > 0) {
          aiActivityLog = recentLogs.map(l => `[${l.requestedAt.toISOString().split('T')[0]}] Action: ${l.recommendedAction} (Price: ${l.oldPrice} -> ${l.newPrice}). Reason: ${l.reason}`).join("\n")
        }

        let recentChangeContext: any = undefined
        if (lastChange) {
          const daysSinceChange = (Date.now() - lastChange.requestedAt.getTime()) / (1000 * 60 * 60 * 24)
          const rankBeforeRecord = await prisma.keepaProductHistory.findFirst({
            where: { monitoredProductId: product.id, timestamp: { lte: lastChange.requestedAt } },
            orderBy: { timestamp: "desc" }
          })
          
          recentChangeContext = {
            hasRecentChange: true,
            daysSinceChange,
            oldPrice: lastChange.oldPrice,
            newPrice: lastChange.newPrice,
            rankBefore: rankBeforeRecord?.salesRank,
            rankNow: observations.length > 0 ? observations[observations.length - 1].salesRank : undefined,
            evaluationStatus: "ACTIVE",
            aiActivityLog
          }
        } else if (aiActivityLog) {
          recentChangeContext = { hasRecentChange: false, daysSinceChange: 999, oldPrice: 0, newPrice: 0, aiActivityLog }
        }

        // 4. Run AI Strategist
        const assessment = await analyzePricingWithGLM(
          product,
          dailySales,
          weekdayAnalysis.profiles,
          undefined,
          { sku: product.sku, totalRecordsForSku: dailySales.length, totalRecordsForAsin: dailySales.length },
          recentChangeContext
        )

        // 5. Apply price change if needed
        const requestedPrice = assessment.proposedPrice || product.currentPrice
        
        // Only push to Amazon if the price actually changed
        if (requestedPrice !== product.currentPrice && assessment.recommendedAction !== "MAINTAIN") {
          if (product.isAutopilot) {
            console.log(`[AUTOPILOT_CRON] Pushing new price $${requestedPrice} to Amazon for SKU ${product.sku}`)
            
            // Push to Amazon
            let pushSuccess = true
            let amazonMsg = "Submitted via Autopilot Cron"
            try {
               const feedRes = await submitPriceUpdateFeed([
                 { sku: product.sku, price: requestedPrice }
               ])
               if (!feedRes || !feedRes.feedSubmissionId) {
                 throw new Error("No feedSubmissionId returned")
               }
            } catch (e: any) {
               pushSuccess = false
               amazonMsg = e.message || "Failed to submit feed"
               console.error("[AUTOPILOT_CRON] Amazon Push failed:", e)
            }

            // Record Log & Update Product
            await prisma.priceChangeLog.create({
              data: {
                monitoredProductId: product.id,
                oldPrice: product.currentPrice,
                newPrice: requestedPrice,
                recommendedAction: assessment.recommendedAction,
                reason: `AUTOPILOT: ${assessment.strategicSummary} | Rationale: ${assessment.testRationale}`,
                status: pushSuccess ? "APPLIED" : "ERROR",
                notes: amazonMsg,
                approvedAt: new Date(),
                approvedByUserId: "AUTOPILOT_ENGINE",
              }
            })

            await prisma.monitoredProduct.update({
              where: { id: product.id },
              data: {
                currentPrice: pushSuccess ? requestedPrice : product.currentPrice,
                recommendedAction: "MAINTAIN", // reset action since we just acted
                recommendedPrice: requestedPrice,
                recommendationReason: `AUTOPILOT executed ${assessment.recommendedAction} to $${requestedPrice}. Reason: ${assessment.strategicSummary}`,
                confidenceScore: assessment.confidenceScore,
                lastAnalyzedAt: new Date(),
              }
            })
            
            pushed++
          } else {
            // Not on autopilot: Generate manual approval request
            const pendingApproval = await prisma.priceChangeLog.findFirst({
              where: { monitoredProductId: product.id, status: "PENDING_APPROVAL" }
            })
            
            if (!pendingApproval) {
              await prisma.priceChangeLog.create({
                data: {
                  monitoredProductId: product.id,
                  oldPrice: product.currentPrice,
                  newPrice: requestedPrice,
                  recommendedAction: assessment.recommendedAction,
                  reason: assessment.strategicSummary + "\n\nKey Takeaways:\n" + assessment.keyTakeaways.map((t: string) => "- " + t).join("\n"),
                  status: "PENDING_APPROVAL",
                }
              })
            }
            
            await prisma.monitoredProduct.update({
              where: { id: product.id },
              data: {
                recommendedAction: assessment.recommendedAction,
                recommendedPrice: requestedPrice,
                recommendationReason: assessment.strategicSummary,
                confidenceScore: assessment.confidenceScore,
                lastAnalyzedAt: new Date(),
              }
            })
          }
        } else {
          // Just update the analysis
          await prisma.monitoredProduct.update({
            where: { id: product.id },
            data: {
              recommendedAction: "MAINTAIN",
              recommendedPrice: product.currentPrice,
              recommendationReason: `AUTOPILOT assessed no change needed. Reason: ${assessment.strategicSummary}`,
              confidenceScore: assessment.confidenceScore,
              lastAnalyzedAt: new Date(),
            }
          })
        }

        processed++
      } catch (err: any) {
        console.error(`[AUTOPILOT_CRON] Failed product ${product.sku}:`, err)
        errors++
      }
    }

    return NextResponse.json({ success: true, processed, pushed, errors })
  } catch (error: any) {
    console.error("[AUTOPILOT_CRON_FATAL]", error)
    return NextResponse.json({ success: false, error: error?.message || "Internal error" }, { status: 500 })
  }
}

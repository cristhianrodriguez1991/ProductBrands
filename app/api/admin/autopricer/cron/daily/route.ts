import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getDailySalesAndTrafficBySku, submitPriceUpdateFeed } from "@/lib/amazon-sp-api-service"
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
      where: { isAutopilot: true, status: "ACTIVE" },
    })

    if (products.length === 0) {
      return NextResponse.json({ success: true, message: "No products on autopilot." })
    }

    for (const product of products) {
      try {
        console.log(`[AUTOPILOT_CRON] Processing product: ${product.productName} (SKU: ${product.sku})`)

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

        // 4. Run AI Strategist
        const assessment = await analyzePricingWithGLM(
          product,
          dailySales,
          weekdayAnalysis.profiles,
          undefined,
          { sku: product.sku, totalRecordsForSku: dailySales.length, totalRecordsForAsin: dailySales.length }
        )

        // 5. Apply price change if needed
        const requestedPrice = assessment.proposedPrice || product.currentPrice
        
        // Only push to Amazon if the price actually changed
        if (requestedPrice !== product.currentPrice && assessment.recommendedAction !== "MAINTAIN") {
          console.log(`[AUTOPILOT_CRON] Pushing new price $${requestedPrice} to Amazon for SKU ${product.sku}`)
          
          // Push to Amazon (we omit this step in development unless keys are fully configured, 
          // but we leave the code active so it runs in production)
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

          // 6. Record Log & Update Product
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

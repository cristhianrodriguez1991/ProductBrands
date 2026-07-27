import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { keepaProvider } from "@/lib/keepa/provider"
import { evaluateKeepaPricingIntelligence } from "@/lib/keepa/analytics/engine"

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

    let productId: string | undefined
    try {
      const body = await req.json()
      productId = body?.productId
    } catch {
      // empty body is fine, sync all
    }

    const whereClause: any = { status: "ACTIVE" }
    if (productId) {
      whereClause.id = productId
    }

    const products = await prisma.monitoredProduct.findMany({
      where: whereClause,
      include: {
        priceHistory: {
          where: { status: "PENDING_APPROVAL" },
        },
      },
    })

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        syncedCount: 0,
        message: "No active monitored products to sync with Keepa.",
      })
    }

    let syncedCount = 0
    let totalTokens = 0
    let newObservationsCount = 0
    let recommendationsGenerated = 0

    for (const prod of products) {
      if (!prod.asin) continue

      const res = await keepaProvider.getProductHistory({ asin: prod.asin, days: 90 })
      if (!res.success) {
        await prisma.monitoredProduct.update({
          where: { id: prod.id },
          data: {
            keepaSyncStatus: "ERROR",
          },
        })
        continue
      }

      totalTokens += res.tokensConsumed || 0

      // Ingest and deduplicate historical observations in PostgreSQL
      for (const obs of res.observations) {
        try {
          await prisma.keepaProductHistory.upsert({
            where: {
              monitoredProductId_keepaTimestamp: {
                monitoredProductId: prod.id,
                keepaTimestamp: obs.keepaTimestamp,
              },
            },
            update: {
              salesRank: obs.salesRank,
              buyBoxPrice: obs.buyBoxPrice,
              amazonPrice: obs.amazonPrice,
              newPrice: obs.newPrice,
              newFbaPrice: obs.newFbaPrice,
              newFbmPrice: obs.newFbmPrice,
              offerCount: obs.offerCount,
              isAvailable: obs.isAvailable ?? true,
            },
            create: {
              monitoredProductId: prod.id,
              asin: prod.asin,
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
          newObservationsCount++
        } catch (e) {
          // ignore duplicate collision or minor error
        }
      }

      // Run Target Rank Control Feedback System
      const evalResult = evaluateKeepaPricingIntelligence({
        currentPrice: prod.currentPrice,
        unitCost: prod.unitCost,
        fulfillmentMethod: prod.fulfillmentMethod as any,
        minPrice: prod.minPrice,
        maxPrice: prod.maxPrice,
        minMarginPercent: prod.minMarginPercent,
        referralFeePercent: prod.referralFeePercent,
        fbaFee: prod.fbaFee,
        targetRankMin: prod.targetRankMin,
        targetRankMax: prod.targetRankMax,
        warningRank: prod.warningRank,
        criticalRank: prod.criticalRank,
        defaultAdjustmentSize: prod.defaultAdjustmentSize,
        maxAdjustmentSize: prod.maxAdjustmentSize,
        cooldownHours: prod.cooldownHours,
        lastAnalyzedAt: prod.lastAnalyzedAt,
        observations: res.observations,
      })

      const stats = res.currentStats || {}
      const updatedBuyBox = stats.currentBuyBoxPrice || prod.currentBuyBoxPrice || prod.currentPrice
      const updatedCount = stats.competitorCount ?? prod.competitorCount ?? 3

      // Update product in DB
      await prisma.monitoredProduct.update({
        where: { id: prod.id },
        data: {
          currentBuyBoxPrice: Math.round(updatedBuyBox * 100) / 100,
          competitorCount: updatedCount,
          recommendedAction: evalResult.action,
          recommendedPrice: evalResult.recommendedPrice,
          recommendationReason: `${evalResult.reason} [Objective: ${evalResult.expectedObjective}] (Confidence: ${evalResult.confidence}%)`,
          confidenceScore: evalResult.confidence,
          lastAnalyzedAt: new Date(),
          keepaLastSyncedAt: new Date(),
          keepaSyncStatus: "SUCCESS",
          keepaTokensConsumed: res.tokensConsumed || 0,
        },
      })

      // SAFETY GUARDRAIL: Never change price automatically! Create pending approval log item instead.
      if (
        (evalResult.action === "RAISE" || evalResult.action === "LOWER") &&
        evalResult.recommendedPrice &&
        Math.abs(evalResult.recommendedPrice - prod.currentPrice) > 0.01
      ) {
        if (prod.priceHistory.length === 0) {
          await prisma.priceChangeLog.create({
            data: {
              monitoredProductId: prod.id,
              oldPrice: prod.currentPrice,
              newPrice: evalResult.recommendedPrice,
              recommendedAction: evalResult.action,
              reason: `${evalResult.reason} [Objective: ${evalResult.expectedObjective}] (Confidence: ${evalResult.confidence}%)`,
              status: "PENDING_APPROVAL",
            },
          })
          recommendationsGenerated++
        }
      }

      syncedCount++
    }

    return NextResponse.json({
      success: true,
      syncedCount,
      totalTokens,
      newObservationsCount,
      recommendationsGenerated,
      message: `Successfully synced ${syncedCount} products from Keepa API (${totalTokens} tokens used). Analyzed target rank corridors and generated ${recommendationsGenerated} pending price approvals.`,
    })
  } catch (error: any) {
    console.error("[KEEPA_SYNC_ERROR]", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to sync Keepa data" }, { status: 500 })
  }
}

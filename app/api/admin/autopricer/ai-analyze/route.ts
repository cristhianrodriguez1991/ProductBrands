import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { keepaProvider } from "@/lib/keepa/provider"
import { analyzeWeekdayBehavior } from "@/lib/keepa/analytics/weekday-engine"
import { getDailySalesAndTrafficBySku } from "@/lib/amazon-sp-api-service"
import { analyzePricingWithGLM } from "@/lib/ai/pricing-analyzer"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { id, asin, sku } = body

    if (!id && !asin && !sku) {
      return NextResponse.json({ success: false, error: "Missing product identifier (id, asin, or sku)" }, { status: 400 })
    }

    const product = await prisma.monitoredProduct.findFirst({
      where: id ? { id } : asin ? { asin } : { sku },
    })

    if (!product) {
      return NextResponse.json({ success: false, error: "Monitored product not found in portfolio" }, { status: 404 })
    }

    // 1. Get Keepa historical time-series observations
    let history = await prisma.keepaProductHistory.findMany({
      where: { monitoredProductId: product.id },
      orderBy: { timestamp: "asc" },
      take: 1000,
    })

    // If local DB is empty, fetch or mock via provider
    let observations: any[] = []
    if (history.length > 0) {
      observations = history.map((h) => ({
        timestamp: h.timestamp,
        keepaTimestamp: 0,
        salesRank: h.salesRank,
        buyBoxPrice: h.buyBoxPrice,
        amazonPrice: h.amazonPrice,
        offerCount: h.offerCount,
        isAvailable: h.isAvailable,
      }))
    } else {
      const resp = await keepaProvider.getProductHistory({
        asin: product.asin,
        domainId: 1, // US
        days: 90,
      })
      if (resp.success && resp.observations) {
        observations = resp.observations
      }
    }

    // 2. Perform lag-aware weekday seasonality analysis
    const weekdayAnalysis = analyzeWeekdayBehavior(observations)

    // 3. Fetch Amazon SP-API Daily Unit Sales & Revenue (30 days)
    const dailySales = await getDailySalesAndTrafficBySku(product.sku, 30, product.currentPrice)

    // 3b. Diagnose how much sales data actually exists in the DB for this product,
    // so the analyzer can tell "no data synced (mismatch?)" apart from "real zeros".
    const [totalForSku, totalForAsin, latestSale] = await Promise.all([
      prisma.amazonDailySales.count({
        where: { sku: { equals: product.sku, mode: "insensitive" } },
      }),
      product.asin
        ? prisma.amazonDailySales.count({
            where: { asin: { equals: product.asin, mode: "insensitive" } },
          })
        : Promise.resolve(0),
      prisma.amazonDailySales.findFirst({
        where: { sku: { equals: product.sku, mode: "insensitive" } },
        orderBy: { date: "desc" },
        select: { date: true, unitsOrdered: true },
      }),
    ])
    const salesDiagnostic = {
      sku: product.sku,
      asin: product.asin,
      totalRecordsForSku: totalForSku,
      totalRecordsForAsin: totalForAsin,
      latestSaleDate: latestSale?.date ?? null,
    }

    // 4. Run the rank-first AI engine (skips the LLM call when there is no data)
    const assessment = await analyzePricingWithGLM(
      product,
      dailySales,
      weekdayAnalysis.profiles,
      undefined,
      salesDiagnostic
    )

    return NextResponse.json({
      success: true,
      assessment,
      dailySales,
      salesDiagnostic,
      weekdayProfiles: weekdayAnalysis.profiles,
      heatmap: weekdayAnalysis.heatmap,
    })
  } catch (error: any) {
    console.error("[AI_ANALYZE_POST]", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to execute AI analysis" }, { status: 500 })
  }
}

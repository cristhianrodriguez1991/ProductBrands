import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { PRICE_INTELLIGENCE_CONFIG } from "@/config/price-intelligence.config"

// Helper to calculate unit economics and margin %
function calculateUnitEconomics(price: number, cost: number, referralFeePct: number, fbaFee: number) {
  const referralFee = (price * referralFeePct) / 100
  const grossProfit = price - cost - referralFee - fbaFee
  const netMarginPct = price > 0 ? (grossProfit / price) * 100 : 0
  return { referralFee, grossProfit, netMarginPct }
}

// GET all monitored products with filtering and KPIs
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const marketplace = searchParams.get("marketplace")
    const status = searchParams.get("status")
    const action = searchParams.get("action")
    const search = searchParams.get("search")?.trim()

    const where: any = {}
    if (marketplace && marketplace !== "ALL") where.marketplace = marketplace
    if (status && status !== "ALL") where.status = status
    if (action && action !== "ALL") where.recommendedAction = action
    if (search) {
      where.OR = [
        { asin: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { productName: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ]
    }

    const products = await prisma.monitoredProduct.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        priceHistory: {
          where: { status: "PENDING_APPROVAL" },
          orderBy: { requestedAt: "desc" },
          take: 1,
        },
      },
    })

    // Calculate aggregated KPIs
    const totalMonitored = products.length
    const totalActive = products.filter((p) => p.status === "ACTIVE").length

    let pendingApprovalsCount = 0
    let totalMonthlyUplift = 0
    let totalMarginSum = 0
    let activeCountForMargin = 0

    const enrichedProducts = products.map((p) => {
      const { referralFee, grossProfit, netMarginPct } = calculateUnitEconomics(
        p.currentPrice,
        p.unitCost,
        p.referralFeePercent,
        p.fbaFee
      )

      if (p.status === "ACTIVE") {
        totalMarginSum += netMarginPct
        activeCountForMargin++

        if (p.priceHistory && p.priceHistory.length > 0) {
          pendingApprovalsCount++
        }

        if (p.recommendedAction === "RAISE" && p.recommendedPrice && p.recommendedPrice > p.currentPrice) {
          const priceDiff = p.recommendedPrice - p.currentPrice
          const dailyVol = p.velocityDaily || 5 // default 5 units/day if not estimated
          totalMonthlyUplift += priceDiff * dailyVol * 30
        }
      }

      return {
        ...p,
        calculated: {
          referralFee,
          grossProfit,
          netMarginPct,
          hasPendingApproval: (p.priceHistory?.length ?? 0) > 0,
          pendingChange: p.priceHistory?.[0] || null,
        },
      }
    })

    const averageMarginPercent = activeCountForMargin > 0 ? totalMarginSum / activeCountForMargin : 0

    return NextResponse.json({
      products: enrichedProducts,
      kpis: {
        totalMonitored,
        totalActive,
        pendingApprovalsCount,
        potentialMonthlyProfitUplift: Math.round(totalMonthlyUplift * 100) / 100,
        averageMarginPercent: Math.round(averageMarginPercent * 10) / 10,
      },
    })
  } catch (error) {
    console.error("[AUTOPRICER_GET_PRODUCTS]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// POST create a new monitored product
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const {
      asin,
      sku,
      marketplace = "US",
      productName,
      imageUrl,
      category,
      currentPrice,
      unitCost,
      fulfillmentMethod = "FBA",
      minPrice,
      maxPrice,
      minMarginPercent = PRICE_INTELLIGENCE_CONFIG.DEFAULTS.MIN_DESIRED_MARGIN_PERCENT,
      referralFeePercent = PRICE_INTELLIGENCE_CONFIG.DEFAULTS.REFERRAL_FEE_PERCENT,
      fbaFee,
    } = body

    if (!asin || !sku || !productName || currentPrice === undefined || unitCost === undefined) {
      return new NextResponse("Missing required fields (asin, sku, productName, currentPrice, unitCost)", { status: 400 })
    }

    const effectiveFbaFee = fulfillmentMethod === "FBA" 
      ? (fbaFee !== undefined ? Number(fbaFee) : PRICE_INTELLIGENCE_CONFIG.DEFAULTS.ESTIMATED_FBA_FEE_USD)
      : 0.0

    // Check if product with same ASIN and SKU already exists in this marketplace
    const existing = await prisma.monitoredProduct.findFirst({
      where: { asin: asin.trim(), sku: sku.trim(), marketplace },
    })

    if (existing) {
      return new NextResponse(`Product with ASIN ${asin} and SKU ${sku} already monitored in ${marketplace}`, { status: 409 })
    }

    // Perform initial unit economics evaluation
    const numPrice = Number(currentPrice)
    const numCost = Number(unitCost)
    const numMinPrice = Number(minPrice || numCost * 1.3)
    const numMaxPrice = Number(maxPrice || numCost * 4.0)
    const numMarginTarget = Number(minMarginPercent)

    const { netMarginPct } = calculateUnitEconomics(numPrice, numCost, Number(referralFeePercent), effectiveFbaFee)

    let recommendedAction = "MAINTAIN"
    let recommendationReason = "Unit economics look healthy upon initial registration."
    let recommendedPrice: number | null = numPrice

    if (numPrice < numMinPrice) {
      recommendedAction = "RAISE"
      recommendedPrice = numMinPrice
      recommendationReason = `Current price (${numPrice}) is below your floor price (${numMinPrice}). Recommended raising immediately.`
    } else if (netMarginPct < numMarginTarget) {
      // Calculate price needed to achieve margin target: Price = (Cost + FBA) / (1 - (MarginPct + ReferralPct)/100)
      const feeRate = (numMarginTarget + Number(referralFeePercent)) / 100
      if (feeRate < 0.95) {
        const targetPrice = (numCost + effectiveFbaFee) / (1 - feeRate)
        const cappedPrice = Math.min(Math.round(targetPrice * 100) / 100, numMaxPrice)
        if (cappedPrice > numPrice) {
          recommendedAction = "RAISE"
          recommendedPrice = cappedPrice
          recommendationReason = `Current margin (${netMarginPct.toFixed(1)}%) is below your target (${numMarginTarget}%). Recommended raising to ${cappedPrice}.`
        }
      }
    }

    const created = await prisma.monitoredProduct.create({
      data: {
        asin: asin.trim(),
        sku: sku.trim(),
        marketplace,
        productName: productName.trim(),
        imageUrl: imageUrl || null,
        category: category || null,
        currentPrice: numPrice,
        unitCost: numCost,
        fulfillmentMethod,
        minPrice: numMinPrice,
        maxPrice: numMaxPrice,
        minMarginPercent: numMarginTarget,
        referralFeePercent: Number(referralFeePercent),
        fbaFee: effectiveFbaFee,
        status: "ACTIVE",
        recommendedAction,
        recommendedPrice,
        recommendationReason,
        confidenceScore: 85,
        lastAnalyzedAt: new Date(),
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("[AUTOPRICER_POST_PRODUCT]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

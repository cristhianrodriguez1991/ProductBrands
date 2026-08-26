import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { getListingDetailsBySkus, getFbaFeeEstimate } from "@/lib/amazon-sp-api-service"
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
    if (status && status !== "ALL") {
      where.status = status
    } else {
      where.status = { not: "PRICE_CYCLE_ONLY" }
    }
    if (action && action !== "ALL") where.recommendedAction = action
    if (search) {
      where.OR = [
        { asin: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { productName: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ]
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const products = await prisma.monitoredProduct.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        priceHistory: {
          where: { status: "PENDING_APPROVAL" },
          orderBy: { requestedAt: "desc" },
          take: 1,
        },
        keepaHistory: {
          orderBy: { timestamp: "desc" },
          take: 30,
        },
        amazonDailySales: {
          where: {
            date: { gte: sevenDaysAgo.toISOString().split("T")[0] },
          },
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

      let sevenDaySalesTotal = 0
      if (p.amazonDailySales && p.amazonDailySales.length > 0) {
        sevenDaySalesTotal = p.amazonDailySales.reduce((sum, day) => sum + (day.unitsOrdered || 0), 0)
      } else {
        sevenDaySalesTotal = Math.round((p.velocityDaily || 0) * 7)
      }

      const sparklineData = (p.keepaHistory || [])
        .filter(k => k.salesRank && k.salesRank > 0)
        .map(k => ({ timestamp: k.timestamp, rank: k.salesRank as number }))
        .reverse()
      
      const currentRank = sparklineData.length > 0 ? sparklineData[sparklineData.length - 1].rank : 0

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

      // Remove the large relations from the response to save bandwidth
      const { keepaHistory, amazonDailySales, ...productWithoutHeavyRelations } = p as any

      return {
        ...productWithoutHeavyRelations,
        calculated: {
          referralFee,
          grossProfit,
          netMarginPct,
          hasPendingApproval: (productWithoutHeavyRelations.priceHistory?.length ?? 0) > 0,
          pendingChange: productWithoutHeavyRelations.priceHistory?.[0] || null,
          sevenDaySalesTotal,
          currentRank,
          sparklineData,
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
    let numPrice = Number(currentPrice)
    const numCost = Number(unitCost)
    
    // Auto-fetch real live Amazon price and limits on import
    try {
      if (process.env.AMAZON_SPAPI_CLIENT_ID) {
        const detailsMap = await getListingDetailsBySkus([sku.trim()])
        const liveDetails = detailsMap.get(sku.trim())
        if (liveDetails?.currentPrice) {
          numPrice = liveDetails.currentPrice
        }
        if (liveDetails?.minPrice && !minPrice) {
          body.minPrice = liveDetails.minPrice
        }
        if (liveDetails?.maxPrice && !maxPrice) {
          body.maxPrice = liveDetails.maxPrice
        }
      }
    } catch (e) {
      console.warn(`[AUTOPRICER_IMPORT] Failed to fetch live price for ${sku}`, e)
    }

    const numMinPrice = Number(body.minPrice || numCost * 1.3)
    const numMaxPrice = Number(body.maxPrice || numCost * 4.0)
    const numMarginTarget = Number(minMarginPercent)

    let actualFbaFee = effectiveFbaFee
    try {
      if (process.env.AMAZON_SPAPI_CLIENT_ID && fulfillmentMethod === "FBA") {
         const feeEst = await getFbaFeeEstimate(sku.trim(), numPrice, true)
         if (feeEst?.fbaFee) actualFbaFee = feeEst.fbaFee
      }
    } catch (e) {
      // ignore
    }

    const { netMarginPct } = calculateUnitEconomics(numPrice, numCost, Number(referralFeePercent), actualFbaFee)

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
        const targetPrice = (numCost + actualFbaFee) / (1 - feeRate)
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
        fbaFee: actualFbaFee,
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

// Build the Prisma `where` filter shared by GET and the bulk endpoints
function buildWhereFilter(searchParams: URLSearchParams) {
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
  return where
}

// DELETE: erase all monitored products at once (optionally scoped to the
// current filters). Requires ?confirm=ERASE_ALL to prevent accidental triggers.
// Related records (priceHistory, amazonDailySales, etc.) are cascade-deleted
// per the Prisma schema's onDelete: Cascade.
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    if (searchParams.get("confirm") !== "ERASE_ALL") {
      return NextResponse.json(
        { success: false, error: "Confirmation required. Pass ?confirm=ERASE_ALL to erase." },
        { status: 400 }
      )
    }

    const scope = searchParams.get("scope") // "filtered" uses current filters; default "all"
    const where = scope === "filtered" ? buildWhereFilter(searchParams) : {}

    const result = await prisma.monitoredProduct.deleteMany({ where })

    return NextResponse.json({
      success: true,
      message: `Erased ${result.count} monitored product(s).`,
      deletedCount: result.count,
    })
  } catch (error) {
    console.error("[AUTOPRICER_DELETE_ALL]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// PATCH: bulk-set min/max price guardrails across many products at once so the
// autopricer never prices below the floor or above the ceiling. Body:
// { minPrice?, maxPrice?, scope: "all"|"filtered", marketplace?, status?, search? }
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const minPrice = body.minPrice !== undefined && body.minPrice !== null && body.minPrice !== "" ? Number(body.minPrice) : null
    const maxPrice = body.maxPrice !== undefined && body.maxPrice !== null && body.maxPrice !== "" ? Number(body.maxPrice) : null

    if (minPrice === null && maxPrice === null) {
      return NextResponse.json({ success: false, error: "Provide at least minPrice or maxPrice." }, { status: 400 })
    }
    if (minPrice !== null && isNaN(minPrice)) {
      return NextResponse.json({ success: false, error: "minPrice must be a number." }, { status: 400 })
    }
    if (maxPrice !== null && isNaN(maxPrice)) {
      return NextResponse.json({ success: false, error: "maxPrice must be a number." }, { status: 400 })
    }
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      return NextResponse.json({ success: false, error: "minPrice cannot be greater than maxPrice." }, { status: 400 })
    }

    // Build the same filter shape the UI uses for GET
    const sp = new URLSearchParams()
    if (body.marketplace && body.marketplace !== "ALL") sp.set("marketplace", body.marketplace)
    if (body.status && body.status !== "ALL") sp.set("status", body.status)
    if (body.action && body.action !== "ALL") sp.set("action", body.action)
    if (body.search) sp.set("search", body.search)
    const where = body.scope === "filtered" ? buildWhereFilter(sp) : {}

    const data: any = {}
    if (minPrice !== null) data.minPrice = minPrice
    if (maxPrice !== null) data.maxPrice = maxPrice

    const result = await prisma.monitoredProduct.updateMany({ where, data })

    return NextResponse.json({
      success: true,
      message: `Updated price guardrails on ${result.count} product(s).`,
      updatedCount: result.count,
    })
  } catch (error) {
    console.error("[AUTOPRICER_BULK_BOUNDS]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

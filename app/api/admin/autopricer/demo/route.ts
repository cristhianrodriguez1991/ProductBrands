import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const demoProducts = [
      {
        asin: "B08N5WRW91",
        sku: "PB-COF-ESP-16",
        marketplace: "US",
        productName: "Premium Private-Label Espresso Roast Beans (16oz Bag)",
        category: "Coffee",
        imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80",
        currentPrice: 19.99,
        unitCost: 6.50,
        fulfillmentMethod: "FBA",
        minPrice: 15.00,
        maxPrice: 26.00,
        minMarginPercent: 25.0,
        referralFeePercent: 15.0,
        fbaFee: 5.45,
        status: "ACTIVE",
        currentBuyBoxPrice: 19.99,
        buyBoxWinRate: 94.5,
        competitorCount: 3,
        velocityDaily: 18.5,
        recommendedAction: "MAINTAIN",
        recommendedPrice: 19.99,
        recommendationReason: "Price ($19.99) is optimally positioned. Net margin (25.2%) exceeds desired target with a commanding 94.5% Buy Box share.",
        confidenceScore: 96,
      },
      {
        asin: "B07XQ3K8M2",
        sku: "PB-SUG-WHT-1K",
        marketplace: "US",
        productName: "Organic White Sugar Sticks (1000 Count Hospitality Box)",
        category: "Sweeteners",
        imageUrl: "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=600&auto=format&fit=crop&q=80",
        currentPrice: 21.50,
        unitCost: 11.20,
        fulfillmentMethod: "FBA",
        minPrice: 20.00,
        maxPrice: 32.00,
        minMarginPercent: 28.0,
        referralFeePercent: 15.0,
        fbaFee: 6.20,
        status: "ACTIVE",
        currentBuyBoxPrice: 21.50,
        buyBoxWinRate: 82.0,
        competitorCount: 5,
        velocityDaily: 12.0,
        recommendedAction: "RAISE",
        recommendedPrice: 25.25,
        recommendationReason: "Current net margin (4.1% / $0.88 profit) is severely below your 28% target due to FBA shipping costs. Recommended raising to $25.25 to achieve healthy unit economics.",
        confidenceScore: 94,
        createPendingApproval: true,
      },
      {
        asin: "B09L4T2Z87",
        sku: "PB-CND-TIN-08",
        marketplace: "US",
        productName: "Artisan Fruit Hard Candy Gift Tin (8oz)",
        category: "Confectionery",
        imageUrl: "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=600&auto=format&fit=crop&q=80",
        currentPrice: 16.99,
        unitCost: 4.20,
        fulfillmentMethod: "FBA",
        minPrice: 12.00,
        maxPrice: 20.00,
        minMarginPercent: 30.0,
        referralFeePercent: 15.0,
        fbaFee: 4.50,
        status: "ACTIVE",
        currentBuyBoxPrice: 15.49,
        buyBoxWinRate: 34.0,
        competitorCount: 7,
        velocityDaily: 24.0,
        recommendedAction: "LOWER",
        recommendedPrice: 15.44,
        recommendationReason: "Buy Box share has dropped to 34% against aggressive competitor pricing ($15.49). Lowering price to $15.44 reclaims Buy Box while preserving a strong 34.6% profit margin.",
        confidenceScore: 91,
        createPendingApproval: true,
      },
      {
        asin: "B08C7M6P4L",
        sku: "PB-SWT-STV-500",
        marketplace: "US",
        productName: "Natural Stevia Sweetener Packets (500 Count)",
        category: "Sweeteners",
        imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
        currentPrice: 17.50,
        unitCost: 8.80,
        fulfillmentMethod: "FBA",
        minPrice: 18.50,
        maxPrice: 28.00,
        minMarginPercent: 25.0,
        referralFeePercent: 15.0,
        fbaFee: 5.10,
        status: "ACTIVE",
        currentBuyBoxPrice: 17.50,
        buyBoxWinRate: 88.0,
        competitorCount: 4,
        velocityDaily: 15.0,
        recommendedAction: "RAISE",
        recommendedPrice: 18.50,
        recommendationReason: "CRITICAL: Live price ($17.50) is violating your configured floor threshold ($18.50). Recommending immediate lift to floor price.",
        confidenceScore: 99,
        createPendingApproval: true,
      },
      {
        asin: "B09F3K8P2M",
        sku: "PB-COF-COL-12",
        marketplace: "CA",
        productName: "Colombian Single Origin Dark Roast Beans (340g Bag)",
        category: "Coffee",
        imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
        currentPrice: 23.99,
        unitCost: 7.80,
        fulfillmentMethod: "FBA",
        minPrice: 18.00,
        maxPrice: 32.00,
        minMarginPercent: 25.0,
        referralFeePercent: 15.0,
        fbaFee: 6.10,
        status: "ACTIVE",
        currentBuyBoxPrice: 23.99,
        buyBoxWinRate: 91.0,
        competitorCount: 2,
        velocityDaily: 10.5,
        recommendedAction: "MAINTAIN",
        recommendedPrice: 23.99,
        recommendationReason: "Strong Canadian market performance. Net margin is 27.1% ($6.49 profit/unit) with stable Buy Box leadership.",
        confidenceScore: 95,
      },
    ]

    let addedCount = 0

    for (const item of demoProducts) {
      const { createPendingApproval, ...data } = item

      // Check if exists
      let prod = await prisma.monitoredProduct.findFirst({
        where: { asin: data.asin, sku: data.sku, marketplace: data.marketplace },
      })

      if (!prod) {
        prod = await prisma.monitoredProduct.create({
          data: {
            ...data,
            lastAnalyzedAt: new Date(),
          },
        })
        addedCount++
      } else {
        // Update existing with fresh demo metrics
        prod = await prisma.monitoredProduct.update({
          where: { id: prod.id },
          data: {
            ...data,
            lastAnalyzedAt: new Date(),
          },
        })
      }

      if (createPendingApproval && (data.recommendedAction === "RAISE" || data.recommendedAction === "LOWER")) {
        // Check if pending log exists
        const existingLog = await prisma.priceChangeLog.findFirst({
          where: { monitoredProductId: prod.id, status: "PENDING_APPROVAL" },
        })

        if (!existingLog) {
          await prisma.priceChangeLog.create({
            data: {
              monitoredProductId: prod.id,
              oldPrice: data.currentPrice,
              newPrice: data.recommendedPrice || data.currentPrice,
              recommendedAction: data.recommendedAction,
              reason: data.recommendationReason,
              status: "PENDING_APPROVAL",
            },
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      addedCount,
      message: `Successfully loaded ${demoProducts.length} realistic demo products with simulated unit economics and safety approval queue items.`,
    })
  } catch (error) {
    console.error("[AUTOPRICER_DEMO]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

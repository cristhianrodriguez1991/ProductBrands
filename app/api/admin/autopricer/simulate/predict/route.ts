import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { getDailySalesAndTrafficBySku } from "@/lib/amazon-sp-api-service"
import { predictPriceImpactWithGLM } from "@/lib/ai/pricing-analyzer"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // Allow longer execution for AI analysis

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.AUTOPRICER)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { id, simulatedPrice } = body

    if (!id || !simulatedPrice || isNaN(Number(simulatedPrice))) {
      return NextResponse.json({ success: false, error: "Missing or invalid id/simulatedPrice." }, { status: 400 })
    }

    // 1. Fetch the product
    const product = await prisma.monitoredProduct.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 })
    }

    // 2. Fetch recent sales data
    const dailySales = await getDailySalesAndTrafficBySku(product.sku, 30, product.currentPrice)

    // 3. Fetch recent Keepa history
    const keepaHistory = await prisma.keepaProductHistory.findMany({
      where: { monitoredProductId: product.id },
      orderBy: { timestamp: "desc" },
      take: 30, // Approx 30 days if sampling daily
    })

    // 4. Run AI Prediction
    const prediction = await predictPriceImpactWithGLM(
      product,
      Number(simulatedPrice),
      dailySales,
      keepaHistory
    )

    return NextResponse.json({
      success: true,
      prediction
    })

  } catch (error: any) {
    console.error("[SIMULATE_PREDICT]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to generate prediction" },
      { status: 500 }
    )
  }
}

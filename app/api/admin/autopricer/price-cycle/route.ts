import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      productId, 
      priceCycleEnabled, 
      priceCycleDiscountPct, 
      priceCycleRegularDays, 
      priceCycleDiscountDays,
      priceCycleBasePrice
    } = body

    if (!productId) {
      return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 })
    }

    if (priceCycleEnabled) {
      if (!priceCycleDiscountPct || !priceCycleRegularDays || !priceCycleDiscountDays || !priceCycleBasePrice) {
        return NextResponse.json({ success: false, error: "All cycle parameters are required when enabled" }, { status: 400 })
      }
      
      // Calculate discounted price to ensure it doesn't go below minimums (mock validation for now)
      const discountedPrice = priceCycleBasePrice * (1 - priceCycleDiscountPct / 100)
      if (discountedPrice <= 0) {
        return NextResponse.json({ success: false, error: "Discounted price cannot be <= 0" }, { status: 400 })
      }
    }

    // Determine phase and next date if activating
    let phase = null
    let nextDate = null
    let status = "Draft"
    let startDate = null

    if (priceCycleEnabled) {
      status = "Active"
      phase = "REGULAR" // always start with regular phase
      startDate = new Date()
      nextDate = new Date()
      nextDate.setDate(nextDate.getDate() + priceCycleRegularDays)
    }

    const updatedProduct = await prisma.monitoredProduct.update({
      where: { id: productId },
      data: {
        priceCycleEnabled,
        priceCycleStatus: status,
        priceCycleDiscountPct: priceCycleDiscountPct || null,
        priceCycleRegularDays: priceCycleRegularDays || null,
        priceCycleDiscountDays: priceCycleDiscountDays || null,
        priceCycleBasePrice: priceCycleBasePrice || null,
        priceCycleStartDate: startDate,
        priceCycleCurrentPhase: phase,
        priceCycleNextChangeAt: nextDate,
      },
    })

    return NextResponse.json({
      success: true,
      product: updatedProduct
    })

  } catch (error: any) {
    console.error("[PRICE-CYCLE-POST] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

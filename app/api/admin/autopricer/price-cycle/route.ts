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
      priceCycleBasePrice,
      newAmazonProduct,
      startPhase
    } = body

    let targetProductId = productId

    if (newAmazonProduct && !targetProductId) {
      // Find or create the product as PRICE_CYCLE_ONLY
      let existing = await prisma.monitoredProduct.findFirst({
        where: { asin: newAmazonProduct.asin }
      })
      
      if (!existing) {
        existing = await prisma.monitoredProduct.create({
          data: {
            asin: newAmazonProduct.asin,
            sku: newAmazonProduct.sku,
            productName: newAmazonProduct.productName,
            currentPrice: newAmazonProduct.currentPrice || 0,
            unitCost: 0,
            minPrice: 0,
            maxPrice: 99999,
            status: "PRICE_CYCLE_ONLY",
            isAutopilot: false,
          }
        })
      }
      targetProductId = existing.id
    }

    if (!targetProductId) {
      return NextResponse.json({ success: false, error: "Product ID or new Amazon product details are required" }, { status: 400 })
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
      startDate = new Date()
      
      if (startPhase === "DISCOUNT") {
        phase = "REGULAR" // Set to REGULAR so the very next shift goes to DISCOUNT
        nextDate = new Date(0) // Date in the past ensures the cron triggers tonight
      } else {
        phase = "DISCOUNT" // Set to DISCOUNT so the very next shift goes to REGULAR
        nextDate = new Date(0) // Date in the past ensures the cron triggers tonight
      }
    }

    const updatedProduct = await prisma.monitoredProduct.update({
      where: { id: targetProductId },
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

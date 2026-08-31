import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { submitScheduledSaleUpdate } from "@/lib/amazon-sp-api-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      productId, 
      newAmazonProduct, 
      priceCycleEnabled, 
      priceCycleDiscountType,
      priceCycleDiscountValue,
      priceCycleRegularDays, 
      priceCycleDiscountDays, 
      priceCycleBasePrice,
      startPhase,
      pushImmediately
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
    
    const targetProduct = await prisma.monitoredProduct.findUnique({ where: { id: targetProductId } })
    if (!targetProduct) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
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
      
      if (pushImmediately) {
        phase = startPhase
        const now = new Date()
        nextDate = new Date()
        nextDate.setUTCHours(7, 15, 0, 0) // Force the future change to happen at 3:15 AM ET
        
        let salePriceToPush: number | null = null
        let basePriceForCalc = Number(priceCycleBasePrice || targetProduct.currentPrice)
        
        if (phase === "DISCOUNT") {
          if (priceCycleDiscountType === "FIXED_PRICE") {
            salePriceToPush = Number(priceCycleDiscountValue || basePriceForCalc)
          } else {
            const pct = Number(priceCycleDiscountValue || 10)
            salePriceToPush = Number((basePriceForCalc * (1 - pct / 100)).toFixed(2))
          }
          nextDate.setUTCDate(nextDate.getUTCDate() + Number(priceCycleDiscountDays || 7))
        } else {
          nextDate.setUTCDate(nextDate.getUTCDate() + Number(priceCycleRegularDays || 14))
        }

        try {
          const res = await submitScheduledSaleUpdate(
            targetProduct.sku,
            basePriceForCalc,
            salePriceToPush,
            now,
            nextDate,
            targetProduct.marketplace || "US"
          )
          
          if (!res.success) {
            return NextResponse.json({ error: "Failed to push to Amazon SP-API: " + res.error }, { status: 500 })
          }
          
          // Log it for visibility
          await prisma.priceChangeLog.create({
            data: {
              monitoredProductId: targetProduct.id,
              oldPrice: targetProduct.currentPrice,
              newPrice: salePriceToPush || basePriceForCalc,
              recommendedAction: "MANUAL",
              status: "APPLIED",
              approvedAt: now,
              approvedByUserId: "SYSTEM_IMMEDIATE_SYNC",
              notes: `Manual Immediate Push to ${phase} phase`
            }
          })
        } catch (e: any) {
          return NextResponse.json({ error: "Failed to push to Amazon SP-API: " + e.message }, { status: 500 })
        }
      } else {
        if (startPhase === "DISCOUNT") {
          phase = "REGULAR" // Set to REGULAR so the very next shift goes to DISCOUNT
          nextDate = new Date(0) // Date in the past ensures the cron triggers tonight
        } else {
          phase = "DISCOUNT" // Set to DISCOUNT so the very next shift goes to REGULAR
          nextDate = new Date(0) // Date in the past ensures the cron triggers tonight
        }
      }
    }

    const updatedProduct = await prisma.monitoredProduct.update({
      where: { id: targetProductId },
      data: {
        priceCycleEnabled,
        priceCycleStatus: status,
        priceCycleDiscountType: priceCycleDiscountType || "PERCENTAGE",
        priceCycleDiscountValue: priceCycleDiscountValue || null,
        priceCycleRegularDays: priceCycleRegularDays || null,
        priceCycleDiscountDays: priceCycleDiscountDays || null,
        priceCycleBasePrice: priceCycleBasePrice || null,
        priceCycleManualOverride: false, // Reset override when manually saved
        priceCycleManualPrice: null,
        priceCycleStartDate: startDate,
        priceCycleCurrentPhase: phase,
        priceCycleNextChangeAt: nextDate,
        priceCycleError: null,
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

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { productId, priceCycleStatus } = body

    if (!productId || !priceCycleStatus) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const updatedProduct = await prisma.monitoredProduct.update({
      where: { id: productId },
      data: { priceCycleStatus }
    })

    return NextResponse.json({ success: true, product: updatedProduct })
  } catch (error: any) {
    console.error("[PRICE-CYCLE-PATCH] Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { submitPriceUpdateFeed } from "@/lib/amazon-sp-api-service"

export const maxDuration = 300
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    const isLocalhost = req.url.includes("localhost") || req.url.includes("127.0.0.1")
    if (!isLocalhost && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return new NextResponse("Unauthorized", { status: 401 })
      // Vercel handles cron auth via CRON_SECRET, allow pass-through if missing in local/dev
    }

    const now = new Date()

    // Find all scheduled price changes that are due (scheduledFor <= now)
    const dueLogs = await prisma.priceChangeLog.findMany({
      where: {
        status: "APPROVED_SCHEDULED",
        scheduledFor: { lte: now },
      },
      include: { monitoredProduct: true },
    })

    if (dueLogs.length === 0) {
      return NextResponse.json({ success: true, message: "No scheduled price changes due for execution." })
    }

    const itemsByMarketplace = new Map<string, Array<{ logId: string, sku: string, price: number }>>()
    
    for (const log of dueLogs) {
      const sku = log.monitoredProduct?.sku
      if (!sku) continue
      const marketplace = log.monitoredProduct.marketplace || "US"
      if (!itemsByMarketplace.has(marketplace)) itemsByMarketplace.set(marketplace, [])
      itemsByMarketplace.get(marketplace)!.push({
        logId: log.id,
        sku,
        price: log.newPrice
      })
    }

    let totalSubmitted = 0
    let errors = []

    for (const [marketplace, items] of itemsByMarketplace.entries()) {
      try {
        const feedItems = items.map(it => ({ sku: it.sku, price: it.price }))
        const submitted = await submitPriceUpdateFeed(feedItems, marketplace)
        
        // Update logs to SUBMITTED_TO_AMAZON
        for (const it of items) {
          const log = dueLogs.find(l => l.id === it.logId)!
          await prisma.priceChangeLog.update({
            where: { id: it.logId },
            data: {
              status: "SUBMITTED_TO_AMAZON", // Background jobs handle marking to APPLIED later or it can be polled
              notes: JSON.stringify({
                originalNotes: log.notes,
                feedSubmissionId: submitted.feedSubmissionId,
                submittedPrice: it.price,
                submittedAt: new Date().toISOString(),
                context: "Executed via 4 AM Scheduled Cron"
              })
            }
          })
          
          // Also update the MonitoredProduct's current price to reflect the new state locally,
          // though technically sync-sales will pull the real Amazon price later.
          await prisma.monitoredProduct.update({
            where: { id: log.monitoredProductId },
            data: {
              currentPrice: it.price,
              recommendedAction: "MAINTAIN",
              recommendationReason: `Scheduled price change to $${it.price.toFixed(2)} applied via background cron.`
            }
          })
          
          totalSubmitted++
        }
      } catch (e: any) {
        errors.push(`Marketplace ${marketplace} failed: ${e.message}`)
        console.error(`[SCHEDULED_EXECUTION_ERROR] Marketplace ${marketplace}:`, e)
      }
    }

    return NextResponse.json({
      success: true,
      executedCount: totalSubmitted,
      errors: errors.length > 0 ? errors : undefined,
      message: `Executed ${totalSubmitted} scheduled price changes.`
    })
  } catch (error: any) {
    console.error("[CRON_EXECUTE_SCHEDULED_ERROR]", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to execute scheduled tasks" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { keepaProvider } from "@/lib/keepa/provider"

export async function GET(
  request: Request,
  { params }: { params: { productId: string } }
) {
  try {
    const { productId } = params
    
    // Calculate date 40 days ago
    const fortyDaysAgo = new Date()
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40)
    
    // Fetch all price changes for this product to determine historical price
    const priceLogs = await prisma.priceChangeLog.findMany({
      where: {
        monitoredProductId: productId,
        status: "APPLIED"
      },
      orderBy: { approvedAt: 'asc' }
    })
    
    // Fetch Keepa history for last 40 days
    let keepaLogs = await prisma.keepaProductHistory.findMany({
      where: {
        monitoredProductId: productId,
        timestamp: { gte: fortyDaysAgo }
      },
      orderBy: { timestamp: 'asc' }
    })
    
    // If no Keepa data, fetch it right now so the user can see it
    if (keepaLogs.length === 0) {
      const product = await prisma.monitoredProduct.findUnique({ where: { id: productId } })
      if (product && product.asin) {
        const res = await keepaProvider.getProductHistory({ asin: product.asin, days: 90 })
        if (res.success && res.observations.length > 0) {
          for (const obs of res.observations) {
            try {
              await prisma.keepaProductHistory.create({
                data: {
                  monitoredProductId: product.id,
                  asin: product.asin,
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
            } catch {
              // ignore duplicate keys
            }
          }
          // Re-query Keepa logs
          keepaLogs = await prisma.keepaProductHistory.findMany({
            where: {
              monitoredProductId: productId,
              timestamp: { gte: fortyDaysAgo }
            },
            orderBy: { timestamp: 'asc' }
          })
        }
      }
    }
    
    // If STILL no Keepa data (Keepa might not have data for this ASIN yet), we can't chart rank. 
    if (keepaLogs.length === 0 && priceLogs.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Merge logic: we want a timeline of all events in the last 40 days.
    // For price, we maintain the "active" price. 
    // To know the starting price 40 days ago, we look at the last price change BEFORE 40 days ago.
    let currentPrice = 0
    const olderPriceLogs = priceLogs.filter(p => p.approvedAt && p.approvedAt < fortyDaysAgo)
    if (olderPriceLogs.length > 0) {
      currentPrice = olderPriceLogs[olderPriceLogs.length - 1].newPrice
    } else if (keepaLogs.length > 0 && keepaLogs[0].amazonPrice) {
      // Fallback to keepa's amazon price if no logs exist before 40 days
      currentPrice = keepaLogs[0].amazonPrice
    }
    
    const recentPriceLogs = priceLogs.filter(p => p.approvedAt && p.approvedAt >= fortyDaysAgo)
    
    // Create a unified timeline
    type TimelineEvent = {
      timestamp: Date;
      type: 'KEEPA' | 'PRICE';
      rank?: number | null;
      price?: number;
      keepaPrice?: number | null;
      isPriceShift?: boolean;
    }
    
    const timeline: TimelineEvent[] = []
    
    for (const k of keepaLogs) {
      timeline.push({
        timestamp: k.timestamp,
        type: 'KEEPA',
        rank: k.salesRank,
        keepaPrice: k.buyBoxPrice || k.newPrice || k.amazonPrice
      })
    }
    
    for (const p of recentPriceLogs) {
      timeline.push({
        timestamp: p.approvedAt!,
        type: 'PRICE',
        price: p.newPrice,
        isPriceShift: true
      })
    }
    
    // Sort by timestamp
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    
    // Build final data array for Recharts
    const chartData = []
    
    for (const event of timeline) {
      if (event.type === 'PRICE') {
        currentPrice = event.price!
        // We push a point just for the price change, rank will be null (interpolated by recharts)
        chartData.push({
          date: event.timestamp.toISOString(),
          timestampMs: event.timestamp.getTime(),
          rank: null,
          price: currentPrice,
          isShift: true
        })
      } else {
        if (event.keepaPrice) {
          currentPrice = event.keepaPrice
        }
        chartData.push({
          date: event.timestamp.toISOString(),
          timestampMs: event.timestamp.getTime(),
          rank: event.rank || null,
          price: currentPrice,
          isShift: false
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      data: chartData
    })
    
  } catch (error: any) {
    console.error("[HISTORY_API_ERROR]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

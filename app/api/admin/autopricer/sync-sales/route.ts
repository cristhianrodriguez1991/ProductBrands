import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getClient } from "@/lib/amazon-sp-api-service"

export const maxDuration = 300 // allow up to 5 minutes

export async function GET(request: Request) {
  try {
    const client: any = getClient()
    const usMarketplaceId = "ATVPDKIKX0DER"
    
    // SP-API limitation: GET_SALES_AND_TRAFFIC_REPORT does not support grouping by both Date AND SKU.
    // To get daily sales by SKU, we must fetch orders from the last 30 days and aggregate them.
    const days = 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    console.log(`[SYNC-SALES] Fetching orders since ${startDate.toISOString()} for daily aggregation...`)

    const res: any = await client.callAPI({
      operation: "getOrders",
      endpoint: "orders",
      query: {
        MarketplaceIds: [usMarketplaceId],
        CreatedAfter: startDate.toISOString(),
        OrderStatuses: ["Unshipped", "PartiallyShipped", "Shipped"],
        MaxResultsPerPage: 100
      },
    })

    if (!res || !res.payload || !Array.isArray(res.payload.Orders)) {
      return NextResponse.json({ 
        success: false, 
        error: "No orders found or API error", 
        debugResponse: res 
      }, { status: 400 })
    }

    const orders = res.payload.Orders
    console.log(`[SYNC-SALES] Fetched ${orders.length} recent orders. Aggregating by SKU and Date...`)

    // Fetch Monitored Products to map
    const products = await prisma.monitoredProduct.findMany({ select: { id: true, sku: true, asin: true } })
    const skuMap = new Map<string, any>()
    for (const p of products) {
      skuMap.set(p.sku.toLowerCase(), p)
    }

    const dailyAggregations = new Map<string, { units: number, sales: number }>()

    for (const order of orders) {
      const dateStr = order.PurchaseDate ? order.PurchaseDate.split("T")[0] : ""
      if (!dateStr || !order.AmazonOrderId) continue

      try {
        const itemsRes: any = await client.callAPI({
          operation: "getOrderItems",
          endpoint: "orders",
          path: { orderId: order.AmazonOrderId },
        })
        const items = itemsRes?.payload?.OrderItems || []
        
        for (const item of items) {
          const itemSku = (item.SellerSKU || "").toLowerCase()
          const product = skuMap.get(itemSku)
          if (!product) continue // Only track monitored products
          
          const qty = parseInt(item.QuantityOrdered || "1", 10)
          const price = parseFloat(item.ItemPrice?.Amount || "0")
          
          const key = `${itemSku}_${dateStr}`
          const current = dailyAggregations.get(key) || { units: 0, sales: 0 }
          
          dailyAggregations.set(key, { 
            units: current.units + qty, 
            sales: current.sales + (price * qty) 
          })
        }
      } catch (err) {
        console.warn(`[SYNC-SALES] Could not fetch items for order ${order.AmazonOrderId}`)
      }
    }

    let savedCount = 0
    for (const [key, data] of dailyAggregations.entries()) {
      const [sku, dateStr] = key.split("_")
      const product = skuMap.get(sku)
      if (!product) continue

      await prisma.amazonDailySales.upsert({
        where: { sku_date: { sku: product.sku, date: dateStr } },
        update: {
          unitsOrdered: data.units,
          orderedProductSales: data.sales,
        },
        create: {
          monitoredProductId: product.id,
          sku: product.sku,
          asin: product.asin,
          date: dateStr,
          unitsOrdered: data.units,
          orderedProductSales: data.sales,
        }
      })
      savedCount++
    }

    return NextResponse.json({ success: true, message: `Successfully aggregated and synced ${savedCount} daily sales records for the last 30 days.` })

  } catch (error: any) {
    console.error("[SYNC-SALES] Error:", error?.message || error)
    return NextResponse.json({ success: false, error: error?.message || "Unknown error" }, { status: 500 })
  }
}

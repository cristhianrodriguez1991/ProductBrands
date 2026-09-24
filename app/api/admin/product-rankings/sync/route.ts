import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { 
  getCatalogItemsByAsins, 
  getFbaQuantities,
  getListingDetailsBySkus,
  getFbaFeeEstimate
} from "@/lib/amazon-sp-api-service"

export const maxDuration = 300 // allow up to 5 mins

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.PRODUCT_RANKINGS)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const rankings = await prisma.productRanking.findMany()
    if (rankings.length === 0) {
      return NextResponse.json({ success: true, message: "No rankings to sync" })
    }

    const asinsToFetch = Array.from(new Set(rankings.map(r => r.asin).filter(Boolean))) as string[]
    const skusToFetch = Array.from(new Set(rankings.map(r => r.sku).filter(Boolean))) as string[]

    let catalogMap = new Map<string, any>()
    let fbaQtyMap = new Map<string, any>()
    let listingsMap = new Map<string, any>()

    try {
      if (asinsToFetch.length > 0) {
        const catalogData = await getCatalogItemsByAsins(asinsToFetch)
        for (const cat of catalogData) {
          catalogMap.set(cat.asin, cat)
        }
      }
    } catch (e: any) {
      console.warn("Catalog lookup failed:", e?.message)
    }

    try {
      fbaQtyMap = await getFbaQuantities()
    } catch (e: any) {
      console.warn("FBA quantities lookup failed:", e?.message)
    }
    
    // Resolve actual SKUs
    const actualSkus = new Set<string>()
    rankings.forEach(r => {
      let actualSku = r.sku || ""
      if (!fbaQtyMap.has(actualSku) && r.asin) {
        for (const [key, val] of fbaQtyMap.entries()) {
          if (val.asin === r.asin) {
            actualSku = key
            break
          }
        }
      }
      if (actualSku) actualSkus.add(actualSku)
    })
    
    const actualSkusArray = Array.from(actualSkus)
    
    let realTimeInventoryMap = new Map<string, number>()
    let sales7Map = new Map<string, number>()
    let sales30Map = new Map<string, number>()
    let sales90Map = new Map<string, number>()

    try {
      if (actualSkusArray.length > 0) {
        listingsMap = await getListingDetailsBySkus(actualSkusArray)
        
        // Fetch real-time FBA inventory and SP-API Sales Metrics
        const { getRealTimeInventoryBySkus, getSalesMetricsBySkus } = await import("@/lib/amazon-sp-api-service")
        realTimeInventoryMap = await getRealTimeInventoryBySkus(actualSkusArray)
        sales7Map = await getSalesMetricsBySkus(actualSkusArray, 7)
        sales30Map = await getSalesMetricsBySkus(actualSkusArray, 30)
        sales90Map = await getSalesMetricsBySkus(actualSkusArray, 90)
      }
    } catch (e: any) {
      console.warn("Real-time data lookup failed:", e?.message)
    }

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    // Pre-fetch all local sales (fallback for FBM or if SP-API fails)
    const allSales = await prisma.amazonDailySales.findMany({
      where: {
        date: { gte: ninetyDaysAgo.toISOString().split("T")[0] }
      }
    })

    // Fetch Keepa for all asins to ensure we have sales estimates and fallback images
    const keepaMap = new Map<string, any>()
    try {
      const { keepaProvider } = await import("@/lib/keepa/provider")
      if (asinsToFetch.length > 0) {
        for (const asin of asinsToFetch) {
          const keepaData = await keepaProvider.getProductHistory({ asin, domainId: 1, history: false })
          if (keepaData.success) {
            keepaMap.set(asin, keepaData)
          }
          await new Promise(r => setTimeout(r, 200)) // slight delay
        }
      }
    } catch (e: any) {
      console.warn("Keepa fallback lookup failed:", e?.message)
    }

    const transaction = rankings.map(r => {
      const asin = r.asin || ""
      const sku = r.sku || ""

      const cData = catalogMap.get(asin)
      const kData = keepaMap.get(asin)

      let catalogImage = r.imageUrl
      let catalogTitle = r.productName

      if (cData) {
        if (cData.images && cData.images.length > 0) {
          const variants = cData.images[0].images || []
          const mainImage = variants.find((img: any) => img.variant === "MAIN")
          catalogImage = mainImage?.link || variants[0]?.link || catalogImage
        }
        catalogTitle = cData.summaries?.[0]?.itemName || catalogTitle
      }
      
      // Keepa image fallback
      if (!catalogImage && kData?.imageUrl) {
        catalogImage = kData.imageUrl
      }
      if (catalogTitle === "Unknown Product" && kData?.title) {
        catalogTitle = kData.title
      }

      // Resolve actual SKU if they only entered ASIN
      let actualSku = sku
      let fbaQty = fbaQtyMap.get(actualSku)
      
      if (!fbaQty && asin) {
        for (const [key, val] of fbaQtyMap.entries()) {
          if (val.asin === asin) {
            actualSku = key
            fbaQty = val
            break
          }
        }
      }

      // Inventory (Prefer real-time API over cached report)
      let newInventory = r.inventory
      if (realTimeInventoryMap.has(actualSku)) {
        newInventory = realTimeInventoryMap.get(actualSku)!
      } else if (fbaQty) {
        newInventory = fbaQty.fulfillable + fbaQty.reserved
      }

      // Price and FbaFee
      const listing = listingsMap.get(actualSku)
      let newPrice = r.price
      if (listing?.currentPrice) {
        newPrice = listing.currentPrice
      } else if (kData?.currentStats?.currentBuyBoxPrice || kData?.currentStats?.currentAmazonPrice) {
        newPrice = kData.currentStats.currentBuyBoxPrice || kData.currentStats.currentAmazonPrice || newPrice
      }

      // FBA Fee async evaluation wrapper (will resolve in Promise.all)
      return (async () => {
        let fbaFee = r.fbaFee || 0.0
        if (actualSku && newPrice > 0) {
          try {
            const feeEst = await getFbaFeeEstimate(actualSku, newPrice, true)
            if (feeEst?.fbaFee) fbaFee = feeEst.fbaFee
          } catch (e) {
            // silent fail
          }
        }

        // Sales (Prefer direct SP-API metrics, fallback to DB, fallback to Keepa)
        let sales7 = sales7Map.get(actualSku)
        let sales30 = sales30Map.get(actualSku)
        let sales90 = sales90Map.get(actualSku)

        // Fallback to local DB if SP-API didn't return metrics
        if (sales30 === undefined) {
          const skuSales = allSales.filter(s => (actualSku && s.sku === actualSku) || (asin && s.asin === asin))
          const now = new Date()
          sales7 = 0
          sales30 = 0
          sales90 = 0

          if (skuSales.length > 0) {
            skuSales.forEach(sale => {
              const saleDate = new Date(sale.date)
              const diffDays = Math.ceil((now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24))
              if (diffDays <= 7) sales7! += sale.unitsOrdered
              if (diffDays <= 30) sales30! += sale.unitsOrdered
              if (diffDays <= 90) sales90! += sale.unitsOrdered
            })
          }
        }

        // Keepa sales fallback if both SP-API and local DB have 0
        if ((!sales30 || sales30 === 0) && kData?.currentStats?.boughtInLastMonth) {
          sales30 = kData.currentStats.boughtInLastMonth
          if (!sales7 || sales7 === 0) sales7 = Math.round(sales30 / 4)
          if (!sales90 || sales90 === 0) sales90 = sales30 * 3
        }

        return prisma.productRanking.update({
          where: { id: r.id },
          data: {
            sku: actualSku,
            imageUrl: catalogImage,
            productName: catalogTitle,
            inventory: newInventory,
            price: newPrice,
            fbaFee,
            sales7Days: sales7,
            sales30Days: sales30,
            sales90Days: sales90
          }
        })
      })()
    })

    await Promise.all(transaction)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[PRODUCT_RANKINGS_SYNC]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

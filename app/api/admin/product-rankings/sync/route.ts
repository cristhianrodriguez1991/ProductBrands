import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { 
  getCatalogItemsByAsins, 
  getFbaQuantities,
  getListingDetailsBySkus,
  getFbaFeeEstimate,
  getFbaFeeEstimateForAsin,
  getActiveListings
} from "@/lib/amazon-sp-api-service"

export const maxDuration = 300 // allow up to 5 mins

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      const session = await getServerSession(authOptions)
      const userRole = (session?.user as any)?.role
      const customPermissions = (session?.user as any)?.customPermissions || []

      if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.PRODUCT_RANKINGS)) {
        return new NextResponse("Unauthorized", { status: 401 })
      }
    }

    const rankings = await prisma.productRanking.findMany()
    if (rankings.length === 0) {
      return NextResponse.json({ success: true, message: "No rankings to sync" })
    }

    let fbaQtyMap = new Map<string, any>()
    let activeListingsQtyMap = new Map<string, any>()
    let catalogMap = new Map<string, any>()
    let listingsMap = new Map<string, any>()

    try {
      fbaQtyMap = await getFbaQuantities()
    } catch (e: any) {
      console.warn("FBA quantities lookup failed:", e?.message)
    }

    try {
      const activeListings = await getActiveListings()
      for (const item of activeListings) {
        const sku = item["seller-sku"]
        const asin = item["asin1"] || item["asin"]
        const quantity = parseInt(item["quantity"]) || 0
        if (sku && asin) {
          activeListingsQtyMap.set(sku, { asin, quantity })
        }
      }
    } catch (e: any) {
      console.warn("Active listings lookup failed:", e?.message)
    }

    // Normalize ASINs and SKUs from input
    rankings.forEach(r => {
      const input = r.asin || r.sku
      if (input && input === r.sku && input === r.asin) {
        // Check if input is a SKU in our maps
        if (fbaQtyMap.has(input)) {
          r.asin = fbaQtyMap.get(input).asin
          r.sku = input
        } else if (activeListingsQtyMap.has(input)) {
          r.asin = activeListingsQtyMap.get(input).asin
          r.sku = input
        } else {
          // Check if input is an ASIN by searching values
          let foundSku = ""
          for (const [key, val] of fbaQtyMap.entries()) {
            if (val.asin?.toUpperCase() === input.toUpperCase()) {
              foundSku = key
              break
            }
          }
          if (!foundSku) {
            for (const [key, val] of activeListingsQtyMap.entries()) {
              if (val.asin?.toUpperCase() === input.toUpperCase()) {
                foundSku = key
                break
              }
            }
          }
          if (foundSku) {
            r.asin = input
            r.sku = foundSku
          }
        }
      }
    })

    const asinsToFetch = Array.from(new Set(rankings.map(r => r.asin).filter(Boolean))) as string[]
    const skusToFetch = Array.from(new Set(rankings.map(r => r.sku).filter(Boolean))) as string[]

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
    
    // Resolve actual SKUs
    const actualSkus = new Set<string>()
    rankings.forEach(r => {
      let actualSku = r.sku || ""
      if (!fbaQtyMap.has(actualSku) && r.asin) {
        const targetAsin = r.asin.toUpperCase()
        for (const [key, val] of fbaQtyMap.entries()) {
          if (val.asin?.toUpperCase() === targetAsin) {
            actualSkus.add(key)
          }
        }
      } else if (actualSku) {
        actualSkus.add(actualSku)
      }
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
        const { getRealTimeInventoryBySkus, getSalesMetricsByAsins } = await import("@/lib/amazon-sp-api-service")
        realTimeInventoryMap = await getRealTimeInventoryBySkus(actualSkusArray)
        sales7Map = await getSalesMetricsByAsins(asinsToFetch, 7)
        sales30Map = await getSalesMetricsByAsins(asinsToFetch, 30)
        sales90Map = await getSalesMetricsByAsins(asinsToFetch, 90)
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

      // Resolve all SKUs belonging to this ASIN
      let actualSkusForThisAsin: string[] = []
      let baseSku = sku
      
      const targetAsin = asin ? asin.toUpperCase() : ""
      if (targetAsin) {
        // Collect from fbaQtyMap
        for (const [key, val] of fbaQtyMap.entries()) {
          if (val.asin?.toUpperCase() === targetAsin && !actualSkusForThisAsin.includes(key)) {
            actualSkusForThisAsin.push(key)
          }
        }
        // Collect from activeListingsQtyMap
        for (const [key, val] of activeListingsQtyMap.entries()) {
          if (val.asin?.toUpperCase() === targetAsin && !actualSkusForThisAsin.includes(key)) {
            actualSkusForThisAsin.push(key)
          }
        }
      }
      
      if (actualSkusForThisAsin.length > 0) {
        if (!actualSkusForThisAsin.includes(baseSku)) {
          baseSku = actualSkusForThisAsin[0]
        }
      } else if (baseSku) {
        actualSkusForThisAsin.push(baseSku)
      }

      // Inventory (Prefer real-time API over cached report, sum over all SKUs)
      let newInventory = r.inventory
      let foundRealTime = false
      let summedInventory = 0

      for (const s of actualSkusForThisAsin) {
        if (realTimeInventoryMap.has(s)) {
          summedInventory += realTimeInventoryMap.get(s)!
          foundRealTime = true
        } else {
          const fbaQty = fbaQtyMap.get(s)
          if (fbaQty) {
            summedInventory += fbaQty.fulfillable
            foundRealTime = true
          }
        }
      }

      if (foundRealTime) {
        newInventory = summedInventory
      }
      
      const actualSku = baseSku // pass for catalog lookup compatibility

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
        if (asin && newPrice > 0) {
          try {
            const feeEst = await getFbaFeeEstimateForAsin(asin, newPrice)
            if (feeEst?.fbaFee) fbaFee = feeEst.fbaFee
          } catch (e) {
            // silent fail
          }
        }

        // Sales (Prefer direct SP-API metrics, fallback to DB, fallback to Keepa)
        let sales7 = sales7Map.get(asin) || 0
        let sales30 = sales30Map.get(asin) || 0
        let sales90 = sales90Map.get(asin) || 0

        // Fallback to local DB if SP-API didn't return metrics
        if (sales30 === 0) {
          const skuSales = allSales.filter(s => (actualSku && s.sku === actualSku) || (asin && s.asin === asin))
          const now = new Date()

          if (skuSales.length > 0) {
            skuSales.forEach(sale => {
              const saleDate = new Date(sale.date)
              const diffDays = Math.ceil((now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24))
              if (diffDays <= 7) sales7 += sale.unitsOrdered
              if (diffDays <= 30) sales30 += sale.unitsOrdered
              if (diffDays <= 90) sales90 += sale.unitsOrdered
            })
          }
        }

        // Keepa sales fallback if both SP-API and local DB have 0
        if (sales30 === 0 && kData?.currentStats?.boughtInLastMonth) {
          sales30 = kData.currentStats.boughtInLastMonth || 0
          if (sales7 === 0) sales7 = Math.round(sales30 / 4)
          if (sales90 === 0) sales90 = sales30 * 3
        }

        return prisma.productRanking.update({
          where: { id: r.id },
          data: {
            asin,
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
export const GET = POST

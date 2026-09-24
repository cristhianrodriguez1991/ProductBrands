import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { PERMISSIONS, hasEffectivePermission } from "@/lib/permissions"
import { getListingDetailsBySkus, getCatalogItemsByAsins, getFbaFeeEstimate, getFbaQuantities, getActiveListings } from "@/lib/amazon-sp-api-service"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.PRODUCT_RANKINGS)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const rankings = await prisma.productRanking.findMany({
      orderBy: { rank: "asc" }
    })

    return NextResponse.json(rankings)
  } catch (error) {
    console.error("[PRODUCT_RANKINGS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.PRODUCT_RANKINGS)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { asin, sku, cost } = body

    if (!asin && !sku) {
      return new NextResponse("Missing ASIN or SKU", { status: 400 })
    }

    let finalAsin = asin || ""
    let finalSku = sku || ""

    if (finalAsin && finalAsin === finalSku) {
      try {
        const fbaQtyMap = await getFbaQuantities()
        if (fbaQtyMap.has(finalAsin)) {
          finalAsin = fbaQtyMap.get(finalAsin)!.asin
        } else {
          const activeListings = await getActiveListings()
          for (const item of activeListings) {
            if (item["seller-sku"] === finalAsin) {
              finalAsin = item["asin1"] || item["asin"] || finalAsin
              break
            }
          }
        }
      } catch (e) {
        console.warn("Failed to normalize SKU to ASIN on POST", e)
      }
    }

    let price = 0
    let productName = "Unknown Product"
    let imageUrl = null
    let inventory = 0
    
    // Attempt to fetch from MonitoredProduct or InventoryItem first
    const monitored = await prisma.monitoredProduct.findFirst({
      where: {
        OR: [
          { sku: finalSku || undefined },
          { asin: finalAsin || undefined }
        ]
      }
    })

    if (monitored) {
      price = monitored.currentPrice
      productName = monitored.productName
      imageUrl = monitored.imageUrl || null
    }

    const invItem = await prisma.inventoryItem.findFirst({
      where: {
        OR: [
          { sku: finalSku || undefined },
          { asin: finalAsin || undefined }
        ]
      }
    })

    if (invItem) {
      inventory = invItem.quantityOnHand + invItem.quantityReserved
      if (invItem.sellingPrice && price === 0) price = invItem.sellingPrice
      if (invItem.name && productName === "Unknown Product") productName = invItem.name
      if (invItem.imageUrl && !imageUrl) imageUrl = invItem.imageUrl
    }

    // If still missing image or price, try Amazon directly
    if (!imageUrl || productName === "Unknown Product" || price === 0) {
      try {
        if (finalAsin) {
          const catalogData = await getCatalogItemsByAsins([finalAsin])
          if (catalogData.length > 0) {
            const cData = catalogData[0]
            if (cData.images && cData.images.length > 0) {
              const variants = cData.images[0].images || []
              const mainImage = variants.find((img: any) => img.variant === "MAIN")
              if (!imageUrl) imageUrl = mainImage?.link || variants[0]?.link || null
            }
            if (productName === "Unknown Product") productName = cData.summaries?.[0]?.itemName || "Unknown Product"
          }
        }
        if (finalSku && price === 0) {
          const listingData = await getListingDetailsBySkus([finalSku])
          const details = listingData.get(finalSku)
          if (details?.currentPrice) price = details.currentPrice
        }
      } catch (e) {
        console.warn("Failed to fallback to Amazon SP-API on POST", e)
      }

      // If STILL missing image (e.g. SP-API failed), try Keepa (like Auto Pricer)
      if (!imageUrl && finalAsin) {
        try {
          const { keepaProvider } = await import("@/lib/keepa/provider")
          const keepaData = await keepaProvider.getProductHistory({ asin: finalAsin, domainId: 1 })
          if (keepaData.success) {
            if (keepaData.imageUrl) imageUrl = keepaData.imageUrl
            if (keepaData.title && productName === "Unknown Product") productName = keepaData.title
            if (keepaData.currentStats?.currentAmazonPrice && price === 0) price = keepaData.currentStats.currentAmazonPrice
          }
        } catch (e) {
          console.warn("Failed to fallback to Keepa on POST", e)
        }
      }
    }

    // Determine highest rank to append at the end
    const lastRank = await prisma.productRanking.findFirst({
      orderBy: { rank: 'desc' }
    })
    const nextRank = lastRank ? lastRank.rank + 1 : 1

    let fbaFee = 0.0
    try {
      if (finalSku && price > 0) {
        const feeEst = await getFbaFeeEstimate(finalSku, price, true)
        if (feeEst?.fbaFee) fbaFee = feeEst.fbaFee
      }
    } catch (e) {
      console.warn("Failed to get FBA fee estimate on POST", e)
    }

    const created = await prisma.productRanking.create({
      data: {
        asin: finalAsin || finalSku,
        sku: finalSku || finalAsin,
        cost: Number(cost) || 0,
        price,
        fbaFee,
        productName,
        imageUrl,
        rank: nextRank,
        inventory
      }
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("[PRODUCT_RANKINGS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.PRODUCT_RANKINGS)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { updates } = body // Array of { id, rank, cost }

    if (!Array.isArray(updates)) {
      return new NextResponse("Invalid payload", { status: 400 })
    }

    const transaction = updates.map((u: any) => {
      const data: any = {}
      if (u.rank !== undefined) data.rank = Number(u.rank)
      if (u.cost !== undefined) data.cost = Number(u.cost)
      if (u.price !== undefined) data.price = Number(u.price)
      if (u.fbaFee !== undefined) data.fbaFee = Number(u.fbaFee)
      if (u.sales7Days !== undefined) data.sales7Days = Number(u.sales7Days)
      if (u.sales30Days !== undefined) data.sales30Days = Number(u.sales30Days)
      if (u.sales90Days !== undefined) data.sales90Days = Number(u.sales90Days)
      
      return prisma.productRanking.update({
        where: { id: u.id },
        data
      })
    })

    await prisma.$transaction(transaction)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[PRODUCT_RANKINGS_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userRole = (session?.user as any)?.role
    const customPermissions = (session?.user as any)?.customPermissions || []

    if (!session || !hasEffectivePermission(userRole, customPermissions, PERMISSIONS.PRODUCT_RANKINGS)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return new NextResponse("Missing id", { status: 400 })

    await prisma.productRanking.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[PRODUCT_RANKINGS_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}


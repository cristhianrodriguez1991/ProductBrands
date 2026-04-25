import { NextResponse } from "next/server"
import { getActiveListings, getCatalogItemsByAsins, getFbaQuantities } from "@/lib/amazon-sp-api-service"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * POST – Sync ALL active Amazon listings via the Reports API.
 * 
 * Uses GET_MERCHANT_LISTINGS_DATA report which only returns
 * currently active listings (both FBA and FBM), not old/deleted ones.
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!process.env.AMAZON_SPAPI_CLIENT_ID) {
    return NextResponse.json({
      error: "SP-API credentials not configured in .env",
    }, { status: 400 })
  }

  try {
    // ── 1. Fetch active listings from Amazon Reports API ──
    const listings = await getActiveListings()
    
    if (!listings || listings.length === 0) {
      return NextResponse.json({
        success: true,
        created: 0,
        total: 0,
        message: "No active listings found in Amazon Seller Central.",
      })
    }

    // ── 2. Collect ASINs for catalog image/title lookup (non-blocking) ──
    const asinsInListings = Array.from(
      new Set(listings.map((item: any) => item["asin1"] || item["ASIN"] || item["asin"]).filter(Boolean))
    )
    
    const catalogMap = new Map<string, any>()
    try {
      const catalogData = await getCatalogItemsByAsins(asinsInListings.slice(0, 50)) // limit to avoid timeout
      for (const cat of catalogData) {
        catalogMap.set(cat.asin, cat)
      }
    } catch (catErr: any) {
      console.warn("Catalog lookup failed (continuing without images):", catErr?.message)
    }

    // ── 3. Get real FBA warehouse quantities ──
    let fbaQtyMap = new Map<string, { fulfillable: number; reserved: number }>()
    try {
      fbaQtyMap = await getFbaQuantities()
    } catch (qtyErr: any) {
      console.warn("FBA quantity lookup failed (quantities will show as 0):", qtyErr?.message)
    }

    // ── 4. Wipe ALL old inventory for a clean slate ──
    await prisma.inventoryItem.deleteMany({})

    let createdCount = 0

    for (const item of listings) {
      const asin = item["asin1"] || item["ASIN"] || item["asin"] || ""
      const sku = item["seller-sku"] || item["sku"] || ""
      const title = item["item-name"] || item["Title"] || ""
      const imageUrl = item["image-url"] || item["Image Url"] || ""
      const condition = item["item-condition"] || item["Condition"] || ""

      // Get REAL FBA quantities from warehouse data
      const fbaQty = fbaQtyMap.get(asin)
      const quantityOnHand = fbaQty?.fulfillable || 0
      const quantityReserved = fbaQty?.reserved || 0

      // Get catalog image (richer quality) if available
      const cData = catalogMap.get(asin)
      let catalogImage: string | null = null
      if (cData?.images && cData.images.length > 0) {
        const variants = cData.images[0].images || []
        const mainImage = variants.find((img: any) => img.variant === "MAIN")
        catalogImage = mainImage?.link || variants[0]?.link || null
      }
      const catalogTitle = cData?.summaries?.[0]?.itemName || ""

      await prisma.inventoryItem.create({
        data: {
          source: "AMAZON",
          asin: asin || null,
          sku: sku || null,
          name: catalogTitle || title || `Amazon Product (${asin})`,
          amazonTitle: catalogTitle || title || null,
          amazonImageUrl: catalogImage || imageUrl || null,
          amazonUrl: asin ? `https://www.amazon.com/dp/${asin}` : null,
          quantityOnHand,
          quantityReserved,
          isActive: true,
          lastSyncedAt: new Date(),
        },
      })
      createdCount++
    }

    return NextResponse.json({
      success: true,
      created: createdCount,
      total: listings.length,
      message: `Synced ${createdCount} active Amazon listings.`,
    })
  } catch (error: any) {
    console.error("Seller Central Sync error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Seller Central Sync failed: " + (error?.message || "Unknown error"),
        details: JSON.stringify(error)
      },
      { status: 200 }
    )
  }
}

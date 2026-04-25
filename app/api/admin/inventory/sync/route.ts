import { NextResponse } from "next/server"
import { getActiveListings, getCatalogItemsByAsins, getFbaQuantities } from "@/lib/amazon-sp-api-service"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const maxDuration = 300; // Allow up to 5 minutes since Amazon Reports take time to generate
export const dynamic = "force-dynamic";

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
      const catalogData = await getCatalogItemsByAsins(asinsInListings) // Look up all ASINs (batched in 20s)
      for (const cat of catalogData) {
        catalogMap.set(cat.asin, cat)
      }
    } catch (catErr: any) {
      console.warn("Catalog lookup failed (continuing without images):", catErr?.message)
    }

    // ── 3. Get REAL FBA warehouse quantities ──
    // The report list gets ALL listings, but we must complement it with FBA inventory sums
    const fbaQtyMap = await getFbaQuantities()
    
    // Safety check: if for some reason the FBA report was cancelled (Amazon throttles frequent requests)
    // and returns 0 items, we MUST abort the sync so we don't accidentally set 24k items to 0 stock.
    if (fbaQtyMap.size === 0 && listings.length > 10) { // If they have > 10 listings but 0 FBA items returned, it's 99% a throttle/error
      throw new Error("Amazon FBA Inventory API throttled the request (CANCELLED). Please wait about 30 minutes before trying a manual sync again to allow Amazon's API limits to reset.")
    }

    // ── 4. Parse and Insert/Upsert ──
    let createdCount = 0
    let updatedCount = 0

    for (const item of listings) {
      const asin = item["asin1"] || item["ASIN"] || item["asin"] || ""
      const sku = item["seller-sku"] || item["sku"] || ""
      const title = item["item-name"] || item["product-name"] || item["Title"] || ""
      const amzStatus = item["status"] || item["item-status"] || ""
      const fulfillmentChannel = item["fulfillment-channel"] || item["fulfillment_channel"] || ""

      // Extract quantities AND fnsku from FBA response (using SKU as primary key for FBA)
      const fbaQty = fbaQtyMap.get(sku)
      const quantityOnHand = fbaQty?.fulfillable || 0
      const quantityReserved = fbaQty?.reserved || 0
      const fnsku = fbaQty?.fnsku || item["fnsku"] || null

      // Get catalog image (richer quality) and UPC if available
      const cData = catalogMap.get(asin)
      let catalogImage: string | null = null
      let upc: string | null = null

      if (cData) {
        // Image extraction
        if (cData.images && cData.images.length > 0) {
          const variants = cData.images[0].images || []
          const mainImage = variants.find((img: any) => img.variant === "MAIN")
          catalogImage = mainImage?.link || variants[0]?.link || null
        }
        
        // UPC extraction
        if (cData.identifiers && cData.identifiers.length > 0) {
          const identifiersList = cData.identifiers[0].identifiers || []
          const upcObj = identifiersList.find((id: any) => 
            id.identifierType === "UPC" || 
            id.identifierType === "EAN" || 
            id.identifierType === "GTIN"
          )
          if (upcObj) upc = upcObj.identifier
        }
      }
      
      const catalogTitle = cData?.summaries?.[0]?.itemName || ""
      
      const itemData = {
        source: "AMAZON" as const,
        asin: asin || null,
        fnsku: fnsku || null,
        upc: upc || null,
        name: catalogTitle || title || `Amazon Product (${asin})`,
        amazonTitle: catalogTitle || title || null,
        amazonImageUrl: catalogImage || null,
        amazonUrl: asin ? `https://www.amazon.com/dp/${asin}` : null,
        quantityOnHand,
        quantityReserved,
        isActive: amzStatus.toLowerCase().includes("active"),
        amazonStatus: amzStatus || null,
        fulfillmentChannel: fulfillmentChannel || null,
        lastSyncedAt: new Date(),
      }

      // UPSERT LOGIC based on SKU to preserve manual items and update existing Amazon items
      if (sku) {
        const existingItem = await prisma.inventoryItem.findFirst({
          where: { sku }
        })

        if (existingItem) {
          await prisma.inventoryItem.update({
            where: { id: existingItem.id },
            data: itemData,
          })
          updatedCount++
        } else {
          await prisma.inventoryItem.create({
            data: {
               ...itemData,
               sku,
            },
          })
          createdCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      created: createdCount,
      updated: updatedCount,
      total: listings.length,
      message: `Synced ${createdCount} new and updated ${updatedCount} Amazon listings.`,
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

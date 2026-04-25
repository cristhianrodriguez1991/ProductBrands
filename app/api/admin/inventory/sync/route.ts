import { NextResponse } from "next/server"
import { getFbaInventory, getCatalogItemsByAsins } from "@/lib/amazon-sp-api-service"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * POST – Auto-sync ALL Amazon products from the Seller Central SP-API.
 * 
 * Fetches real-time FBA inventory and quantities, then looks up 
 * catalog data (Images, Titles) directly from Amazon Seller API.
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Check if keys are configured
  if (!process.env.AMAZON_SPAPI_CLIENT_ID) {
    return NextResponse.json({
      error: "SP-API credentials not configured in .env",
    }, { status: 400 })
  }

  try {
    // ── 1. Fetch live inventory from Seller Central SP-API ──
    const inventory = await getFbaInventory()
    
    if (!inventory || inventory.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        created: 0,
        message: "No active inventory found in Amazon Seller Central.",
      })
    }

    // ── 2. Collect ASINs and fetch Catalog Data ──
    const asinsInInventory = Array.from(new Set(inventory.map((item: any) => item.asin).filter(Boolean)))
    const catalogData = await getCatalogItemsByAsins(asinsInInventory)
    
    // Map catalog data by ASIN for easy lookup
    const catalogMap = new Map<string, any>()
    for (const cat of catalogData) {
      catalogMap.set(cat.asin, cat)
    }

    let syncedCount = 0
    let createdCount = 0

    // ── 3. Upsert into database ──
    for (const item of inventory) {
      const asin = item.asin
      const sku = item.sellerSku
      
      // Stock calculations mapping from FBA
      const qtyOnHand = item.inventoryDetails?.fulfillableQuantity || 0
      const qtyReserved = item.inventoryDetails?.reservedQuantity?.totalReservedQuantity || 0

      // Get catalog info (Title/Image)
      const cData = catalogMap.get(asin)
      const title = cData?.summaries?.[0]?.itemName || "Untitled Amazon Product"
      
      // Extract main image link
      let imageUrl = null
      if (cData?.images && cData.images.length > 0) {
        const variants = cData.images[0].images || []
        const mainImage = variants.find((img: any) => img.variant === "MAIN")
        imageUrl = mainImage?.link || variants[0]?.link || null
      }

      const existing = await prisma.inventoryItem.findFirst({
        where: {
          OR: [
            { asin },
            { sku }
          ]
        }
      })

      if (existing) {
        // Update existing item with LIVE quantities and metadata
        await prisma.inventoryItem.update({
          where: { id: existing.id },
          data: {
            asin,
            sku,
            amazonTitle: title,
            amazonImageUrl: imageUrl,
            amazonUrl: `https://www.amazon.com/dp/${asin}`,
            quantityOnHand: qtyOnHand,
            quantityReserved: qtyReserved,
            name: existing.name === "Untitled Amazon Product" ? title : existing.name,
            lastSyncedAt: new Date(),
          },
        })
        syncedCount++
      } else {
        // Create new item pulled from Seller Central
        await prisma.inventoryItem.create({
          data: {
            source: "AMAZON",
            asin,
            sku,
            name: title,
            amazonTitle: title,
            amazonImageUrl: imageUrl,
            amazonUrl: `https://www.amazon.com/dp/${asin}`,
            quantityOnHand: qtyOnHand,
            quantityReserved: qtyReserved,
            isActive: true,
            lastSyncedAt: new Date(),
          },
        })
        createdCount++
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      created: createdCount,
      total: inventory.length,
    })
  } catch (error: any) {
    console.error("Seller Central SP-API Sync error:", error)
    return NextResponse.json(
      { error: "Seller Central Sync failed: " + (error?.message || "Unknown error") },
      { status: 500 }
    )
  }
}


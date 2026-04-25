import { NextResponse } from "next/server"
import { getItems } from "@/lib/amazon-service"
import { loadBrandCatalog } from "@/lib/brand-catalog"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * POST – Auto-sync ALL Amazon products from the brand catalog into inventory.
 *
 * This reads every product ASIN from data/brandCatalog.seed.json,
 * fetches fresh data from Amazon PA-API (image, title),
 * then upserts into the InventoryItem table.
 *
 * Local fields (quantityOnHand, location, upc, ean, notes, etc.)
 * are NEVER overwritten by the sync – only Amazon metadata is refreshed.
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    // ── 1. Collect every ASIN from the brand catalog ──
    const catalog = loadBrandCatalog()
    const catalogProducts: {
      asin: string
      title: string
      imageUrl: string | null
      amazonUrl: string
      category: string | null
      sku: string | null
    }[] = []

    for (const brand of catalog.brands) {
      for (const product of brand.products) {
        if (product.asin) {
          catalogProducts.push({
            asin: product.asin,
            title: product.title || "Untitled product",
            imageUrl: product.imageUrl || null,
            amazonUrl: product.amazonUrl || `https://www.amazon.com/dp/${product.asin}`,
            category: product.category || null,
            sku: null,
          })
        }
      }
    }

    if (catalogProducts.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        created: 0,
        message: "No products found in brand catalog.",
      })
    }

    // ── 2. Try to enrich with PA-API (optional – works even if API keys are missing) ──
    const allAsins = catalogProducts.map((p) => p.asin)
    let paApiItems: any[] = []

    try {
      // PA-API batch limit = 10
      const batches: string[][] = []
      for (let i = 0; i < allAsins.length; i += 10) {
        batches.push(allAsins.slice(i, i + 10))
      }

      for (const batch of batches) {
        const items = await getItems(batch)
        paApiItems.push(...items)
      }
    } catch (e: any) {
      // PA-API not configured or failed – we'll use catalog data instead
      console.log("PA-API not available, using catalog data:", e?.message)
    }

    // Build a lookup map from PA-API results
    const paApiMap = new Map<string, any>()
    for (const item of paApiItems) {
      if (item.ASIN) paApiMap.set(item.ASIN, item)
    }

    // ── 3. Upsert each product into InventoryItem ──
    let syncedCount = 0
    let createdCount = 0

    for (const product of catalogProducts) {
      const paData = paApiMap.get(product.asin)

      // Prefer PA-API data if available, fall back to catalog seed
      const title = paData?.ItemInfo?.Title?.DisplayValue ?? product.title
      const imageUrl = paData?.Images?.Primary?.Large?.URL ?? product.imageUrl

      const existing = await prisma.inventoryItem.findUnique({
        where: { asin: product.asin },
      })

      if (existing) {
        // Update ONLY Amazon metadata – never overwrite local inventory data
        await prisma.inventoryItem.update({
          where: { asin: product.asin },
          data: {
            amazonTitle: title,
            amazonImageUrl: imageUrl,
            amazonUrl: product.amazonUrl,
            // Update name only if it was the original auto-generated one
            name: existing.name === "Untitled product" ? title : existing.name,
            lastSyncedAt: new Date(),
          },
        })
        syncedCount++
      } else {
        // Create new inventory item
        await prisma.inventoryItem.create({
          data: {
            source: "AMAZON",
            asin: product.asin,
            name: title,
            amazonTitle: title,
            amazonImageUrl: imageUrl,
            amazonUrl: product.amazonUrl,
            category: product.category,
            quantityOnHand: 0,
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
      total: catalogProducts.length,
    })
  } catch (error: any) {
    console.error("Inventory sync error:", error)
    return NextResponse.json(
      { error: "Sync failed: " + (error?.message || "Unknown error") },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"
import { getItems } from "@/lib/amazon-service"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * POST – Sync inventory from Amazon PA-API
 * 
 * Body can optionally contain:
 *   { asins: ["B0XXXXXX", "B0YYYYYY"] }
 * 
 * If asins not provided, it will sync all existing AMAZON-source items 
 * that already have an ASIN in the database.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    let asinsToSync: string[] = body.asins || []

    // If no ASINs provided, fetch all Amazon-source items that have an ASIN
    if (asinsToSync.length === 0) {
      const existingItems = await prisma.inventoryItem.findMany({
        where: { source: "AMAZON", asin: { not: null } },
        select: { asin: true },
      })
      asinsToSync = existingItems
        .map((i) => i.asin)
        .filter((a): a is string => !!a)
    }

    if (asinsToSync.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        created: 0,
        message: "No ASINs to sync. Add ASINs first.",
      })
    }

    // PA-API supports max 10 items per request, batch accordingly
    const batches: string[][] = []
    for (let i = 0; i < asinsToSync.length; i += 10) {
      batches.push(asinsToSync.slice(i, i + 10))
    }

    let syncedCount = 0
    let createdCount = 0
    const errors: string[] = []

    for (const batch of batches) {
      let items
      try {
        items = await getItems(batch)
      } catch (error: any) {
        console.error("Amazon PA-API batch error:", error?.message || error)
        errors.push(`Batch failed: ${error?.message || "Unknown error"}`)
        continue
      }

      for (const item of items) {
        const asin: string | undefined = item.ASIN
        if (!asin) continue

        const title = item.ItemInfo?.Title?.DisplayValue ?? "Untitled product"
        const imageUrl = item.Images?.Primary?.Large?.URL ?? null
        const listing = item.Offers?.Listings?.[0]
        const priceAmount = listing?.Price?.Amount ?? null
        const rating = item.CustomerReviews?.StarRating ?? null
        const reviewCount = item.CustomerReviews?.Count ?? null

        // Check if we already have this ASIN in inventory
        const existing = await prisma.inventoryItem.findUnique({
          where: { asin },
        })

        if (existing) {
          // Update product info from Amazon but preserve local inventory data
          await prisma.inventoryItem.update({
            where: { asin },
            data: {
              amazonTitle: title,
              amazonImageUrl: imageUrl,
              amazonPrice: priceAmount,
              amazonUrl: `https://www.amazon.com/dp/${asin}`,
              amazonRating: rating ? parseFloat(String(rating)) : null,
              amazonReviewCount: reviewCount ? parseInt(String(reviewCount)) : null,
              // Update name only if it was auto-generated
              name: existing.name === "Untitled product" ? title : existing.name,
              lastSyncedAt: new Date(),
            },
          })
          syncedCount++
        } else {
          // Create new inventory item from Amazon
          await prisma.inventoryItem.create({
            data: {
              source: "AMAZON",
              asin,
              name: title,
              amazonTitle: title,
              amazonImageUrl: imageUrl,
              amazonPrice: priceAmount,
              amazonUrl: `https://www.amazon.com/dp/${asin}`,
              amazonRating: rating ? parseFloat(String(rating)) : null,
              amazonReviewCount: reviewCount ? parseInt(String(reviewCount)) : null,
              quantityOnHand: 0,
              lastSyncedAt: new Date(),
            },
          })
          createdCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      created: createdCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("Inventory sync error:", error)
    return NextResponse.json(
      { error: "Sync failed: " + (error?.message || "Unknown error") },
      { status: 500 }
    )
  }
}

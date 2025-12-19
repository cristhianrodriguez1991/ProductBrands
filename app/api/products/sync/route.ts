import { NextRequest, NextResponse } from "next/server"
import { getItems } from "@/lib/amazon-service"
import { loadBrandCatalog } from "@/lib/brand-catalog"

/**
 * Bulk sync all products from Amazon PA-API
 * This endpoint fetches live data for all products in your catalog
 */
export async function POST(request: NextRequest) {
  try {
    const catalog = loadBrandCatalog()
    const allAsins: string[] = []

    // Collect all ASINs from all brands
    for (const brand of catalog.brands) {
      for (const product of brand.products) {
        allAsins.push(product.asin)
      }
    }

    if (allAsins.length === 0) {
      return NextResponse.json(
        { error: "No products found in catalog" },
        { status: 400 }
      )
    }

    // PA-API allows up to 10 items per request
    const batchSize = 10
    const syncedProducts: any[] = []
    const errors: string[] = []

    // Process in batches
    for (let i = 0; i < allAsins.length; i += batchSize) {
      const batch = allAsins.slice(i, i + batchSize)
      
      try {
        const items = await getItems(batch)
        
        for (const item of items) {
          const asin = item.ASIN
          const title = item.ItemInfo?.Title?.DisplayValue || ""
          const imageUrl = item.Images?.Primary?.Large?.URL || ""
          const features = item.ItemInfo?.Features?.DisplayValues || []
          const price = item.Offers?.Listings?.[0]?.Price?.Amount || null
          const currency = item.Offers?.Listings?.[0]?.Price?.Currency || "USD"
          const rating = item.CustomerReviews?.StarRating?.Value || null
          const reviewCount = item.CustomerReviews?.Count || null

          syncedProducts.push({
            asin,
            title,
            imageUrl,
            bullets: features,
            priceAmount: price ? parseFloat(price) : null,
            priceCurrency: currency,
            rating: rating ? parseFloat(rating) : null,
            reviewCount: reviewCount ? parseInt(reviewCount) : null,
          })
        }

        // Rate limiting: wait 1 second between batches
        if (i + batchSize < allAsins.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (error: any) {
        errors.push(`Batch ${i / batchSize + 1}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedProducts.length,
      total: allAsins.length,
      products: syncedProducts,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    // PA-API not configured
    if (error.message?.includes("not fully configured")) {
      return NextResponse.json(
        { 
          error: "Amazon PA-API not configured",
          message: "Please add your PA-API credentials to .env file. See AMAZON_PAAPI_SETUP.md for instructions."
        },
        { status: 400 }
      )
    }

    console.error("Error syncing products:", error)
    return NextResponse.json(
      { error: "Failed to sync products", message: error.message },
      { status: 500 }
    )
  }
}


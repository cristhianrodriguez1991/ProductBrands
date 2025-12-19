import { NextRequest, NextResponse } from "next/server"
import { getItems } from "@/lib/amazon-service"
import { getBrandBySlug } from "@/lib/brand-catalog"

export async function GET(
  request: NextRequest,
  { params }: { params: { asin: string } }
) {
  try {
    const asin = params.asin

    // Try to fetch from PA-API first
    try {
      const items = await getItems([asin])
      if (items && items.length > 0) {
        const item = items[0]
        
        // Extract data from PA-API response
        const title = item.ItemInfo?.Title?.DisplayValue || ""
        const imageUrl = item.Images?.Primary?.Large?.URL || ""
        const features = item.ItemInfo?.Features?.DisplayValues || []
        const price = item.Offers?.Listings?.[0]?.Price?.Amount || null
        const currency = item.Offers?.Listings?.[0]?.Price?.Currency || "USD"
        const rating = item.CustomerReviews?.StarRating?.Value || null
        const reviewCount = item.CustomerReviews?.Count || null

        return NextResponse.json({
          asin,
          amazonUrl: `https://www.amazon.com/dp/${asin}`,
          title,
          imageUrl,
          bullets: features,
          priceAmount: price ? parseFloat(price) : null,
          priceCurrency: currency,
          rating: rating ? parseFloat(rating) : null,
          reviewCount: reviewCount ? parseInt(reviewCount) : null,
          source: "paapi",
        })
      }
    } catch (paapiError) {
      // PA-API not configured or failed, fall back to seed data
      console.log("PA-API not available, using seed data:", paapiError)
    }

    // Fallback to seed catalog
    const { loadBrandCatalog } = await import("@/lib/brand-catalog")
    const catalog = loadBrandCatalog()
    for (const brand of catalog.brands) {
      const product = brand.products.find((p) => p.asin === asin)
      if (product) {
        return NextResponse.json({
          asin: product.asin,
          amazonUrl: product.amazonUrl || `https://www.amazon.com/dp/${product.asin}`,
          title: product.title || "",
          imageUrl: product.imageUrl || "",
          bullets: product.bullets || [],
          priceAmount: product.priceAmount ?? null,
          priceCurrency: product.priceCurrency || "USD",
          rating: product.rating ?? null,
          reviewCount: product.reviewCount ?? null,
          source: "seed",
        })
      }
    }

    return NextResponse.json(
      { error: "Product not found" },
      { status: 404 }
    )
  } catch (error) {
    console.error("Error fetching product:", error)
    return NextResponse.json(
      { error: "Failed to fetch product data" },
      { status: 500 }
    )
  }
}


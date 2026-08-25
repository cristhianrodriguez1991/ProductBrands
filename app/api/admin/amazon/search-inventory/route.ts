import { NextResponse } from "next/server"
import { getActiveListings } from "@/lib/amazon-sp-api-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.toLowerCase() || ""

    if (query.length < 3) {
      return NextResponse.json({ results: [] })
    }

    console.log(`[SEARCH_INVENTORY] Fetching live Amazon listings to search for: "${query}"`)
    const items = await getActiveListings()
    
    // Filter by ASIN, SKU, or Title
    // The TSV from GET_MERCHANT_LISTINGS_DATA has columns like: 
    // "item-name", "item-description", "listing-id", "seller-sku", "price", "quantity", "open-date", "image-url", "item-is-marketplace", "product-id-type", "zshop-shipping-fee", "item-note", "item-condition", "zshop-category1", "zshop-browse-path", "zshop-storefront-feature", "asin1", "asin2", "asin3", "will-ship-internationally", "expedited-shipping", "zshop-boldface", "product-id", "bid-for-featured-placement", "add-delete", "pending-quantity", "fulfillment-channel"
    
    const results = items
      .filter((item: any) => {
        const asin = (item["asin1"] || "").toLowerCase()
        const sku = (item["seller-sku"] || "").toLowerCase()
        const title = (item["item-name"] || "").toLowerCase()
        
        return asin.includes(query) || sku.includes(query) || title.includes(query)
      })
      .map((item: any) => ({
        asin: item["asin1"] || "",
        sku: item["seller-sku"] || "",
        productName: item["item-name"] || "",
        price: parseFloat(item["price"] || "0"),
        isAmazonLive: true // Flag to distinguish from local products
      }))
      .slice(0, 15) // Limit to 15 results

    return NextResponse.json({ results })
  } catch (error: any) {
    console.error("[SEARCH_INVENTORY] Error:", error.message || error)
    return NextResponse.json({ error: "Failed to search Amazon inventory" }, { status: 500 })
  }
}

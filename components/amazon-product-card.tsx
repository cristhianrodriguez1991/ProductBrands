"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Star, ExternalLink, Sparkles, ShoppingCart } from "lucide-react"

type StoreLink = {
  storeName: string
  storeUrl: string
  storeId?: string | null
  price?: number | null
  isDefault?: boolean
}

type ProductData = {
  asin?: string | null
  amazonUrl?: string | null
  title?: string
  imageUrl?: string | null
  description?: string
  bullets?: string[]
  priceAmount?: number | null
  priceCurrency?: string
  rating?: number | null
  reviewCount?: number | null
  source?: "paapi" | "seed"
  storeLinks?: StoreLink[]
}

type AmazonProductCardProps = {
  product: ProductData
  showFullDetails?: boolean
}

// Store-specific styling
const STORE_STYLES: Record<string, { bg: string, hover: string, icon?: string }> = {
  "Amazon": { bg: "from-[#FF9900] to-[#FF8800]", hover: "hover:from-[#FF8800] hover:to-[#FF7700]" },
  "Walmart": { bg: "from-[#0071CE] to-[#004C91]", hover: "hover:from-[#004C91] hover:to-[#003B73]" },
  "eBay": { bg: "from-[#E53238] to-[#C72C32]", hover: "hover:from-[#C72C32] hover:to-[#B02228]" },
  "Target": { bg: "from-[#CC0000] to-[#990000]", hover: "hover:from-[#990000] hover:to-[#770000]" },
  "Costco": { bg: "from-[#005DAA] to-[#004A8C]", hover: "hover:from-[#004A8C] hover:to-[#003870]" },
  "Sam's Club": { bg: "from-[#0067A0] to-[#005080]", hover: "hover:from-[#005080] hover:to-[#004060]" },
  "Alibaba": { bg: "from-[#FF6A00] to-[#E55A00]", hover: "hover:from-[#E55A00] hover:to-[#CC5000]" },
  "AliExpress": { bg: "from-[#E62E04] to-[#CC2800]", hover: "hover:from-[#CC2800] hover:to-[#B02200]" },
  "Etsy": { bg: "from-[#F56400] to-[#D95700]", hover: "hover:from-[#D95700] hover:to-[#BD4C00]" },
  "Other": { bg: "from-gray-600 to-gray-700", hover: "hover:from-gray-700 hover:to-gray-800" },
}

export function AmazonProductCard({ product, showFullDetails = false }: AmazonProductCardProps) {
  const [productData] = useState<ProductData>(product)
  const [isHovered, setIsHovered] = useState(false)

  const formatPrice = (amount: number | null | undefined, currency: string = "USD") => {
    if (!amount) return null
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const displayTitle = productData.title || "Product details coming soon"
  const displayDescription = productData.description || "Details coming soon. We will add full product information as your catalog grows."
  const displayBullets = productData.bullets && productData.bullets.length > 0 
    ? productData.bullets 
    : []
  const displayPrice = productData.priceAmount ? formatPrice(productData.priceAmount, productData.priceCurrency) : null
  const displayRating = productData.rating
  const displayReviewCount = productData.reviewCount

  // Get store links - prefer storeLinks array, fall back to amazonUrl
  const storeLinks: StoreLink[] = productData.storeLinks && productData.storeLinks.length > 0
    ? productData.storeLinks
    : productData.amazonUrl
      ? [{ storeName: "Amazon", storeUrl: productData.amazonUrl, storeId: productData.asin, isDefault: true }]
      : []

  // Sort: default first, then by name
  const sortedLinks = [...storeLinks].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1
    return a.storeName.localeCompare(b.storeName)
  })

  const getStoreStyle = (storeName: string) => {
    return STORE_STYLES[storeName] || STORE_STYLES["Other"]
  }

  return (
    <div
      className="group relative rounded-2xl bg-white overflow-hidden border border-slate-200/50 hover:border-blue-300 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section with zoom effect */}
      <div className="relative aspect-[4/3] w-full bg-white overflow-hidden">
        {productData.imageUrl ? (
          <div className="relative w-full h-full">
            <Image
              src={productData.imageUrl}
              alt={displayTitle}
              fill
              className={`object-contain p-4 transition-transform duration-500 ${
                isHovered ? "scale-110" : "scale-100"
              }`}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {/* Shine effect on hover */}
            <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 transition-all duration-700 ${
              isHovered ? "translate-x-full" : "-translate-x-full"
            }`} />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">
            No image yet
          </div>
        )}
        {/* Rating badge overlay */}
        {displayRating && displayRating >= 4 && (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg z-10">
            <Star className="h-3.5 w-3.5 fill-white" />
            <span className="text-xs font-bold">{displayRating.toFixed(1)}</span>
          </div>
        )}
        {/* Multiple stores badge */}
        {sortedLinks.length > 1 && (
          <div className="absolute top-3 left-3 bg-blue-600 text-white px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg z-10">
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">{sortedLinks.length} Stores</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="relative p-5 space-y-3 z-10">
        {/* Title */}
        <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
          {displayTitle}
        </h3>

        {/* Price and Rating */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {displayPrice && (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                {displayPrice}
              </span>
              {displayRating && displayRating >= 4.5 && (
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  Best Value
                </span>
              )}
            </div>
          )}
          {displayRating && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 transition-all ${
                      i < Math.floor(displayRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              {displayRating > 0 && (
                <span className="text-sm font-semibold text-gray-700">
                  {displayRating.toFixed(1)}
                </span>
              )}
              {displayReviewCount && (
                <span className="text-xs text-gray-500">
                  ({displayReviewCount.toLocaleString()})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        {showFullDetails && (
          <p className="text-sm text-gray-600 line-clamp-3">
            {displayDescription}
          </p>
        )}

        {/* Bullets with animation */}
        {displayBullets.length > 0 && (
          <ul className="space-y-2">
            {displayBullets.slice(0, showFullDetails ? 10 : 3).map((bullet, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-700 group-hover:text-gray-900 transition-colors"
                style={{
                  animationDelay: `${i * 50}ms`,
                }}
              >
                <div className="mt-1.5 flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 group-hover:bg-blue-500 transition-colors" />
                </div>
                <span className="leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Store Links - Show all if multiple, or single button */}
        {sortedLinks.length > 0 && (
          <div className="mt-4 space-y-2">
            {sortedLinks.length === 1 ? (
              // Single store - full width button
              <Link
                href={sortedLinks[0].storeUrl}
                target="_blank"
                rel="nofollow sponsored noopener"
                className="block"
              >
                <Button
                  className={`w-full bg-gradient-to-r ${getStoreStyle(sortedLinks[0].storeName).bg} ${getStoreStyle(sortedLinks[0].storeName).hover} text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] relative overflow-hidden group/btn`}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Buy on {sortedLinks[0].storeName}</span>
                    <ExternalLink className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                </Button>
              </Link>
            ) : (
              // Multiple stores - grid of buttons
              <div className="grid grid-cols-2 gap-2">
                {sortedLinks.map((link, index) => (
                  <Link
                    key={index}
                    href={link.storeUrl}
                    target="_blank"
                    rel="nofollow sponsored noopener"
                    className="block"
                  >
                    <Button
                      size="sm"
                      className={`w-full bg-gradient-to-r ${getStoreStyle(link.storeName).bg} ${getStoreStyle(link.storeName).hover} text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden group/btn text-xs`}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-1">
                        <span>{link.storeName}</span>
                        {link.price && (
                          <span className="opacity-80">
                            ${link.price.toFixed(2)}
                          </span>
                        )}
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </span>
                    </Button>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Product ID - Hidden on hover */}
        {(productData.asin || sortedLinks[0]?.storeId) && (
          <div className={`pt-2 border-t border-gray-100 transition-opacity ${isHovered ? "opacity-0" : "opacity-100"}`}>
            <p className="text-xs text-gray-400">
              {productData.asin ? `ASIN: ${productData.asin}` : sortedLinks[0]?.storeId ? `ID: ${sortedLinks[0].storeId}` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

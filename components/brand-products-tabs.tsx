"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AmazonProductCard } from "@/components/amazon-product-card"

type Product = {
  id: string
  name: string
  description: string | null
  bullets: string[]
  category: string | null
  imageUrl: string | null
  amazonUrl: string
  asin: string
  priceAmount: number | null
}

type Category = {
  id: string
  title: string
  description: string
}

type BrandProductsTabsProps = {
  brandSlug: string
  products: Product[]
  categories: Category[]
  initialCategory?: string // Category from URL passed by server
}

export function BrandProductsTabs({ brandSlug, products, categories, initialCategory }: BrandProductsTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  // Filter categories to only show those with products (memoized)
  const categoriesWithProducts = useMemo(() => {
    return categories.filter((category) => {
      const productsInCategory = products.filter(
        (product) => product.category === category.id
      )
      return productsInCategory.length > 0
    })
  }, [categories, products])

  // Determine initial tab from server-provided category or default to first
  const getInitialTab = (): string => {
    if (initialCategory) {
      // Case-insensitive match
      const matched = categoriesWithProducts.find(
        cat => cat.id.toLowerCase() === initialCategory.toLowerCase()
      )
      if (matched) return matched.id
    }
    return categoriesWithProducts.length > 0 ? categoriesWithProducts[0].id : ""
  }

  const [activeTab, setActiveTab] = useState<string>(getInitialTab)

  // Update tab when initialCategory changes (e.g., navigation)
  useEffect(() => {
    if (initialCategory) {
      const matched = categoriesWithProducts.find(
        cat => cat.id.toLowerCase() === initialCategory.toLowerCase()
      )
      if (matched && matched.id !== activeTab) {
        setActiveTab(matched.id)
      }
    }
  }, [initialCategory, categoriesWithProducts, activeTab])

  // Handle tab click
  const handleTabClick = (categoryId: string) => {
    setActiveTab(categoryId)
    // Update URL without full page reload
    router.push(`${pathname}?category=${encodeURIComponent(categoryId)}`, { scroll: false })
  }

  // Get active category and its products
  const activeCategory = categoriesWithProducts.find((cat) => cat.id === activeTab)
  const productsInActiveCategory = products.filter(
    (product) => product.category === activeTab
  )

  if (categoriesWithProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No products available yet.</p>
      </div>
    )
  }

  return (
    <>
      {/* Tab Navigation */}
      <div className="mb-10">
        <nav className="flex gap-2 justify-start md:justify-center flex-nowrap overflow-x-auto scrollbar-hide pb-2" aria-label="Tabs">
          {categoriesWithProducts.map((category) => (
            <button
              key={category.id}
              onClick={() => handleTabClick(category.id)}
              className={`
                px-4 py-2 text-xs font-semibold rounded-full transition-all duration-300 whitespace-nowrap flex-shrink-0
                ${
                  activeTab === category.id
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105"
                    : "bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
                }
              `}
            >
              {category.title}
            </button>
          ))}
        </nav>
      </div>

      {/* Active Tab Content */}
      {activeCategory && (
        <div className="animate-in fade-in duration-300">
          <div className="mb-8 text-center">
            <h3 className="text-3xl font-bold text-gray-900 mb-3">
              {activeCategory.title}
            </h3>
            <p className="text-base text-gray-600 max-w-2xl mx-auto">
              {activeCategory.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {productsInActiveCategory.map((product) => (
              <AmazonProductCard
                key={product.asin}
                product={{
                  asin: product.asin,
                  amazonUrl: product.amazonUrl,
                  title: product.name,
                  imageUrl: product.imageUrl || undefined,
                  description: product.description || undefined,
                  bullets: product.bullets,
                }}
                showFullDetails={false}
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

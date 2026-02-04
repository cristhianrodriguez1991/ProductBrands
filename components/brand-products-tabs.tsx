"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
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
}

export function BrandProductsTabs({ brandSlug, products, categories }: BrandProductsTabsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  
  // Filter categories to only show those with products
  const categoriesWithProducts = categories.filter((category) => {
    const productsInCategory = products.filter(
      (product) => product.category === category.id
    )
    return productsInCategory.length > 0
  })

  // Get category from URL params or default to first category
  const categoryFromUrl = searchParams.get("category")
  const initialTab = categoryFromUrl && categoriesWithProducts.find(cat => cat.id === categoryFromUrl)
    ? categoryFromUrl
    : categoriesWithProducts.length > 0 ? categoriesWithProducts[0].id : ""

  const [activeTab, setActiveTab] = useState(initialTab)

  // Update active tab when URL param changes
  useEffect(() => {
    const urlCategory = searchParams.get("category")
    if (urlCategory && categoriesWithProducts.find(cat => cat.id === urlCategory)) {
      setActiveTab(urlCategory)
    } else if (!urlCategory && categoriesWithProducts.length > 0) {
      setActiveTab(categoriesWithProducts[0].id)
    }
  }, [searchParams, categoriesWithProducts])

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
              onClick={() => {
                setActiveTab(category.id)
                const params = new URLSearchParams(searchParams.toString())
                params.set("category", category.id)
                router.push(`${pathname}?${params.toString()}`, { scroll: false })
              }}
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

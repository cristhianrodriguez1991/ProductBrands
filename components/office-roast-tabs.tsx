"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { SeedBrand } from "@/lib/brand-catalog"
import { AmazonProductCard } from "@/components/amazon-product-card"

type Category = {
  id: string
  title: string
  description: string
}

type OfficeRoastTabsProps = {
  brand: SeedBrand
  categories: Category[]
}

export function OfficeRoastTabs({ brand, categories }: OfficeRoastTabsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Filter categories to only show those with products
  const categoriesWithProducts = categories.filter((category) => {
    const productsInCategory = brand.products.filter(
      (product: any) => product.category === category.id
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
      // If no category in URL, set to first category
      setActiveTab(categoriesWithProducts[0].id)
    }
  }, [searchParams, categoriesWithProducts])

  // Get active category and its products
  const activeCategory = categoriesWithProducts.find((cat) => cat.id === activeTab)
  const productsInActiveCategory = brand.products.filter(
    (product: any) => product.category === activeTab
  )

  return (
    <>
      {/* Tab Navigation */}
      <div className="mb-10">
        <nav className="flex gap-2 justify-center flex-nowrap overflow-x-auto scrollbar-hide" aria-label="Tabs">
          {categoriesWithProducts.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setActiveTab(category.id)
                // Update URL using Next.js router
                const params = new URLSearchParams(searchParams.toString())
                params.set("category", category.id)
                router.push(`/brands/office-roast?${params.toString()}`, { scroll: false })
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
                  title: product.title,
                  imageUrl: product.imageUrl,
                  description: product.description,
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

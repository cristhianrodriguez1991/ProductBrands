"use client"

import { useState } from "react"
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
  // Filter categories to only show those with products
  const categoriesWithProducts = categories.filter((category) => {
    const productsInCategory = brand.products.filter(
      (product: any) => product.category === category.id
    )
    return productsInCategory.length > 0
  })

  // Set initial active tab to first category with products
  const [activeTab, setActiveTab] = useState(
    categoriesWithProducts.length > 0 ? categoriesWithProducts[0].id : ""
  )

  // Get active category and its products
  const activeCategory = categoriesWithProducts.find((cat) => cat.id === activeTab)
  const productsInActiveCategory = brand.products.filter(
    (product: any) => product.category === activeTab
  )

  return (
    <>
      {/* Tab Navigation */}
      <div className="mb-10">
        <nav className="flex flex-wrap gap-3 justify-center" aria-label="Tabs">
          {categoriesWithProducts.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveTab(category.id)}
              className={`
                px-6 py-3 text-sm font-semibold rounded-full transition-all duration-300
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

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
      <div className="mb-8">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex space-x-1" aria-label="Tabs">
            {categoriesWithProducts.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveTab(category.id)}
                className={`
                  px-6 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors duration-200
                  ${
                    activeTab === category.id
                      ? "border-blue-600 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                  }
                `}
              >
                {category.title}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Active Tab Content */}
      {activeCategory && (
        <div>
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {activeCategory.title}
            </h3>
            <p className="text-sm text-gray-600 max-w-2xl">
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

"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AmazonProductCard } from "@/components/amazon-product-card"

const ALL_PRODUCTS_TAB = "__all__"

type StoreLink = {
  id: string
  storeName: string
  storeUrl: string
  storeId: string | null
  price: number | null
  isDefault: boolean
  sortOrder: number
}

type Product = {
  id: string
  name: string
  description: string | null
  bullets: string[]
  category: string | null
  imageUrl: string | null
  amazonUrl: string | null
  asin: string | null
  priceAmount: number | null
  storeLinks?: StoreLink[]
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

  // Determine initial tab from server-provided category or default to "All"
  const getInitialTab = (): string => {
    if (initialCategory) {
      // Case-insensitive match
      const matched = categoriesWithProducts.find(
        cat => cat.id.toLowerCase() === initialCategory.toLowerCase()
      )
      if (matched) return matched.id
    }
    // Default to "All Products" when no category specified
    return ALL_PRODUCTS_TAB
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
    } else if (!initialCategory && activeTab !== ALL_PRODUCTS_TAB) {
      // No category in URL means "All Products"
      setActiveTab(ALL_PRODUCTS_TAB)
    }
  }, [initialCategory, categoriesWithProducts, activeTab])

  // Handle tab click
  const handleTabClick = (categoryId: string) => {
    setActiveTab(categoryId)
    // Update URL without full page reload
    if (categoryId === ALL_PRODUCTS_TAB) {
      router.push(pathname, { scroll: false })
    } else {
      router.push(`${pathname}?category=${encodeURIComponent(categoryId)}`, { scroll: false })
    }
  }

  // Get active category and its products
  const isAllProducts = activeTab === ALL_PRODUCTS_TAB
  const activeCategory = isAllProducts ? null : categoriesWithProducts.find((cat) => cat.id === activeTab)
  const productsToShow = isAllProducts 
    ? products 
    : products.filter((product) => product.category === activeTab)

  if (products.length === 0) {
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
          {/* All Products tab */}
          <button
            onClick={() => handleTabClick(ALL_PRODUCTS_TAB)}
            className={`
              px-4 py-2 text-xs font-semibold rounded-full transition-all duration-300 whitespace-nowrap flex-shrink-0
              ${
                activeTab === ALL_PRODUCTS_TAB
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105"
                  : "bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
              }
            `}
          >
            All Products ({products.length})
          </button>
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
      <div className="animate-in fade-in duration-300">
        <div className="mb-8 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-3">
            {isAllProducts ? "All Products" : activeCategory?.title}
          </h3>
          <p className="text-base text-gray-600 max-w-2xl mx-auto">
            {isAllProducts 
              ? `Browse all ${products.length} products from this brand`
              : activeCategory?.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {productsToShow.map((product) => (
            <AmazonProductCard
              key={product.id}
              product={{
                asin: product.asin,
                amazonUrl: product.amazonUrl,
                title: product.name,
                imageUrl: product.imageUrl || undefined,
                description: product.description || undefined,
                bullets: product.bullets,
                priceAmount: product.priceAmount,
                storeLinks: product.storeLinks?.map(link => ({
                  storeName: link.storeName,
                  storeUrl: link.storeUrl,
                  storeId: link.storeId,
                  price: link.price,
                  isDefault: link.isDefault,
                })),
              }}
              showFullDetails={false}
            />
          ))}
        </div>
      </div>
    </>
  )
}

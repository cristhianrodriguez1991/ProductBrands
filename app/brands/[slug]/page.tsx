import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { BrandProductsTabs } from "@/components/brand-products-tabs"
import { getBrandFromDb } from "@/lib/brand-db"

// Category definitions with descriptions
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "Coffee": "Pods, capsules, and coffee formats ideal for offices and hospitality programs.",
  "Coffee Creamers": "Shelf-stable creamers that make it easy to keep every break room stocked.",
  "Sweeteners": "Assorted sweeteners for coffee, tea, and other beverages.",
  "Hard Candies": "Individually wrapped candies and mixes for reception bowls and snack areas.",
  "Snacks & Groceries": "Everyday pantry items and snacks suited for office and amenity spaces.",
  "Grain & Seeds": "Bulk grains and seeds for kitchens, cafes, and bulk programs.",
  "Wildlife Food": "Feed products for outdoor areas, grounds, and wildlife-friendly properties.",
  "Other": "Additional products and specialty items.",
}

export default async function DynamicBrandPage({
  params,
}: {
  params: { slug: string }
}) {
  const brand = await getBrandFromDb(params.slug)

  if (!brand) {
    notFound()
  }

  // Get all unique categories from the brand's products
  const categorySet = new Set<string>()
  brand.products.forEach((p) => {
    if (p.category) categorySet.add(p.category)
  })
  // Also include children's products
  brand.children?.forEach((child) => {
    child.products.forEach((p) => {
      if (p.category) categorySet.add(p.category)
    })
  })

  // Build category list with descriptions
  const categories = Array.from(categorySet).map((cat) => ({
    id: cat,
    title: cat,
    description: CATEGORY_DESCRIPTIONS[cat] || `Explore our ${cat.toLowerCase()} products.`,
  }))

  // Combine all products from brand and children
  const allProducts = [
    ...brand.products,
    ...(brand.children?.flatMap((child) => child.products) || []),
  ]

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="pt-12">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Shop {brand.name}
              </h2>
              {brand.description && (
                <p className="text-base text-gray-600 max-w-2xl mx-auto">
                  {brand.description}
                </p>
              )}
            </div>

            <Suspense fallback={<div className="text-center py-8">Loading categories...</div>}>
              <BrandProductsTabs
                brandSlug={brand.slug}
                products={allProducts}
                categories={categories}
              />
            </Suspense>
          </div>

          <p className="mt-6 text-[11px] text-gray-500">
            Amazon product information, pricing, and availability may change at any time. Always
            refer to the live Amazon listing for the most up-to-date details.
          </p>
        </div>
      </section>
    </div>
  )
}

// Generate static params for known brands (optional, for better performance)
export async function generateStaticParams() {
  // Return empty array to make all brand pages dynamic
  // You could fetch brands from DB here for static generation
  return []
}

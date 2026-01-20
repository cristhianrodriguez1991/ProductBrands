import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { getBrandBySlug } from "@/lib/brand-catalog"
import { OfficeRoastTabs } from "@/components/office-roast-tabs"

export default function OfficeRoastPage() {
  const brand = getBrandBySlug("office-roast")

  if (!brand) {
    return null
  }

  const categories: { id: string; title: string; description: string }[] = [
    {
      id: "Coffee",
      title: "Coffee",
      description: "Pods, capsules, and coffee formats ideal for offices and hospitality programs.",
    },
    {
      id: "Coffee Creamers",
      title: "Coffee Creamers",
      description: "Shelf‑stable creamers that make it easy to keep every break room stocked.",
    },
    {
      id: "Sweeteners",
      title: "Sweeteners",
      description: "Assorted sweeteners for coffee, tea, and other beverages.",
    },
    {
      id: "Hard Candies",
      title: "Hard Candies",
      description: "Individually wrapped candies and mixes for reception bowls and snack areas.",
    },
    {
      id: "Snacks & Groceries",
      title: "Snacks & Groceries",
      description: "Everyday pantry items and snacks suited for office and amenity spaces.",
    },
    {
      id: "Grain & Seeds",
      title: "Grain & Seeds",
      description: "Bulk grains and seeds for kitchens, cafes, and bulk programs.",
    },
    {
      id: "Wildlife Food",
      title: "Wildlife Food",
      description: "Feed products for outdoor areas, grounds, and wildlife‑friendly properties.",
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Product grid based on seed data */}
          <div className="pt-12">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Shop Office Roast
              </h2>
              <p className="text-base text-gray-600 max-w-2xl mx-auto">
                Explore Office Roast products organized into clear categories for coffee programs,
                snacks, and facility stocking.
              </p>
            </div>

            <Suspense fallback={<div className="text-center py-8">Loading categories...</div>}>
              <OfficeRoastTabs brand={brand} categories={categories} />
            </Suspense>
          </div>

          {/* Disclaimer */}
          <p className="mt-6 text-[11px] text-gray-500">
            Amazon product information, pricing, and availability may change at any time. Always
            refer to the live Amazon listing for the most up‑to‑date details.
          </p>
        </div>
      </section>
    </div>
  )
}



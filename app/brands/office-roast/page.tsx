import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { CheckCircle } from "lucide-react"
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
          <p className="text-xs font-semibold tracking-[0.25em] text-blue-700 uppercase mb-3">
            Coffee Brand
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Office Roast
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-6 max-w-2xl">
            Hassle-free, crowd-pleasing coffee designed specifically for offices, co-working spaces,
            hotels, and amenity programs.
          </p>

          {/* Brand story */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6 mb-10">
            <div className="md:col-span-2 space-y-3">
              <p className="text-sm md:text-base text-gray-600">
                Office Roast focuses on consistency and ease of service. We help you roll out a
                coffee program that feels premium to employees and guests, but is simple for your
                team to manage day-to-day.
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>
                    Pods, capsules, and bulk packages optimized for break rooms and lobbies.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Equipment programs and service support available.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Predictable pricing for multi-location or multi-tenant buildings.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Packaging suitable for Amazon and subscription programs if needed.</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Product grid based on seed data */}
          <div className="border-t border-slate-200 pt-12">
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



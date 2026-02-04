"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

type DbBrand = {
  id: string
  name: string
  slug: string
  description: string | null
  categories: string[]
  children: { id: string; name: string; slug: string }[]
}

// Legacy brands that exist in the JSON file (keep these until fully migrated to DB)
const LEGACY_BRANDS = [
  {
    id: "legacy-way",
    name: "WAY",
    slug: "way",
    description: "Multi-category private label platform",
    categories: [],
    children: [],
    isLegacy: true,
  },
  {
    id: "legacy-office-roast",
    name: "Office Roast",
    slug: "office-roast",
    description: "Workplace & hospitality coffee brand",
    categories: ["Coffee", "Coffee Creamers", "Sweeteners", "Hard Candies", "Snacks & Groceries", "Grain & Seeds", "Wildlife Food"],
    children: [],
    isLegacy: true,
  },
]

export function OurBrandsMenu() {
  const [open, setOpen] = useState(false)
  const [expandedParent, setExpandedParent] = useState<string | null>(null)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  const [dbBrands, setDbBrands] = useState<DbBrand[]>([])
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement | null>(null)

  // Fetch brands from API
  useEffect(() => {
    fetch("/api/brands")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDbBrands(data)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Combine legacy brands with database brands, avoiding duplicates
  const brands = [
    ...LEGACY_BRANDS.filter(lb => !dbBrands.some(db => db.slug === lb.slug)),
    ...dbBrands,
  ]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false)
        setExpandedParent(null)
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [])

  const handleMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
    setOpen(true)
  }

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setOpen(false)
      setExpandedParent(null)
    }, 200) // Small delay to allow moving to submenu
    setHoverTimeout(timeout)
  }

  const handleMenuMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      setHoverTimeout(null)
    }
  }

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
      >
        Our Brands
        <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : "rotate-0"}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-[min(700px,85vw)] rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden"
          role="menu"
          aria-label="Our Brands"
          onMouseEnter={handleMenuMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Two-column layout: brands list on left, categories on right */}
          <div className="flex">
            {/* Left column: Brands list */}
            <div className="w-48 border-r border-slate-200">
              <div className="py-1">
                {loading ? (
                  <div className="px-3 py-2 text-sm text-slate-500">Loading...</div>
                ) : brands.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">No brands yet</div>
                ) : (
                  brands.map((brand) => {
                    const hasCategories = brand.categories.length > 0
                    const isExpanded = expandedParent === brand.slug

                    // Brands with categories are expandable
                    if (hasCategories) {
                      return (
                        <div
                          key={brand.id}
                          className="relative"
                          onMouseEnter={() => {
                            if (hoverTimeout) {
                              clearTimeout(hoverTimeout)
                              setHoverTimeout(null)
                            }
                            setExpandedParent(brand.slug)
                          }}
                        >
                          <div
                            className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer transition-colors ${
                              isExpanded
                                ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600"
                                : "hover:bg-slate-50 text-slate-900"
                            }`}
                          >
                            <span className="text-sm font-medium">{brand.name}</span>
                            <ChevronRight
                              className={`h-3.5 w-3.5 text-slate-400 transition-transform flex-shrink-0 ${
                                isExpanded ? "rotate-90 text-blue-600" : "rotate-0"
                              }`}
                            />
                          </div>
                        </div>
                      )
                    }

                    // Brands without categories - direct link
                    return (
                      <Link
                        key={brand.id}
                        href={`/brands/${brand.slug}`}
                        onClick={() => {
                          setOpen(false)
                          setExpandedParent(null)
                        }}
                        className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-slate-50 text-slate-900"
                      >
                        <span className="text-sm font-medium">{brand.name}</span>
                      </Link>
                    )
                  })
                )}
              </div>
            </div>

            {/* Right column: Categories panel */}
            <div className="flex-1 p-3 min-h-[200px]">
              {expandedParent ? (
                <div className="animate-in fade-in slide-in-from-left-2 duration-150">
                  {(() => {
                    const brand = brands.find((b) => b.slug === expandedParent)
                    if (!brand) return null

                    return (
                      <div>
                        <h3 className="text-base font-semibold text-slate-900 mb-2">
                          {brand.name}
                        </h3>
                        {brand.description && (
                          <p className="text-xs text-slate-500 mb-3">{brand.description}</p>
                        )}
                        <div className="space-y-0.5">
                          <Link
                            href={`/brands/${brand.slug}`}
                            onClick={() => {
                              setOpen(false)
                              setExpandedParent(null)
                            }}
                            className="block py-1.5 px-2.5 text-sm text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors font-medium"
                          >
                            All Products
                          </Link>
                          {brand.categories.map((category) => (
                            <Link
                              key={category}
                              href={`/brands/${brand.slug}?category=${encodeURIComponent(category)}`}
                              onClick={() => {
                                setOpen(false)
                                setExpandedParent(null)
                              }}
                              className="block py-1.5 px-2.5 text-sm text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              {category}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">
                  Hover over a brand
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



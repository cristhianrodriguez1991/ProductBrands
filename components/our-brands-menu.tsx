"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

type BrandProduct = {
  label: string
  href: string
  key: string
}

type ParentBrand = {
  name: string
  key: string
  description?: string
  products: BrandProduct[]
}

// Organized by parent brand instead of by category.
// To add a new company in the future, just add another entry here.
const parentBrands: ParentBrand[] = [
  {
    name: "WAY",
    key: "way",
    description: "Multi-category private label platform",
    products: [
      // Unified WAY page (no category split)
      { label: "WAY", href: "/brands/way", key: "way" },
    ],
  },
  {
    name: "Office Roast",
    key: "office-roast",
    description: "Workplace & hospitality coffee brand",
    products: [
      { label: "Office Roast", href: "/brands/office-roast", key: "office-roast" },
    ],
  },
]

// Office Roast categories - defined statically since we can't use getBrandBySlug in client component
const OFFICE_ROAST_CATEGORIES = [
  { id: "Coffee", title: "Coffee" },
  { id: "Coffee Creamers", title: "Coffee Creamers" },
  { id: "Sweeteners", title: "Sweeteners" },
  { id: "Hard Candies", title: "Hard Candies" },
  { id: "Snacks & Groceries", title: "Snacks & Groceries" },
  { id: "Grain & Seeds", title: "Grain & Seeds" },
  { id: "Wildlife Food", title: "Wildlife Food" },
]

export function OurBrandsMenu() {
  const [open, setOpen] = useState(false)
  const [expandedParent, setExpandedParent] = useState<string | null>(null)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  const ref = useRef<HTMLDivElement | null>(null)

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
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-amber-600 transition-colors"
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
          {/* Two-column layout: brands list on left, products on right */}
          <div className="flex">
            {/* Left column: Parent brands list */}
            <div className="w-48 border-r border-slate-200">
              <div className="py-1">
                {parentBrands.map((brand) => {
                  const isExpanded = expandedParent === brand.key
                  const isSingleProduct = brand.products.length === 1
                  
                  // Office Roast has categories, so make it expandable
                  if (brand.key === "office-roast" && OFFICE_ROAST_CATEGORIES.length > 0) {
                    return (
                      <div
                        key={brand.key}
                        className="relative"
                        onMouseEnter={() => {
                          if (hoverTimeout) {
                            clearTimeout(hoverTimeout)
                            setHoverTimeout(null)
                          }
                          setExpandedParent(brand.key)
                        }}
                      >
                        <div
                          className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer transition-colors ${
                          expandedParent === brand.key
                            ? "bg-amber-50 text-amber-600 border-r-2 border-amber-600"
                            : "hover:bg-slate-50 text-slate-900"
                          }`}
                        >
                          <span className="text-sm font-medium">{brand.name}</span>
                          <ChevronRight
                            className={`h-3.5 w-3.5 text-slate-400 transition-transform flex-shrink-0 ${
                              expandedParent === brand.key ? "rotate-90 text-amber-600" : "rotate-0"
                            }`}
                          />
                        </div>
                      </div>
                    )
                  }
                  
                  // Single product brands (other than Office Roast)
                  if (isSingleProduct) {
                    return (
                      <Link
                        key={brand.key}
                        href={brand.products[0].href}
                        onClick={() => {
                          setOpen(false)
                          setExpandedParent(null)
                        }}
                        onMouseEnter={(e) => {
                          e.stopPropagation()
                        }}
                        className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-slate-50 text-slate-900"
                      >
                        <span className="text-sm font-medium">{brand.name}</span>
                      </Link>
                    )
                  }
                  
                  // Multiple products - expandable (like WAY)
                  return (
                    <div
                      key={brand.key}
                      className="relative"
                      onMouseEnter={() => {
                        if (hoverTimeout) {
                          clearTimeout(hoverTimeout)
                          setHoverTimeout(null)
                        }
                        setExpandedParent(brand.key)
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
                })}
              </div>
            </div>

            {/* Right column: Products panel */}
            <div className="flex-1 p-3 min-h-[200px]">
              {expandedParent ? (
                <div className="animate-in fade-in slide-in-from-left-2 duration-150">
                  {(() => {
                    const brand = parentBrands.find((b) => b.key === expandedParent)
                    if (!brand) return null
                    
                    // Show categories for Office Roast
                    if (brand.key === "office-roast" && OFFICE_ROAST_CATEGORIES.length > 0) {
                      return (
                        <div>
                          <h3 className="text-base font-semibold text-slate-900 mb-2">
                            {brand.name}
                          </h3>
                          <p className="text-xs text-slate-500 mb-3">
                            Browse by category
                          </p>
                          <div className="space-y-0.5">
                            <Link
                              href="/brands/office-roast"
                              onClick={() => {
                                setOpen(false)
                                setExpandedParent(null)
                              }}
                              className="block py-1.5 px-2.5 text-sm text-slate-700 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            >
                              All Products
                            </Link>
                            {OFFICE_ROAST_CATEGORIES.map((category) => (
                              <Link
                                key={category.id}
                                href={`/brands/office-roast?category=${encodeURIComponent(category.id)}`}
                                onClick={() => {
                                  setOpen(false)
                                  setExpandedParent(null)
                                }}
                                className="block py-1.5 px-2.5 text-sm text-slate-700 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                              >
                                {category.title}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    
                    // Show products for other brands
                    return (
                      <div>
                        <h3 className="text-base font-semibold text-slate-900 mb-2">
                          {brand.name}
                        </h3>
                        <div className="space-y-0.5">
                          {brand.products.map((product) => (
                            <Link
                              key={product.key}
                              href={product.href}
                              onClick={() => {
                                setOpen(false)
                                setExpandedParent(null)
                              }}
                              className="block py-1.5 px-2.5 text-sm text-slate-700 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            >
                              {product.label}
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



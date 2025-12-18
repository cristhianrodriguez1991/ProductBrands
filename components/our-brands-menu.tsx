"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

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
      { label: "WAY Coffee", href: "/brands/way-coffee", key: "way-coffee" },
      { label: "WAY Snacks", href: "/brands/way-snacks", key: "way-snacks" },
      { label: "WAY Candy", href: "/brands/way-candy", key: "way-candy" },
    ],
  },
  {
    name: "Office Roast",
    key: "office-roast",
    description: "Workplace & hospitality coffee brand",
    products: [
      { label: "Office Roast Coffee", href: "/brands/office-roast", key: "office-roast" },
    ],
  },
]

export function OurBrandsMenu() {
  const [open, setOpen] = useState(false)
  const [expandedParent, setExpandedParent] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
      >
        Our Brands
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-3 w-[min(900px,90vw)] rounded-2xl border border-slate-200 bg-white/95 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-md p-4 md:p-5"
          role="menu"
          aria-label="Our Brands"
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
                Brand families
              </span>
              <span className="text-xs text-slate-500">
                Open a brand to see its product lines
              </span>
            </div>
            <Link
              href="/brands"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline-offset-4 hover:underline"
            >
              See all brands
            </Link>
          </div>

          {/* Parent brands as simple collapsible list (no boxes) */}
          <div className="space-y-1">
            {parentBrands.map((brand) => {
              const isExpanded = expandedParent === brand.key
              return (
                <div key={brand.key} className="py-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedParent((prev) => (prev === brand.key ? null : brand.key))
                    }
                    className="w-full flex items-center justify-between gap-3 px-1.5 py-1.5 text-left text-sm font-semibold text-slate-900 hover:text-blue-600"
                  >
                    <span>{brand.name}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-500 transition-transform ${
                        isExpanded ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="pl-4 pt-0.5 pb-1">
                      {brand.products.map((product) => (
                        <Link
                          key={product.key}
                          href={product.href}
                          onClick={() => setOpen(false)}
                          className="block py-1 text-sm text-slate-700 hover:text-blue-600 transition-colors"
                        >
                          {product.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}



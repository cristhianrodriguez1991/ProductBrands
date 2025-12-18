"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

const brandGroups = [
  {
    title: "Coffee",
    items: [
      { label: "WAY Coffee", href: "#brand-way-coffee", key: "way-coffee" },
      { label: "Office Roast", href: "#brand-office-roast", key: "office-roast" },
    ],
  },
  {
    title: "Snacks",
    items: [{ label: "WAY Snacks", href: "#brand-way-snacks", key: "way-snacks" }],
  },
  {
    title: "Candy",
    items: [{ label: "WAY Candy", href: "#brand-way-candy", key: "way-candy" }],
  },
]

export function OurBrandsMenu() {
  const [open, setOpen] = useState(false)
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
          className="absolute left-0 top-full mt-2 w-[min(900px,90vw)] rounded-2xl border border-gray-200 bg-white shadow-[0_18px_40px_rgba(0,0,0,.12)] p-4 md:p-5"
          role="menu"
          aria-label="Our Brands"
        >
          <div className="flex justify-end mb-3">
            <Link
              href="/brands"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              See All Brands
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {brandGroups.map((group) => (
              <div key={group.title}>
                <div className="text-sm font-bold text-gray-900 mb-2">
                  {group.title}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={(e) => {
                        const id = item.href.startsWith("#") ? item.href.slice(1) : undefined
                        const section = id ? document.getElementById(id) : null
                        if (section) {
                          e.preventDefault()
                          section.scrollIntoView({ behavior: "smooth", block: "start" })
                        }
                        setOpen(false)
                      }}
                      className="block rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}



"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

const customers = [
  { name: "Office Roast", nameShort: "Office Roast", logo: "/images/customers/office-roast.png" },
  { name: "WAY Coffee", nameShort: "WAY Coffee", logo: "/images/customers/Way-Coffee-.png" },
  { name: "PageMD", nameShort: "PageMD", logo: "/images/customers/pageMD.png" },
  { name: "Southern", nameShort: "Southern", logo: "/images/customers/SOUTHERN.png" },
  { name: "WAY Snacks", nameShort: "WAY Snacks", logo: "/images/customers/way-snacks.png" },
]

export function CustomerLogosCarousel() {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  if (customers.length === 0) return null

  const smoothScrollTo = (container: HTMLDivElement, target: number) => {
    const start = container.scrollLeft
    const distance = target - start
    const duration = 700
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * t) // ease-in-out
      container.scrollLeft = start + distance * eased

      if (t < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }

  const scrollBy = (direction: "left" | "right") => {
    const container = scrollRef.current
    if (!container) return

    const amount = container.clientWidth * 0.7
    const maxScroll = container.scrollWidth - container.clientWidth
    let target =
      container.scrollLeft + amount * (direction === "left" ? -1 : 1)

    if (target < 0) target = 0
    if (target > maxScroll) target = maxScroll

    smoothScrollTo(container, target)
  }

  // Auto-scroll horizontally to showcase all companies
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const interval = setInterval(() => {
      const maxScroll = container.scrollWidth - container.clientWidth
      const atEnd = container.scrollLeft >= maxScroll - 4

      if (atEnd) {
        smoothScrollTo(container, 0)
      } else {
        const amount = container.clientWidth * 0.7
        let target = container.scrollLeft + amount
        if (target > maxScroll) target = maxScroll
        smoothScrollTo(container, target)
      }
    }, 3500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full">
      {/* Left arrow */}
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollBy("left")}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border border-gray-200 hover:bg-gray-50"
      >
        <ChevronLeft className="h-5 w-5 text-gray-700" />
      </button>

      {/* Logos row */}
      <div
        ref={scrollRef}
        className="h-32 md:h-40 lg:h-48 flex items-center overflow-x-auto px-10 md:px-14 lg:px-20 gap-12 md:gap-16 lg:gap-20 scroll-smooth scrollbar-hide"
      >
        {customers.map((customer, index) => (
          <div
            key={`${customer.name}-${index}`}
            className="flex-shrink-0 relative h-24 md:h-28 lg:h-32 w-32 md:w-40 lg:w-48 flex items-center justify-center"
          >
            <Image
              src={customer.logo}
              alt={customer.name}
              width={280}
              height={120}
              className="object-contain max-h-full max-w-full w-auto h-auto"
              style={{ maxWidth: "100%", maxHeight: "100%" }}
              onError={(e) => {
                // Fallback to text if logo image is missing
                e.currentTarget.style.display = "none"
                const parent = e.currentTarget.parentElement
                if (parent && parent.querySelector("span") === null) {
                  const span = document.createElement("span")
                  span.textContent = customer.nameShort || customer.name
                  span.className =
                    "text-xs md:text-sm font-semibold text-gray-700"
                  parent.appendChild(span)
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* Right arrow */}
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollBy("right")}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md border border-gray-200 hover:bg-gray-50"
      >
        <ChevronRight className="h-5 w-5 text-gray-700" />
      </button>
    </div>
  )
}


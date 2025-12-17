"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

export function Logo({ className }: { className?: string }) {
  const [imageError, setImageError] = useState(false)

  if (imageError) {
    return <LogoText className={className} />
  }

  return (
    <Link href="/" className={`flex items-center gap-2 ${className || ""}`}>
      <Image
        src="/images/logo.png"
        alt="ProductBrands Private Label Solutions"
        width={400}
        height={120}
        className="h-16 md:h-20 lg:h-24 w-auto"
        priority
        onError={() => setImageError(true)}
      />
    </Link>
  )
}

export function LogoText({ className }: { className?: string }) {
  return (
    <Link href="/" className={`flex flex-col gap-1 ${className || ""}`}>
      <span className="text-4xl md:text-5xl lg:text-6xl font-bold">
        <span className="text-blue-700">Product</span>
        <span className="text-orange-500">Brands</span>
      </span>
      <span className="text-base md:text-lg text-gray-600 uppercase tracking-wide font-medium">
        Private Label Solutions
      </span>
    </Link>
  )
}


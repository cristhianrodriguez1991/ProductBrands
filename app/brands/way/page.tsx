import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle } from "lucide-react"
import { AmazonProductCard } from "@/components/amazon-product-card"
import { loadBrandCatalog } from "@/lib/brand-catalog"

export const metadata = {
  title: "WAY - Product Brands",
  description: "WAY is our unified private label platform across coffee, snacks, and more.",
}

export default function WayPage() {
  const catalog = loadBrandCatalog()

  const wayBrands = catalog.brands.filter((b) => b.parentSlug === "way")
  const products = wayBrands.flatMap((b) => b.products)

  // Deduplicate by ASIN + limit to 12 as requested
  const seen = new Set<string>()
  const wayProducts = products.filter((p) => {
    if (seen.has(p.asin)) return false
    seen.add(p.asin)
    return true
  })
  const top12 = wayProducts.slice(0, 12)

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <p className="text-xs font-semibold tracking-[0.25em] text-blue-700 uppercase mb-3">
            Unified Brand
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            WAY
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-6 max-w-2xl">
            One WAY brand catalog—no category split. Explore our featured products below.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6 mb-10">
            <div className="md:col-span-2 space-y-3">
              <p className="text-sm md:text-base text-gray-600">
                WAY is a unified private label platform built for Amazon, retail, and wholesale.
                We can tailor packaging, branding, and fulfillment around your channel strategy.
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Unified catalog experience (single WAY page).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Products optimized for Amazon listings and retail presentation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Custom packaging &amp; branding available.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Want a WAY private label program?
              </h2>
              <p className="text-xs text-gray-600">
                Tell us what you want to sell and where—you&apos;ll get a tailored proposal.
              </p>
              <Link href="/quote">
                <Button className="w-full mb-2 flex items-center justify-center gap-2">
                  Start a WAY project
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <p className="text-[11px] text-gray-500">
                This page shows 12 featured products. We can add more anytime.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-12">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                WAY Products
              </h2>
              <p className="text-base text-gray-600 max-w-2xl mx-auto">
                Featured selection from the unified WAY catalog.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {top12.map((product) => (
                <AmazonProductCard
                  key={product.asin}
                  product={{
                    asin: product.asin,
                    amazonUrl: product.amazonUrl,
                    title: product.title,
                    imageUrl: product.imageUrl,
                    description: product.description,
                    bullets: product.bullets,
                  }}
                  showFullDetails={false}
                />
              ))}
            </div>
          </div>

          <p className="mt-6 text-[11px] text-gray-500">
            Amazon product information, pricing, and availability may change at any time. Always
            refer to the live Amazon listing for the most up‑to‑date details.
          </p>
        </div>
      </section>
    </div>
  )
}



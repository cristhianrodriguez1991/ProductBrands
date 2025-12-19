import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle } from "lucide-react"
import { getBrandBySlug } from "@/lib/brand-catalog"
import { AmazonProductCard } from "@/components/amazon-product-card"

export const metadata = {
  title: "WAY Coffee - Product Brands",
  description:
    "WAY Coffee is our flagship private label coffee line for cafés, offices, hotels, and retail.",
}

export default function WayCoffeePage() {
  const brand = getBrandBySlug("way-coffee")

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <p className="text-xs font-semibold tracking-[0.25em] text-blue-700 uppercase mb-3">
            Coffee Brand
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            WAY Coffee
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-6 max-w-2xl">
            Rich, aromatic private label coffees designed for cafés, offices, hotels, and retail
            shelves—roasted and packaged to match your brand.
          </p>

          {/* Brand story */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6 mb-10">
            <div className="md:col-span-2 space-y-3">
              <p className="text-sm md:text-base text-gray-600">
                With WAY Coffee, you can launch or upgrade a full coffee program under your own
                brand. We support everything from everyday house blends to limited seasonal
                releases, all with consistent quality and reliable supply.
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Multiple roast profiles: light, medium, dark, espresso, and cold brew.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Formats including whole bean, ground, pods, and portion packs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Custom packaging ready for Amazon FBA, retail, and foodservice.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Quality control with cupping, consistency checks, and full traceability.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Ready to explore WAY Coffee for your brand?
              </h2>
              <p className="text-xs text-gray-600">
                Share a bit about your channels and volumes, and we&apos;ll propose a tailored WAY
                Coffee program.
              </p>
              <Link href="/quote">
                <Button className="w-full mb-2 flex items-center justify-center gap-2">
                  Start a WAY Coffee project
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <p className="text-[11px] text-gray-500">
                We align packaging and product formats to match Amazon, retail, and wholesale
                requirements.
              </p>
            </div>
          </div>

          {/* Product grid based on seed data */}
          <div className="border-t border-slate-200 pt-12">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Shop WAY Coffee
              </h2>
              <p className="text-base text-gray-600 max-w-2xl mx-auto">
                Discover our premium coffee collection. Each product is crafted for exceptional flavor and quality.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {brand?.products.map((product) => (
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



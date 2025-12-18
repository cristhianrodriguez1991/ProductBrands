import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle } from "lucide-react"

export const metadata = {
  title: "WAY Candy - Product Brands",
  description:
    "WAY Candy is a playful private label candy program for everyday, seasonal, and gifting occasions.",
}

export default function WayCandyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <p className="text-xs font-semibold tracking-[0.25em] text-blue-700 uppercase mb-3">
            Candy Brand
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            WAY Candy
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-6 max-w-2xl">
            Nostalgic favorites and modern confections under your brand name—perfect for everyday
            snacking, seasonal programs, and gifting.
          </p>

          {/* Brand story */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6 mb-10">
            <div className="md:col-span-2 space-y-3">
              <p className="text-sm md:text-base text-gray-600">
                WAY Candy lets you create a full candy range—from gummies and chocolates to seasonal
                assortments—customized to your customers, price points, and channels.
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Everyday gummies, chocolates, and hard candies.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Seasonal and limited-time gift assortments.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Custom shapes, colors, and flavor profiles for your brand.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Gift-ready packaging and multipacks for Amazon and retail.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">
                WAY Candy products are coming soon
              </h2>
              <p className="text-xs text-gray-600">
                We&apos;re finalizing the first wave of WAY Candy products. Be the first to know
                when they launch.
              </p>
              <Link href="/quote">
                <Button className="w-full mb-2 flex items-center justify-center gap-2">
                  Talk to us about WAY Candy
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <p className="text-[11px] text-gray-500">
                Share your target channels and price points, and we&apos;ll design a launch plan
                around your candy program.
              </p>
            </div>
          </div>

          {/* Empty state / coming soon */}
          <div className="border-t border-slate-200 pt-8">
            <div className="max-w-md text-center mx-auto">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                Product catalog syncing soon
              </p>
              <p className="text-xs text-gray-600 mb-4">
                WAY Candy listings will appear here once they&apos;re live on Amazon and synced into
                your catalog.
              </p>
              <Link href="/contact">
                <Button size="sm" className="text-xs px-4 py-2">
                  Get notified about WAY Candy
                </Button>
              </Link>
              <p className="mt-3 text-[11px] text-gray-500">
                Amazon product information, pricing, and availability may change at any time. Always
                refer to the live Amazon listing for the most up‑to‑date details.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}



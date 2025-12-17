import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"

export const metadata = {
  title: "Pricing - Product Brands",
  description: "Transparent pricing structure for private label services",
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">
              Pricing
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Transparent pricing structure tailored to your needs
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Details */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            <Card className="border-2 bg-white">
              <CardHeader>
                <CardTitle className="text-2xl">Setup Fee</CardTitle>
                <CardDescription className="text-base">
                  One-time fee to cover project setup, sourcing, and initial coordination
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  Setup fees vary based on project complexity and services required. Typically ranges from $500 - $5,000 depending on:
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Number of SKUs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Custom branding requirements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Compliance needs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Supplier complexity</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 bg-white">
              <CardHeader>
                <CardTitle className="text-2xl">Per Unit Pricing</CardTitle>
                <CardDescription className="text-base">
                  Cost per unit includes product, packaging, labeling, and assembly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  Unit pricing is determined by:
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Product category and specifications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Packaging type and materials</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Labeling and branding requirements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Quantity ordered</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 bg-white">
              <CardHeader>
                <CardTitle className="text-2xl">Volume Tiers</CardTitle>
                <CardDescription className="text-base">
                  Better pricing at higher volumes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold text-lg mb-2">Tier 1: 1,000 - 4,999 units</h4>
                    <p className="text-sm text-gray-600">Standard pricing</p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-semibold text-lg mb-2">Tier 2: 5,000 - 24,999 units</h4>
                    <p className="text-sm text-gray-600">5-10% discount</p>
                  </div>
                  <div className="border-l-4 border-orange-500 pl-4">
                    <h4 className="font-semibold text-lg mb-2">Tier 3: 25,000+ units</h4>
                    <p className="text-sm text-gray-600">10-15% discount + custom terms</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 bg-white">
              <CardHeader>
                <CardTitle className="text-2xl">Additional Services</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>Fulfillment:</strong> Storage + pick/pack fees (quoted separately)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>Rush orders:</strong> Additional 15-25% surcharge</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>Design services:</strong> $500 - $2,000 per design</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>Compliance certification:</strong> Varies by requirement</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Get a Custom Quote</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
            Every project is unique. Request a detailed quote tailored to your specific needs.
          </p>
          <Link href="/quote">
            <Button size="lg" variant="secondary" className="text-base px-8 py-6">
              Request a Quote
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

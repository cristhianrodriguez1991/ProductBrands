import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"

export const metadata = {
  title: "Terms of Service - Product Brands",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">
              Terms of Service
            </h1>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            <div className="space-y-6 text-gray-700">
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">1. Services</h2>
                <p>
                  Product Brands provides private label sourcing, branding, packaging, and fulfillment services.
                  All services are subject to separate agreements and quotes.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">2. Orders and Payments</h2>
                <p>
                  Orders are subject to acceptance and availability. Payment terms are specified in individual quotes.
                  Deposits are typically required before production begins.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">3. Intellectual Property</h2>
                <p>
                  You retain ownership of your brand and intellectual property. Product Brands retains rights to
                  our processes, methodologies, and proprietary information.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">4. Limitation of Liability</h2>
                <p>
                  Product Brands' liability is limited to the value of the specific order. We are not liable for
                  indirect, consequential, or incidental damages.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">5. Contact</h2>
                <p>
                  For questions about these Terms, please contact us at info@productbrands.com.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

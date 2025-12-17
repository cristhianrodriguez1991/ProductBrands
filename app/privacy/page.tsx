import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"

export const metadata = {
  title: "Privacy Policy - Product Brands",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">
              Privacy Policy
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
                <h2 className="text-2xl font-bold mb-4 text-gray-900">1. Information We Collect</h2>
                <p>
                  We collect information you provide directly, including name, email, company information,
                  and project details. We also collect usage data through cookies and analytics.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">2. How We Use Your Information</h2>
                <p>
                  We use your information to provide services, communicate with you, process orders,
                  and improve our services. We do not sell your personal information.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">3. Data Security</h2>
                <p>
                  We implement appropriate security measures to protect your information. However,
                  no method of transmission over the internet is 100% secure.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">4. Your Rights</h2>
                <p>
                  You have the right to access, update, or delete your personal information.
                  Contact us at info@productbrands.com to exercise these rights.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">5. Contact</h2>
                <p>
                  For questions about this Privacy Policy, please contact us at info@productbrands.com.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

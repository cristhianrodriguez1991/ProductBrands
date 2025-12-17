import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"

export const metadata = {
  title: "FAQ - Product Brands",
  description: "Frequently asked questions about our private label services",
}

const faqs = [
  {
    question: "What is a private label product?",
    answer: "A private label product is manufactured by a third party but sold under your brand name. You control the branding, packaging, and marketing while we handle sourcing, production, and fulfillment.",
  },
  {
    question: "What categories do you work with?",
    answer: "We're category-agnostic and work across all industries including food & beverage, beauty, home goods, office supplies, pet products, electronics accessories, apparel, and more.",
  },
  {
    question: "What is the minimum order quantity?",
    answer: "Minimum order quantities vary by product category and supplier. Typically, we can work with orders as low as 1,000 units, though larger quantities often result in better pricing.",
  },
  {
    question: "How long does it take to launch a product?",
    answer: "Timeline depends on product complexity, but typically ranges from 6-12 weeks from quote acceptance to first shipment. This includes sourcing, sampling, branding, production, and quality control.",
  },
  {
    question: "Do you handle compliance and certifications?",
    answer: "Yes, we provide guidance on compliance requirements including FDA regulations, product safety standards, labeling requirements, and import/export documentation. We can also coordinate certifications.",
  },
  {
    question: "Can I see samples before placing an order?",
    answer: "Absolutely. We coordinate sample production and review as part of our standard process. You'll have the opportunity to approve samples before full production begins.",
  },
  {
    question: "What payment terms do you offer?",
    answer: "Typically, we require a deposit (30-50%) to begin production, with the balance due before shipment. For established clients, we may offer net terms. Payment terms are outlined in your quote.",
  },
  {
    question: "Do you offer fulfillment services?",
    answer: "Yes, we provide end-to-end fulfillment including warehousing, pick and pack, shipping coordination, and tracking. This can be integrated with your e-commerce platform.",
  },
  {
    question: "Can I reorder the same products?",
    answer: "Yes, once we've established your product specifications, reorders are streamlined. You can place reorders through your client portal with faster turnaround times.",
  },
  {
    question: "What if I need to make changes to my order?",
    answer: "Changes can typically be accommodated depending on the production stage. We'll work with you to find the best solution. Rush changes may incur additional fees.",
  },
]

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">
              Frequently Asked Questions
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Common questions about our services and process
            </p>
          </div>
        </div>
      </section>

      {/* FAQ List */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, idx) => (
              <Card key={idx} className="border-2 bg-white hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Still have questions?</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
            Contact us and we'll be happy to help.
          </p>
          <Link href="/contact">
            <Button size="lg" variant="secondary" className="text-base px-8 py-6 text-black">
              Contact Us
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

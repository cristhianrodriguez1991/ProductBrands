import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Users, Award } from "lucide-react"
import { Navbar } from "@/components/navbar"

export const metadata = {
  title: "Portfolio - Product Brands",
  description: "Case studies and success stories from our clients",
}

const caseStudies = [
  {
    title: "WAY Coffee",
    category: "Food & Beverage",
    icon: Package,
    description: "Launched a complete private label coffee line with custom branding, packaging, and fulfillment in 8 weeks. Successfully scaled from initial order of 5,000 units to 50,000+ units annually.",
    results: [
      "8-week launch timeline",
      "Custom packaging design",
      "Multi-SKU product line",
      "Ongoing fulfillment partnership",
    ],
  },
  {
    title: "Office Roast",
    category: "B2B Coffee",
    icon: Users,
    description: "Developed and fulfilled a B2B coffee subscription service with custom packaging and branding. Handles monthly fulfillment of 10,000+ units with automated ordering.",
    results: [
      "B2B subscription model",
      "Custom corporate branding",
      "Monthly fulfillment",
      "Automated ordering system",
    ],
  },
  {
    title: "WAY Snacks",
    category: "Food & Snacks",
    icon: Award,
    description: "Sourced, branded, and packaged a complete line of healthy snacks with compliance certification. Successfully launched 12 SKUs across multiple categories.",
    results: [
      "12 SKU product line",
      "FDA compliance",
      "Custom label design",
      "Multi-category expansion",
    ],
  },
  {
    title: "Premium Pet Treats",
    category: "Pet Products",
    icon: Package,
    description: "Launched a premium pet treat line with custom packaging and labeling. Achieved organic certification and scaled to national distribution.",
    results: [
      "Organic certification",
      "Custom packaging",
      "National distribution",
      "Quality assurance program",
    ],
  },
  {
    title: "Beauty Essentials",
    category: "Beauty & Personal Care",
    icon: Award,
    description: "Developed a complete skincare line with custom formulation, packaging, and labeling. Successfully launched in retail and e-commerce channels.",
    results: [
      "Custom formulations",
      "Retail-ready packaging",
      "E-commerce fulfillment",
      "Brand guidelines",
    ],
  },
  {
    title: "Tech Accessories",
    category: "Electronics",
    icon: Package,
    description: "Sourced and branded a line of tech accessories with custom packaging. Achieved rapid scale from 1,000 to 100,000+ units.",
    results: [
      "Rapid scaling",
      "Custom packaging",
      "Quality control",
      "International shipping",
    ],
  },
]

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">
              Case Studies
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Real results from our clients across various industries
            </p>
          </div>
        </div>
      </section>

      {/* Case Studies Grid */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {caseStudies.map((study) => {
              const Icon = study.icon
              return (
                <Card key={study.title} className="hover:shadow-xl transition-shadow border-2 bg-white">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{study.title}</CardTitle>
                        <CardDescription>{study.category}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{study.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {study.results.map((result, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded font-medium">
                          {result}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Start Your Success Story</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
            Join hundreds of brands that have successfully launched with us.
          </p>
          <Link href="/quote">
            <Button size="lg" variant="secondary" className="text-base px-8 py-6">
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

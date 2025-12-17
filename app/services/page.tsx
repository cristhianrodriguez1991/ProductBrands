import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Tag, Truck, Shield, FileText, CheckCircle } from "lucide-react"
import { Navbar } from "@/components/navbar"

export const metadata = {
  title: "Private Label - Product Brands",
  description: "Comprehensive private label services including sourcing, branding, packaging, and fulfillment",
}

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">
              Private Label
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              End-to-end private label solutions for businesses of all sizes
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="bg-white hover:shadow-lg transition-shadow border-2 hover:border-blue-500">
              <CardHeader className="text-center pb-4">
                <div className="h-20 w-20 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Package className="h-10 w-10 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Private Label Sourcing</CardTitle>
                <CardDescription className="text-base">
                  Find and vet suppliers for your product category
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Supplier vetting and qualification
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Quality assurance
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Cost negotiation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Sample coordination
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white hover:shadow-lg transition-shadow border-2 hover:border-orange-500">
              <CardHeader className="text-center pb-4">
                <div className="h-20 w-20 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Tag className="h-10 w-10 text-orange-600" />
                </div>
                <CardTitle className="text-xl">Branding & Labeling</CardTitle>
                <CardDescription className="text-base">
                  Custom branding and label design services
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Logo design
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Label design and printing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Brand guidelines
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Compliance labeling
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white hover:shadow-lg transition-shadow border-2 hover:border-green-500">
              <CardHeader className="text-center pb-4">
                <div className="h-20 w-20 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Package className="h-10 w-10 text-green-600" />
                </div>
                <CardTitle className="text-xl">Packaging & Assembly</CardTitle>
                <CardDescription className="text-base">
                  Professional packaging solutions
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Custom packaging design
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Product assembly
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Kitting services
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Quality control
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white hover:shadow-lg transition-shadow border-2 hover:border-purple-500">
              <CardHeader className="text-center pb-4">
                <div className="h-20 w-20 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Truck className="h-10 w-10 text-purple-600" />
                </div>
                <CardTitle className="text-xl">Fulfillment</CardTitle>
                <CardDescription className="text-base">
                  End-to-end order fulfillment
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Warehousing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Pick and pack
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Shipping coordination
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Tracking and updates
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white hover:shadow-lg transition-shadow border-2 hover:border-blue-500">
              <CardHeader className="text-center pb-4">
                <div className="h-20 w-20 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-10 w-10 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Compliance Guidance</CardTitle>
                <CardDescription className="text-base">
                  Regulatory compliance support
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    FDA compliance (food, supplements)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Product safety standards
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Labeling requirements
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Import/export documentation
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white hover:shadow-lg transition-shadow border-2 hover:border-orange-500">
              <CardHeader className="text-center pb-4">
                <div className="h-20 w-20 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-10 w-10 text-orange-600" />
                </div>
                <CardTitle className="text-xl">Project Management</CardTitle>
                <CardDescription className="text-base">
                  Dedicated project coordination
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Single point of contact
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Timeline management
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Status updates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Issue resolution
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
            Get a free quote today and see how we can help with your private label needs.
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

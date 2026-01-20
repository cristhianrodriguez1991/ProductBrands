import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, CheckCircle, Package, Tag, Truck, Shield, Factory, Award, Globe, Users } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { CustomerLogosCarousel } from "@/components/customer-logos"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />

      {/* Hero Section - Clean and Product-Focused */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center max-w-7xl mx-auto">
            {/* Left Column - Text Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900">
                Custom Private Label Products
                <span className="block text-blue-600 mt-2">Manufacturer & Supplier</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0">
                We help brands of all sizes grow with the highest quality private label products—sourcing, branding, packaging, and fulfillment solutions across any category.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
                <Link href="/quote">
                  <Button size="lg" className="text-base px-8 py-6">
                    Request a Quote
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="text-base px-8 py-6">
                    Contact Us
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Column - Hero Image */}
            <div className="w-full rounded-lg overflow-hidden shadow-xl">
              <Image
                src="/images/hero/private-label-hero.jpg"
                alt="Private Label Products Manufacturing"
                width={800}
                height={600}
                className="w-full h-auto object-cover rounded-lg"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges - Prominent */}
      <section className="bg-white border-y py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center">
              <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-1">25+</div>
              <div className="text-sm text-gray-600">Years Experience</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-1">500+</div>
              <div className="text-sm text-gray-600">Products Launched</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl md:text-4xl font-bold text-green-600 mb-1">50+</div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-1">98%</div>
              <div className="text-sm text-gray-600">Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Services/Products Grid */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Our Services</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Complete private label solutions from sourcing to fulfillment
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white hover:shadow-lg transition-shadow border-2 hover:border-blue-500">
              <CardHeader className="text-center pb-4">
                <div className="h-20 w-20 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Package className="h-10 w-10 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Sourcing</CardTitle>
                <CardDescription className="text-base">
                  Find and vet suppliers for your products
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm text-gray-600 text-center">
                  <li>• Supplier vetting</li>
                  <li>• Quality assurance</li>
                  <li>• Cost negotiation</li>
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
                  Custom branding and label design
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm text-gray-600 text-center">
                  <li>• Logo design</li>
                  <li>• Label printing</li>
                  <li>• Brand guidelines</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white hover:shadow-lg transition-shadow border-2 hover:border-green-500">
              <CardHeader className="text-center pb-4">
                <div className="h-20 w-20 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Package className="h-10 w-10 text-green-600" />
                </div>
                <CardTitle className="text-xl">Packaging</CardTitle>
                <CardDescription className="text-base">
                  Professional packaging solutions
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm text-gray-600 text-center">
                  <li>• Custom design</li>
                  <li>• Product assembly</li>
                  <li>• Quality control</li>
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
                <ul className="space-y-2 text-sm text-gray-600 text-center">
                  <li>• Warehousing</li>
                  <li>• Pick & pack</li>
                  <li>• Shipping</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Customers / Logos Slider */}
      <section className="py-16 md:py-20 bg-white border-t">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto mb-10 text-center">
            <span className="text-[10px] md:text-xs font-semibold tracking-[0.3em] text-slate-500 uppercase">
              brands we&apos;ve worked with
            </span>
            <div className="mt-2 text-3xl md:text-4xl lg:text-5xl font-semibold text-slate-900 tracking-[0.12em] uppercase">
              Customers
            </div>
            <h2 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-[0.18em] text-slate-100 uppercase select-none">
              PRIVATE LABEL
            </h2>
          </div>
          <CustomerLogosCarousel />
        </div>
      </section>

      {/* Brand Sections for Our Brands mega menu anchors */}
      <section className="py-16 md:py-20 bg-white border-t">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Explore Our Signature Brands
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From bold coffees to indulgent snacks and sweets, we build private label brands
              that your customers remember.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* WAY Coffee - detailed product section */}
            <div
              id="brand-way-coffee"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">WAY Coffee</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Rich, aromatic coffee blends crafted for cafés, hotels, offices, and retail
                  shelves.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 mb-4">
                  <li>Single-origin and blended coffees</li>
                  <li>Ground, whole bean, and capsule formats</li>
                  <li>Custom roast profiles &amp; flavor infusions</li>
                  <li>Packaging ready for Amazon FBA and retail</li>
                </ul>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="https://www.amazon.com/s?k=WAY+Coffee"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  View WAY Coffee on Amazon
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
                <Link href="/quote">
                  <Button variant="outline" size="sm" className="text-xs">
                    Start a WAY Coffee project
                  </Button>
                </Link>
              </div>
            </div>

            {/* Office Roast - detailed product section */}
            <div
              id="brand-office-roast"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">Office Roast</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Effortless coffee programs that turn every break room into a café experience.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 mb-4">
                  <li>Pods, capsules, and bulk formats for offices and hospitality</li>
                  <li>Equipment programs &amp; service support</li>
                  <li>Branded accessories and counter displays</li>
                  <li>Subscription-ready packaging for Amazon and DTC</li>
                </ul>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="https://www.amazon.com/s?k=Office+Roast+Coffee"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  View Office Roast on Amazon
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
                <Link href="/quote">
                  <Button variant="outline" size="sm" className="text-xs">
                    Start an Office Roast project
                  </Button>
                </Link>
              </div>
            </div>

            {/* WAY Snacks - detailed product section */}
            <div
              id="brand-way-snacks"
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">WAY Snacks</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Better-for-you and indulgent snacks designed to stand out on shelf and online.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 mb-4">
                  <li>Chips, nuts, bars, and trail mixes</li>
                  <li>Clean-label and functional ingredient options</li>
                  <li>Single-serve and family-size packaging</li>
                  <li>Retail, vending, and Amazon-ready case packs</li>
                </ul>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="https://www.amazon.com/s?k=WAY+Snacks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  View WAY Snacks on Amazon
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
                <Link href="/quote">
                  <Button variant="outline" size="sm" className="text-xs">
                    Start a WAY Snacks project
                  </Button>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Why Choose Us - Factory/Company Info */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Top-class Service</h2>
              <p className="text-lg text-gray-600">
                Your Trusted Private Label Partner & Supplier
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="text-center bg-white">
                <CardHeader>
                  <Factory className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                  <CardTitle>Self-owned Facilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Modern production facilities with quality control at every step
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center bg-white">
                <CardHeader>
                  <Shield className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <CardTitle>Certified & Compliant</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    FDA, ISO, and regulatory compliance for all product categories
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center bg-white">
                <CardHeader>
                  <Globe className="h-12 w-12 mx-auto mb-4 text-orange-600" />
                  <CardTitle>Global Reach</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Serving clients worldwide with reliable shipping and support
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="bg-white rounded-lg p-8 border-2">
              <p className="text-gray-700 text-center leading-relaxed">
                Being one of the most equipped private label manufacturers, we offer our clients the best quality products at competitive prices. Our streamlined processes ensure on-time delivery and consistent quality, helping you deliver the value your products need, on-time and on-budget.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Made Easy Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">Custom Made Easy</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              As an experienced private label manufacturer, we offer one-stop custom solutions for brand owners, manufacturers, suppliers and wholesalers. We walk the journey with you to ensure that we help you better define what you want and realize your brand's perfect packaging solutions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="h-16 w-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">One-stop Service</h3>
                <p className="text-sm text-gray-600">Complete solutions from concept to delivery</p>
              </div>
              <div className="text-center">
                <div className="h-16 w-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Factory className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Advanced Facilities</h3>
                <p className="text-sm text-gray-600">Modern production and quality control</p>
              </div>
              <div className="text-center">
                <div className="h-16 w-16 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Tag className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="font-semibold mb-2">Competitive Pricing</h3>
                <p className="text-sm text-gray-600">Best value for your investment</p>
              </div>
            </div>
            <Link href="/quote">
              <Button size="lg" className="text-base px-8 py-6">
                Contact Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-sm text-gray-500 mt-4">
              Share your custom needs and artwork design, our one-to-one packaging expert will send you quotation within 12 hours.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Your Project?</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
            Get a free quote today and see how we can help bring your private label vision to life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/quote">
              <Button size="lg" variant="secondary" className="text-base px-8 py-6">
                Request a Quote
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="text-base px-8 py-6 border-white text-black hover:bg-white hover:text-blue-600">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">ProductBrands</h3>
              <p className="text-sm text-gray-600">
                Custom private label manufacturer and supplier. Helping brands grow with quality products and packaging solutions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Products & Services</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/services" className="hover:text-primary">Sourcing</Link></li>
                <li><Link href="/services" className="hover:text-primary">Branding</Link></li>
                <li><Link href="/services" className="hover:text-primary">Packaging</Link></li>
                <li><Link href="/services" className="hover:text-primary">Fulfillment</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/process" className="hover:text-primary">Our Process</Link></li>
                <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
                <li><Link href="/faq" className="hover:text-primary">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/quote" className="hover:text-primary">Get a Quote</Link></li>
                <li><Link href="/terms" className="hover:text-primary">Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-primary">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-gray-600">
            © {new Date().getFullYear()} ProductBrands. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
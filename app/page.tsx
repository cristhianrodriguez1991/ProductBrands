"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, CheckCircle, Package, Tag, Truck, Shield, Factory, Award, Globe, Users } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { CustomerLogosCarousel } from "@/components/customer-logos"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />


      {/* Hero Section - Banner Image */}
      <section className="relative w-full pt-12 pb-4 md:pt-16 md:pb-6 overflow-hidden">
        <div className="w-full">
          <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px]">
            <Image
              src="/images/hero/pivate-label-hero.jpg"
              alt="Custom Private Label Products Manufacturer & Supplier"
              fill
              className="object-cover object-center w-full h-full"
              priority
              quality={90}
              unoptimized
            />
          </div>
        </div>
      </section>

      {/* Transition Element */}
      <div className="relative h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent w-full my-2"></div>

      {/* Private Label Products - Staggered Layout */}
      <section className="pt-2 pb-12 md:pb-16 bg-white w-full">
        <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="text-center mb-4 mt-8 md:mt-12">
            <div className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-2 inline-flex items-baseline gap-2">
              <span className="text-blue-600 inline-block opacity-0 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>You Design.</span>
              <span className="text-orange-500 inline-block opacity-0 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>We Make.</span>
            </div>
          </div>

          {/* Product 1 - Text Left, Image Right */}
          <motion.div 
            className="mb-12 md:mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 items-center">
              {/* Text Content */}
              <motion.div 
                className="order-2 lg:order-1 lg:col-span-2 p-4 lg:p-6"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <h3 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900 uppercase tracking-wide">
                  Custom Pillow Bags
                </h3>
                <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-4">
                  We offer ready-to-use pillow-style bags that can be customized with your brand and product. These bags are perfect for snacks, nuts, coffee, candy, pet treats, and many other dry products.
                </p>
                <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-4">
                  We handle the packaging so you can focus on growing your brand—simple, reliable, and designed to scale as you grow.
                </p>
                <p className="text-base md:text-lg text-gray-700 font-semibold leading-relaxed">
                  You choose the product. We package it with your brand.
                </p>
              </motion.div>
              {/* Image */}
              <motion.div 
                className="order-1 lg:order-2 lg:col-span-3 relative h-[400px] md:h-[450px] lg:h-[500px] rounded-lg overflow-hidden bg-white p-4 lg:p-6"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Image
                  src="/images/products/Product1.png"
                  alt="Custom Pillow Bags - Private Label Packaging"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </motion.div>
            </div>
          </motion.div>

          {/* Product 2 - Image Left, Text Right (Staggered) */}
          <motion.div 
            className="mb-12 md:mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 items-center">
              {/* Image */}
              <motion.div 
                className="lg:col-span-3 relative h-[300px] md:h-[350px] lg:h-[400px] rounded-lg overflow-hidden bg-white p-4 lg:p-6"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Image
                  src="/images/products/Product2.png"
                  alt="Stand-Up Pouches (Doypack Bags) - Private Label Packaging"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </motion.div>
              {/* Text Content */}
              <motion.div 
                className="lg:col-span-2 p-4 lg:p-6"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <h3 className="text-2xl md:text-3xl font-bold mb-3 text-gray-900 uppercase tracking-wide">
                  Stand-Up Pouches (Doypack Bags)
                </h3>
                <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-3">
                  We offer stand-up pouch bags (Doypack) with zipper and non-zipper options, designed to showcase your brand with a premium look. These bags are ideal for snacks, coffee, powders, supplements, pet food, and many other products.
                </p>
                <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-3">
                  Doypack bags stand upright on shelves, offer great product visibility, and can include features like resealable zippers or clear windows—making them perfect for both retail and online sales.
                </p>
                <p className="text-base md:text-lg text-gray-700 font-semibold leading-relaxed">
                  Modern packaging. Flexible options. Your brand in front.
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Product 3 - Text Left, Image Right */}
          <motion.div 
            className="mb-12 md:mb-16"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-center">
              {/* Text Content */}
              <motion.div 
                className="order-2 lg:order-1 lg:col-span-2 p-4 lg:p-6"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <h3 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900 uppercase tracking-wide">
                  Plastic Containers
                </h3>
                <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-4">
                  We offer plastic containers in round and square formats, designed for custom private label packaging. These containers are ideal for snacks, powders, supplements, candy, dry foods, personal care products, and more.
                </p>
                <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-4">
                  Available in multiple sizes and styles, our containers provide a clean, professional look while keeping your product protected and easy to use. Perfect for retail shelves, e-commerce, and subscription brands.
                </p>
                <p className="text-base md:text-lg text-gray-700 font-semibold leading-relaxed">
                  Simple packaging. Strong presentation. Your brand inside.
                </p>
              </motion.div>
              {/* Image */}
              <motion.div 
                className="order-1 lg:order-2 lg:col-span-3 relative h-[400px] md:h-[450px] lg:h-[500px] rounded-lg overflow-hidden bg-white p-4 lg:p-6"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Image
                  src="/images/products/Product3.png"
                  alt="Plastic Containers - Private Label Packaging"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Customers / Logos Slider */}
      <section className="py-16 md:py-20 bg-white border-t w-full">
        <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="w-full mb-10 text-center">
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

      {/* Why Choose Us - Factory/Company Info */}
      <section className="py-16 md:py-20 bg-gray-50 w-full">
        <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="w-full">
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
          <div className="w-full text-center">
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
      <section className="py-16 bg-blue-600 text-white w-full">
        <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 text-center">
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
      <footer className="border-t bg-gray-50 w-full">
        <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 py-12">
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
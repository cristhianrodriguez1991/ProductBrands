"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Factory, Shield, Globe, Package, Tag } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { CustomerLogosCarousel } from "@/components/customer-logos"
import { LenisProvider } from "@/components/lenis-provider"
import { CinematicStorytelling } from "@/components/cinematic-storytelling"

export default function Home() {
  return (
    <LenisProvider>
      <div className="flex flex-col min-h-screen bg-[#F8F9FA] text-gray-900 selection:bg-blue-600 selection:text-white">
        <Navbar />

        {/* Ultra-Premium Awwwards-Level Cinematic Storytelling Experience */}
        <CinematicStorytelling />

        {/* Transition Divider */}
        <div className="relative h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent w-full my-4" />

        {/* Private Label Products Showcase */}
        <section className="py-16 md:py-24 bg-white w-full">
          <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-blue-600 mb-2 block">
                Catalog & Solutions
              </span>
              <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight mb-4">
                You Design. <span className="text-blue-600">We Manufacture.</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Comprehensive packaging options tailored to your product category.
              </p>
            </div>

            {/* Product 1 - Custom Pillow Bags */}
            <motion.div
              className="mb-16 md:mb-24"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-center bg-gray-50/80 rounded-3xl p-6 md:p-10 border border-gray-200/80 shadow-sm">
                <div className="order-2 lg:order-1 lg:col-span-2">
                  <span className="text-xs font-mono font-semibold uppercase text-blue-600 tracking-wider mb-2 block">
                    01 // Snack & Dry Packaging
                  </span>
                  <h3 className="text-3xl font-bold mb-4 text-gray-900 tracking-tight">
                    Custom Pillow Bags
                  </h3>
                  <p className="text-base text-gray-600 leading-relaxed mb-4">
                    Ready-to-use pillow-style bags customized with your brand artwork, matte/gloss finish, and protective barrier seals. Perfect for snacks, coffee, candy, pet treats, and dry goods.
                  </p>
                  <p className="text-sm font-semibold text-gray-800 mb-6">
                    You choose the product. We package it with your brand.
                  </p>
                  <Link href="/quote">
                    <Button className="bg-gray-900 hover:bg-black text-white px-6 py-5 rounded-full">
                      Request Pillow Bag Quote
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="order-1 lg:order-2 lg:col-span-3 relative h-[350px] md:h-[420px] rounded-2xl overflow-hidden bg-white p-4">
                  <Image
                    src="/images/products/Product1.png"
                    alt="Custom Pillow Bags - Private Label Packaging"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </div>
            </motion.div>

            {/* Product 2 - Stand-Up Pouches */}
            <motion.div
              className="mb-16 md:mb-24"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-center bg-gray-50/80 rounded-3xl p-6 md:p-10 border border-gray-200/80 shadow-sm">
                <div className="lg:col-span-3 relative h-[350px] md:h-[420px] rounded-2xl overflow-hidden bg-white p-4">
                  <Image
                    src="/images/products/Product2.png"
                    alt="Stand-Up Pouches (Doypack Bags) - Private Label Packaging"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <div className="lg:col-span-2">
                  <span className="text-xs font-mono font-semibold uppercase text-orange-600 tracking-wider mb-2 block">
                    02 // Premium Retail Showcase
                  </span>
                  <h3 className="text-3xl font-bold mb-4 text-gray-900 tracking-tight">
                    Stand-Up Pouches (Doypack)
                  </h3>
                  <p className="text-base text-gray-600 leading-relaxed mb-4">
                    Resealable zipper Doypack bags designed to stand upright on retail shelves. Ideal for powders, supplements, specialty coffee, and organic foods.
                  </p>
                  <p className="text-sm font-semibold text-gray-800 mb-6">
                    Modern packaging. Flexible options. Your brand in front.
                  </p>
                  <Link href="/quote">
                    <Button className="bg-gray-900 hover:bg-black text-white px-6 py-5 rounded-full">
                      Request Doypack Quote
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Product 3 - Rigid Plastic Containers */}
            <motion.div
              className="mb-12"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-center bg-gray-50/80 rounded-3xl p-6 md:p-10 border border-gray-200/80 shadow-sm">
                <div className="order-2 lg:order-1 lg:col-span-2">
                  <span className="text-xs font-mono font-semibold uppercase text-red-600 tracking-wider mb-2 block">
                    03 // Industrial Rigid Containers
                  </span>
                  <h3 className="text-3xl font-bold mb-4 text-gray-900 tracking-tight">
                    Rigid Plastic Containers
                  </h3>
                  <p className="text-base text-gray-600 leading-relaxed mb-4">
                    Round and square plastic containers with tamper-evident seals and custom shrink-sleeve labeling. Designed for heavy-duty protection and e-commerce distribution.
                  </p>
                  <p className="text-sm font-semibold text-gray-800 mb-6">
                    Simple packaging. Strong presentation. Your brand inside.
                  </p>
                  <Link href="/quote">
                    <Button className="bg-gray-900 hover:bg-black text-white px-6 py-5 rounded-full">
                      Request Container Quote
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="order-1 lg:order-2 lg:col-span-3 relative h-[350px] md:h-[420px] rounded-2xl overflow-hidden bg-white p-4">
                  <Image
                    src="/images/products/Product3.png"
                    alt="Plastic Containers - Private Label Packaging"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Customer Logos Carousel */}
        <section className="py-16 md:py-20 bg-[#F8F9FA] border-t border-b border-gray-200/80 w-full">
          <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-7xl mx-auto">
            <div className="w-full mb-10 text-center">
              <span className="text-xs font-mono font-semibold tracking-[0.3em] text-gray-500 uppercase">
                Trusted Manufacturing Partner
              </span>
              <div className="mt-2 text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                Brands We Work With
              </div>
            </div>
            <CustomerLogosCarousel />
          </div>
        </section>

        {/* Factory Capabilities & Quality Guarantee */}
        <section className="py-20 bg-white w-full">
          <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-gray-900">
                Top-Class Manufacturing Facility
              </h2>
              <p className="text-lg text-gray-600 max-w-xl mx-auto">
                End-to-end production control from raw sourcing to final palletization.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <Card className="text-center bg-gray-50/80 border border-gray-200 p-6 rounded-2xl shadow-sm">
                <CardHeader>
                  <Factory className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                  <CardTitle className="text-xl font-bold">Self-Owned Facilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Modern high-speed production lines with strict quality assurance checkpoints.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center bg-gray-50/80 border border-gray-200 p-6 rounded-2xl shadow-sm">
                <CardHeader>
                  <Shield className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <CardTitle className="text-xl font-bold">FDA & ISO Certified</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Full regulatory compliance across food-grade, cosmetics, and supplement packaging.
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center bg-gray-50/80 border border-gray-200 p-6 rounded-2xl shadow-sm">
                <CardHeader>
                  <Globe className="h-12 w-12 mx-auto mb-4 text-orange-600" />
                  <CardTitle className="text-xl font-bold">Global Fulfillment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Direct shipping to Amazon FBA, retail distribution hubs, and global warehouses.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="py-20 bg-gray-900 text-white w-full">
          <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 text-center max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
              Ready to Launch Your Brand?
            </h2>
            <p className="text-lg md:text-xl mb-10 text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Get a custom quotation within 12 hours from our dedicated packaging experts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/quote">
                <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base rounded-full shadow-xl">
                  Request a Quote
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-gray-700 hover:bg-gray-800 text-white px-8 py-6 text-base rounded-full">
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white w-full">
          <div className="w-full px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 py-12 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="font-bold text-lg mb-4 text-gray-900">ProductBrands</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Custom private label manufacturer and packaging supplier. Transforming ideas into market-ready retail products.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-4 text-gray-900">Products & Services</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><Link href="/services" className="hover:text-blue-600">Sourcing</Link></li>
                  <li><Link href="/services" className="hover:text-blue-600">Branding</Link></li>
                  <li><Link href="/services" className="hover:text-blue-600">Packaging</Link></li>
                  <li><Link href="/services" className="hover:text-blue-600">Fulfillment</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4 text-gray-900">Company</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><Link href="/process" className="hover:text-blue-600">Our Process</Link></li>
                  <li><Link href="/contact" className="hover:text-blue-600">Contact</Link></li>
                  <li><Link href="/faq" className="hover:text-blue-600">FAQ</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4 text-gray-900">Support</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><Link href="/quote" className="hover:text-blue-600">Get a Quote</Link></li>
                  <li><Link href="/terms" className="hover:text-blue-600">Terms</Link></li>
                  <li><Link href="/privacy" className="hover:text-blue-600">Privacy</Link></li>
                </ul>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-gray-100 text-center text-sm text-gray-500">
              © {new Date().getFullYear()} ProductBrands. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </LenisProvider>
  )
}
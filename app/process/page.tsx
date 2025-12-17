"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Package, CheckCircle, Tag, Factory, Truck, ArrowRight, X, Sparkles } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { ImageSlideshow } from "@/components/image-slideshow"

const aboutSlides = [
  "/images/about/machinery1.jpg",
  "/images/about/machinery2.jpg",
  "/images/about/products1.jpg",
  "/images/about/products2.jpg",
]

const steps = [
  {
    number: 1,
    title: "Discovery",
    icon: Search,
    description: "We learn about your product vision, target market, and requirements",
    details: [
      "Initial consultation",
      "Product requirements analysis",
      "Market research",
      "Timeline planning",
    ],
    fullDescription: "During the discovery phase, we dive deep into understanding your business goals, target audience, and product vision. Our team conducts comprehensive market research to identify opportunities and challenges. We analyze competitor products, pricing strategies, and market trends to help you make informed decisions. Together, we establish clear timelines, budget expectations, and success metrics for your private label project.",
    imageUrl: "/images/process/discovery.jpg",
  },
  {
    number: 2,
    title: "Sourcing",
    icon: Package,
    description: "We identify and vet suppliers that match your specifications",
    details: [
      "Supplier identification",
      "Quality assessment",
      "Cost negotiation",
      "Sample coordination",
    ],
    fullDescription: "Our global network of verified suppliers ensures you get the best quality at competitive prices. We conduct thorough background checks, quality audits, and capability assessments. Our team negotiates favorable terms, handles all communication, and coordinates sample requests. We evaluate multiple suppliers to find the perfect match for your product specifications, budget, and quality standards.",
    imageUrl: "/images/process/sourcing.jpg",
  },
  {
    number: 3,
    title: "Samples",
    icon: CheckCircle,
    description: "Review product samples and make refinements",
    details: [
      "Sample production",
      "Quality review",
      "Refinement requests",
      "Final approval",
    ],
    fullDescription: "Before full production, we coordinate sample production to ensure everything meets your expectations. Our quality control team thoroughly inspects each sample for defects, dimensions, materials, and finish quality. We provide detailed feedback and work with suppliers to make any necessary refinements. Once you approve the samples, we proceed to full-scale production with confidence.",
    imageUrl: "/images/process/samples.jpg",
  },
  {
    number: 4,
    title: "Branding",
    icon: Tag,
    description: "Design and produce custom labels and packaging",
    details: [
      "Logo and label design",
      "Packaging design",
      "Brand guidelines",
      "Print production",
    ],
    fullDescription: "Your brand identity is crucial for market success. Our design team creates custom labels, packaging, and brand assets that reflect your vision. We develop comprehensive brand guidelines ensuring consistency across all touchpoints. From concept to print-ready files, we handle the entire branding process. Our printing partners ensure high-quality production that makes your products stand out on shelves.",
    imageUrl: "/images/process/branding.jpg",
  },
  {
    number: 5,
    title: "Production",
    icon: Factory,
    description: "Manufacture your products with quality control",
    details: [
      "Production scheduling",
      "Quality control checks",
      "Progress updates",
      "Final inspection",
    ],
    fullDescription: "During production, we maintain constant oversight to ensure quality and timely delivery. Our team schedules production runs, monitors progress, and conducts regular quality control inspections. You receive regular updates with photos and reports. Before shipment, every product undergoes final inspection to ensure it meets our strict quality standards. We handle all production logistics so you can focus on growing your business.",
    imageUrl: "/images/process/production.jpg",
  },
  {
    number: 6,
    title: "Fulfillment",
    icon: Truck,
    description: "Warehouse, pack, and ship orders to your customers",
    details: [
      "Warehousing",
      "Order processing",
      "Shipping coordination",
      "Tracking updates",
    ],
    fullDescription: "Our fulfillment services handle everything from warehousing to final delivery. We store your inventory in secure, climate-controlled facilities. When orders come in, our team picks, packs, and ships products with your custom branding. We integrate with major e-commerce platforms and provide real-time tracking updates. Whether you need dropshipping, bulk shipments, or retail distribution, we've got you covered.",
    imageUrl: "/images/process/fulfillment.jpg",
  },
]

export default function ProcessPage() {
  const [expandedStep, setExpandedStep] = useState<number | null>(null)
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)

  const toggleStep = (stepNumber: number) => {
    setExpandedStep(expandedStep === stepNumber ? null : stepNumber)
  }

  const selectedStep = steps.find((s) => s.number === expandedStep)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navbar />

      {/* About Us Hero + Story */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 to-gray-50/60"></div>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-gray-900">
                Your Private Label Manufacturing Partner
              </h1>
              <p className="text-lg md:text-xl text-gray-700 mb-5 leading-relaxed">
                For over two decades, we&apos;ve helped brands turn ideas into products on
                shelves. From the first sketch to the final shipment, our team manages every
                detail—sourcing, formulation, packaging, and fulfillment—so you can focus on
                growing your brand.
              </p>
              <p className="text-sm md:text-base text-gray-600 mb-4 leading-relaxed">
                Behind the scenes, our facilities combine modern machinery with experienced
                operators. We run small pilot batches, large-scale production, and strict
                quality checks under one roof. Whether you&apos;re launching your first product
                or scaling an established line, we adapt our process to match your needs.
              </p>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-6">
                Our team has worked with coffee roasters, cosmetic houses, food brands,
                supplement companies, and more. Every project starts with listening—then we
                build the right manufacturing, packaging, and logistics plan around your brand.
              </p>
              <div className="mt-2 flex justify-center lg:justify-start">
                <Link href="/contact">
                  <Button size="lg" className="text-base px-8 py-5">
                    Get in touch
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* About Slideshow */}
            <div className="w-full bg-gray-100 rounded-xl overflow-hidden shadow-lg border border-gray-200">
              <ImageSlideshow
                images={aboutSlides}
                autoPlay
                interval={5000}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Process Flow Section - Professional */}
      <section className="py-16 md:py-20 relative bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Our Process
            </h2>
            <p className="text-lg text-gray-600">
              Step-by-step, how we take your idea from concept to finished product.
            </p>
          </div>
          <div className="max-w-7xl mx-auto">
            {/* Desktop: Professional Horizontal Flow */}
            <div className="hidden lg:block">
              <div className="relative">
                {/* Professional Connecting Line */}
                <div className="absolute top-32 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-300 to-transparent">
                  <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-blue-500 to-blue-600 opacity-30"></div>
                </div>
                
                {/* Process Steps */}
                <div className="relative flex items-start justify-between gap-6">
                  {steps.map((step, index) => {
                    const Icon = step.icon
                    const isExpanded = expandedStep === step.number
                    const isHovered = hoveredStep === step.number
                    const isLast = index === steps.length - 1

                    return (
                      <div 
                        key={step.number} 
                        className="flex-1 flex flex-col items-center relative z-10"
                        onMouseEnter={() => setHoveredStep(step.number)}
                        onMouseLeave={() => setHoveredStep(null)}
                      >
                        {/* Professional Step Card */}
                        <div className="w-full max-w-[200px]">
                          <Card
                            className={`group cursor-pointer transition-all duration-300 border-2 shadow-lg ${
                              isExpanded
                                ? "bg-blue-600 text-white shadow-2xl scale-110 border-blue-700"
                                : isHovered
                                ? "bg-white shadow-xl scale-105 border-blue-300"
                                : "bg-white hover:shadow-xl hover:scale-105 border-gray-200"
                            }`}
                            onClick={() => toggleStep(step.number)}
                          >
                            <CardContent className="p-6 text-center relative overflow-hidden">
                              <div className={`relative z-10 w-16 h-16 mx-auto mb-4 rounded-xl ${
                                isExpanded 
                                  ? "bg-white/20 backdrop-blur-sm" 
                                  : "bg-blue-600"
                              } text-white flex items-center justify-center text-2xl font-bold shadow-lg transform group-hover:rotate-3 transition-transform duration-300`}>
                                {step.number}
                              </div>
                              <div className={`relative z-10 mb-3 ${isExpanded ? "text-white" : "text-gray-700"}`}>
                                <Icon className="h-7 w-7 mx-auto" />
                              </div>
                              <h3 className={`relative z-10 text-lg font-bold mb-2 ${isExpanded ? "text-white" : "text-gray-900"}`}>
                                {step.title}
                              </h3>
                              <p className={`relative z-10 text-xs leading-relaxed ${isExpanded ? "text-white/90" : "text-gray-600"}`}>
                                {step.description}
                              </p>
                              {isExpanded && (
                                <div className="relative z-10 mt-4 pt-3 border-t border-white/20">
                                  <span className="text-xs font-medium text-white/80">Click to close</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>

                        {/* Professional Arrow */}
                        {!isLast && (
                          <div className="absolute top-32 -right-3 z-20">
                            <ArrowRight className="h-6 w-6 text-blue-400" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Mobile/Tablet: Professional Vertical Timeline */}
            <div className="lg:hidden">
              <div className="relative">
                {/* Professional Vertical Line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 via-blue-400 to-gray-200 rounded-full">
                  <div className="absolute top-0 left-0 w-full h-full bg-blue-500 opacity-20"></div>
                </div>
                
                {/* Process Steps */}
                <div className="relative space-y-10">
                  {steps.map((step, index) => {
                    const Icon = step.icon
                    const isExpanded = expandedStep === step.number

                    return (
                      <div key={step.number} className="relative pl-20">
                        {/* Professional Step Number Circle */}
                        <div className="absolute left-0 top-0 w-16 h-16 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-xl z-10 border-4 border-white transform hover:scale-110 transition-transform">
                          {step.number}
                        </div>

                        {/* Professional Step Card */}
                        <Card
                          className={`cursor-pointer transition-all duration-300 border-2 shadow-lg ${
                            isExpanded
                              ? "bg-blue-600 text-white shadow-2xl border-blue-700"
                              : "bg-white hover:shadow-xl border-gray-200"
                          }`}
                          onClick={() => toggleStep(step.number)}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4 mb-3">
                              <div className={`p-2 rounded-lg ${
                                isExpanded ? "bg-white/20 backdrop-blur-sm" : "bg-blue-600"
                              } text-white shadow-md`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <h3 className={`text-xl font-bold mb-2 ${isExpanded ? "text-white" : "text-gray-900"}`}>
                                  {step.title}
                                </h3>
                                <p className={`text-sm leading-relaxed ${isExpanded ? "text-white/90" : "text-gray-600"}`}>
                                  {step.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Modal Overlay */}
      {selectedStep && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setExpandedStep(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-300 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Professional Header */}
            <div className="sticky top-0 bg-blue-600 text-white z-10 p-6 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center text-2xl font-bold flex-shrink-0 shadow-lg">
                  {selectedStep.number}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedStep.title}
                  </h2>
                  <p className="text-sm text-white/90 mt-1">{selectedStep.description}</p>
                </div>
              </div>
              <button
                onClick={() => setExpandedStep(null)}
                className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all flex-shrink-0"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Professional Content */}
            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Text */}
                <div className="space-y-6">
                  <div className="p-5 rounded-xl bg-gray-50 border border-gray-200">
                    <h3 className="text-base font-bold mb-3 text-gray-900 flex items-center gap-2">
                      <div className="w-1 h-6 rounded-full bg-blue-600"></div>
                      Overview
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {selectedStep.fullDescription}
                    </p>
                  </div>
                  <div className="p-5 rounded-xl bg-gray-50 border border-gray-200">
                    <h3 className="text-base font-bold mb-3 text-gray-900 flex items-center gap-2">
                      <div className="w-1 h-6 rounded-full bg-blue-600"></div>
                      Key Activities
                    </h3>
                    <ul className="space-y-2.5">
                      {selectedStep.details.map((detail, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-sm text-gray-700"
                        >
                          <div className="mt-0.5 w-5 h-5 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Right Column - Image */}
                <div className="relative h-64 md:h-80 rounded-xl overflow-hidden bg-gradient-to-br from-blue-50 to-gray-100 shadow-lg border border-gray-200">
                  <Image
                    src={selectedStep.imageUrl}
                    alt={`${selectedStep.title} process step`}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
                    <div className="text-center p-6">
                      <selectedStep.icon className="h-16 w-16 mx-auto mb-3 text-blue-600 opacity-50" />
                      <p className="text-base font-medium text-gray-700">{selectedStep.title} Image</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Add to /public/images/process/{selectedStep.title.toLowerCase()}.jpg
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professional CTA Section */}
      <section className="relative py-20 bg-gradient-to-r from-blue-600 to-blue-700 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-white">Ready to Start Your Project?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-white/90">
            Get started with a free quote and see how we can help launch your products.
          </p>
          <Link href="/quote">
            <Button size="lg" className="text-base px-8 py-6 bg-white text-blue-600 hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 font-semibold">
              Start Your Project
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

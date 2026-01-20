"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Package, Factory, Palette, Truck, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const capabilities = [
  {
    icon: Package,
    title: "Private Label",
    description: "Packaging, labeling, compliance-ready design for your brand",
    bullets: [
      "Custom packaging design",
      "FDA-compliant labeling",
      "Brand identity integration",
      "Print-ready files",
    ],
    href: "/services",
  },
  {
    icon: Factory,
    title: "Contract Manufacturing",
    description: "Blending, filling, co-packing for your product line",
    bullets: [
      "Small batch production",
      "Quality control & testing",
      "Bulk manufacturing",
      "Co-packing services",
    ],
    href: "/services",
  },
  {
    icon: Palette,
    title: "Packaging & Design",
    description: "Dielines, mockups, print-ready files delivered fast",
    bullets: [
      "3D product mockups",
      "Dieline creation",
      "Print-ready artwork",
      "Packaging optimization",
    ],
    href: "/services",
  },
  {
    icon: Truck,
    title: "Logistics & Fulfillment",
    description: "FBA prep, palletizing, multi-warehouse shipments",
    bullets: [
      "Amazon FBA prep",
      "Warehouse distribution",
      "Palletizing & shipping",
      "Multi-location fulfillment",
    ],
    href: "/services",
  },
]

export function Capabilities() {
  return (
    <section className="py-20 md:py-28 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
            Private Label & Manufacturing
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Complete solutions to launch and scale your brand
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {capabilities.map((capability, index) => {
            const Icon = capability.icon
            return (
              <motion.div
                key={capability.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full bg-white hover:shadow-xl transition-shadow border-2 hover:border-amber-200">
                  <CardHeader>
                    <div className="h-14 w-14 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-7 w-7 text-amber-600" />
                    </div>
                    <CardTitle className="text-xl mb-2">{capability.title}</CardTitle>
                    <CardDescription className="text-base">
                      {capability.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {capability.bullets.map((bullet, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-amber-600 mt-1">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={capability.href}
                      className="inline-flex items-center text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                    >
                      Learn more
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

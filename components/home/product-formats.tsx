"use client"

import { motion } from "framer-motion"
import { Package, Box, Layers, Coffee } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const formats = [
  {
    icon: Package,
    name: "Pouches",
    bestFor: "Amazon / Retail / Subscription",
    description: "Stand-up pouches, flat pouches, and custom sizes",
  },
  {
    icon: Box,
    name: "Boxes",
    bestFor: "Retail / Gifting / Premium",
    description: "Rigid boxes, folding cartons, and custom shapes",
  },
  {
    icon: Layers,
    name: "Sticks & Sachets",
    bestFor: "Offices / Hotels / Single-serve",
    description: "Portion-controlled packaging for convenience",
  },
  {
    icon: Coffee,
    name: "Pods & Capsules",
    bestFor: "Offices / Hospitality / B2B",
    description: "K-Cup compatible pods and single-serve capsules",
  },
  {
    icon: Package,
    name: "Bulk",
    bestFor: "Warehouses / Distributors / B2B",
    description: "Large format packaging for wholesale distribution",
  },
]

export function ProductFormats() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
            Product Formats
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Packaging solutions for every channel and use case
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {formats.map((format, index) => {
            const Icon = format.icon
            return (
              <motion.div
                key={format.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <Card className="h-full bg-white hover:shadow-xl transition-all border-2 hover:border-amber-200 cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className="h-16 w-16 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-8 w-8 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-gray-900">
                      {format.name}
                    </h3>
                    <p className="text-xs font-semibold text-amber-600 mb-2">
                      Best for: {format.bestFor}
                    </p>
                    <p className="text-sm text-gray-600">{format.description}</p>
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

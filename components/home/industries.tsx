"use client"

import { motion } from "framer-motion"
import { ShoppingCart, Building2, Hotel, Store } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const industries = [
  {
    icon: ShoppingCart,
    name: "Amazon Sellers",
    description: "FBA-ready products with optimized packaging for Amazon's requirements",
  },
  {
    icon: Building2,
    name: "Offices & Co-working",
    description: "Coffee, snacks, and supplies for workplace programs",
  },
  {
    icon: Hotel,
    name: "Hotels & Amenities",
    description: "Branded products for guest rooms and common areas",
  },
  {
    icon: Store,
    name: "Retail & Distributors",
    description: "Shelf-ready packaging for retail and wholesale channels",
  },
]

export function Industries() {
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
            Industries We Serve
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Private label solutions tailored to your market
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {industries.map((industry, index) => {
            const Icon = industry.icon
            return (
              <motion.div
                key={industry.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <Card className="h-full bg-white hover:shadow-xl transition-all border-2 hover:border-amber-200 cursor-pointer">
                  <CardContent className="p-8 text-center">
                    <div className="h-20 w-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Icon className="h-10 w-10 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-900">
                      {industry.name}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {industry.description}
                    </p>
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

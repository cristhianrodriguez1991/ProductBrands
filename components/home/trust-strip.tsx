"use client"

import { motion } from "framer-motion"
import { Package, Clock, Building2 } from "lucide-react"

const stats = [
  {
    icon: Package,
    value: "500+",
    label: "SKUs Produced",
    description: "Private label products launched",
  },
  {
    icon: Clock,
    value: "14-21",
    label: "Day Lead Time",
    description: "Typical production timeline",
  },
  {
    icon: Building2,
    value: "Multi",
    label: "Location Programs",
    description: "Warehouse & fulfillment support",
  },
]

export function TrustStrip() {
  return (
    <section className="py-12 md:py-16 bg-white border-y border-gray-100">
      <div className="container mx-auto px-4">
        {/* Trusted By Logos */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">
            Trusted by leading brands
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60">
            {/* Logo placeholders */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 w-32 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs"
              >
                Logo {i}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center p-6 bg-gray-50 rounded-lg border border-gray-100 hover:border-amber-200 transition-colors"
              >
                <Icon className="h-8 w-8 mx-auto mb-3 text-amber-600" />
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm font-semibold text-gray-700 mb-1">
                  {stat.label}
                </div>
                <div className="text-xs text-gray-500">{stat.description}</div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

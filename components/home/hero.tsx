"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle } from "lucide-react"

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center bg-gradient-to-b from-white via-amber-50/20 to-white">
      <div className="container mx-auto px-4 py-20 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
          {/* Left Column - Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-gray-900 leading-tight"
            >
              Private Label Brands,
              <span className="block text-amber-600 mt-2">Built Fast.</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
            >
              We help you create Amazon-ready products with packaging, production, and fulfillment—done for you.
            </motion.p>

            {/* Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-3 mb-8 justify-center lg:justify-start"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700">
                <CheckCircle className="h-4 w-4 text-amber-600" />
                Low MOQ
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700">
                <CheckCircle className="h-4 w-4 text-amber-600" />
                Fast Turnaround
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700">
                <CheckCircle className="h-4 w-4 text-amber-600" />
                Amazon-Ready
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link href="/quote">
                <Button
                  size="lg"
                  className="text-base px-8 py-6 bg-amber-600 hover:bg-amber-700 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  Get a Quote
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/services">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 py-6 border-2 border-gray-300 hover:border-amber-600 hover:text-amber-600"
                >
                  View Capabilities
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Column - Product Mockups */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative grid grid-cols-3 gap-4 p-8">
              {/* Product Mockup 1 */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="bg-white rounded-lg shadow-xl p-4 border border-gray-100"
              >
                <div className="aspect-square bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-3/4 mx-auto"></div>
              </motion.div>

              {/* Product Mockup 2 */}
              <motion.div
                animate={{
                  y: [0, -15, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
                className="bg-white rounded-lg shadow-xl p-4 border border-gray-100 mt-8"
              >
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-3/4 mx-auto"></div>
              </motion.div>

              {/* Product Mockup 3 */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
                className="bg-white rounded-lg shadow-xl p-4 border border-gray-100"
              >
                <div className="aspect-square bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-3/4 mx-auto"></div>
              </motion.div>
            </div>

            {/* Animated Glow Effect */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-amber-600/20 rounded-3xl blur-3xl -z-10"
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

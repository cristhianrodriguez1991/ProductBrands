"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Phone } from "lucide-react"

export function CTABanner() {
  return (
    <section className="py-16 md:py-20 bg-gradient-to-r from-amber-600 to-amber-700 text-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Ready to launch your brand?
          </h2>
          <p className="text-lg md:text-xl mb-8 opacity-95">
            Get a free quote or talk to a specialist about your private label project
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/quote">
              <Button
                size="lg"
                className="text-base px-8 py-6 bg-white text-amber-600 hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all"
              >
                Get a Quote
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 py-6 border-2 border-white text-white hover:bg-white/10 transition-all"
              >
                <Phone className="mr-2 h-5 w-5" />
                Talk to a Specialist
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

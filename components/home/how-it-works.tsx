"use client"

import { motion } from "framer-motion"
import { CheckCircle, ArrowRight } from "lucide-react"

const steps = [
  {
    number: "01",
    title: "Pick a Product",
    description: "Choose from our catalog or bring your own product idea",
  },
  {
    number: "02",
    title: "Choose Packaging & Branding",
    description: "Select packaging format and customize with your brand",
  },
  {
    number: "03",
    title: "We Produce & QA",
    description: "Manufacturing, quality control, and compliance checks",
  },
  {
    number: "04",
    title: "Ship to Destination",
    description: "FBA prep, warehouse, or direct to your customers",
  },
]

export function HowItWorks() {
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
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Launch your private label brand in four simple steps
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          {/* Desktop: Horizontal Timeline */}
          <div className="hidden md:block">
            <div className="relative">
              {/* Connecting Line */}
              <div className="absolute top-12 left-0 right-0 h-0.5 bg-gray-200">
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full bg-amber-600 origin-left"
                />
              </div>

              <div className="grid grid-cols-4 gap-8 relative">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.number}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.2 }}
                    className="relative"
                  >
                    {/* Step Circle */}
                    <div className="relative z-10 mb-6">
                      <div className="h-24 w-24 rounded-full bg-white border-4 border-amber-600 flex items-center justify-center mx-auto shadow-lg">
                        <span className="text-2xl font-bold text-amber-600">
                          {step.number}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="text-center">
                      <h3 className="text-xl font-bold mb-2 text-gray-900">
                        {step.title}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>

                    {/* Arrow (except last) */}
                    {index < steps.length - 1 && (
                      <div className="hidden lg:block absolute top-12 -right-4 z-20">
                        <ArrowRight className="h-6 w-6 text-amber-600" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile: Vertical Stack */}
          <div className="md:hidden space-y-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex gap-4"
              >
                <div className="flex-shrink-0">
                  <div className="h-16 w-16 rounded-full bg-amber-600 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">
                      {step.number}
                    </span>
                  </div>
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-lg font-bold mb-2 text-gray-900">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { ShoppingCart, CheckCircle2, Info, ArrowLeft, ExternalLink } from "lucide-react"

export default function ClientProductPage({ product }: { product: any }) {
  const [activeImage, setActiveImage] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const features = product.features as { title: string, description: string }[] || []
  const mediaUrls = product.mediaUrls as string[] || []
  
  if (!mounted) return null

  return (
    <div className="min-h-[100dvh] bg-black text-white selection:bg-primary selection:text-white">
      {/* Back Button (Fixed) */}
      <motion.a 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        href="/productinfo"
        className="fixed top-4 left-4 z-50 p-3 bg-black/30 backdrop-blur-md rounded-full border border-white/10 text-white shadow-lg"
      >
        <ArrowLeft className="h-5 w-5" />
      </motion.a>

      {/* Hero Media Carousel */}
      <div className="relative h-[60vh] md:h-[70vh] w-full overflow-hidden bg-zinc-900 rounded-b-[2rem] md:rounded-b-[4rem] shadow-2xl">
        <AnimatePresence mode="wait">
          {mediaUrls.length > 0 ? (
            <motion.div
              key={activeImage}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <Image
                src={mediaUrls[activeImage]}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            </motion.div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
              <span className="text-zinc-500 font-medium">No Image Available</span>
            </div>
          )}
        </AnimatePresence>

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-10 flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            {product.tagline && (
              <span className="inline-block px-3 py-1 mb-4 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 text-primary-foreground font-semibold text-xs tracking-widest uppercase">
                {product.tagline}
              </span>
            )}
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-2 text-white">
              {product.name}
            </h1>
          </motion.div>
        </div>

        {/* Carousel Indicators */}
        {mediaUrls.length > 1 && (
          <div className="absolute bottom-6 right-6 z-20 flex space-x-2">
            {mediaUrls.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${activeImage === idx ? 'w-6 bg-primary' : 'w-2 bg-white/50 hover:bg-white'}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="px-6 md:px-12 pt-8 pb-32 max-w-5xl mx-auto space-y-12">
        {/* Description Section */}
        {product.description && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <div className="flex items-center space-x-2 text-zinc-400 mb-2">
              <Info className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold tracking-wider uppercase text-zinc-300">Overview</h2>
            </div>
            <p className="text-zinc-300 leading-relaxed text-lg md:text-xl font-medium">
              {product.description}
            </p>
          </motion.section>
        )}

        {/* Features List */}
        {features && features.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            className="space-y-6 pt-4 border-t border-white/10"
          >
            <h2 className="text-lg font-semibold tracking-wider uppercase text-zinc-300 mb-6">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature: any, idx: number) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 p-6 rounded-2xl hover:bg-zinc-800/80 transition-colors"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-primary/10 rounded-full mt-1">
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                      <p className="text-zinc-400 text-base leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </main>

      {/* Floating Action Bar (Sticky Bottom) */}
      {product.actionUrl && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 200, damping: 20 }}
          className="fixed bottom-0 left-0 w-full p-4 md:p-6 z-50 pointer-events-none"
        >
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-2 md:p-3 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center justify-between">
              <div className="hidden md:block px-6">
                <span className="text-white font-medium text-lg">Interested in this product?</span>
              </div>
              <a 
                href={product.actionUrl} 
                target="_blank"
                rel="noopener noreferrer"
                className="w-full md:w-auto flex items-center justify-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground py-4 md:py-3 px-8 rounded-full font-bold text-lg shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                <span>Purchase / Contact</span>
                <ExternalLink className="h-5 w-5" />
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

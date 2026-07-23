"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Sparkles, Layers, ShieldCheck, ChevronDown, Check, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CinematicCanvas } from "@/components/cinematic-canvas"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

export function CinematicStorytelling() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pinRef = useRef<HTMLDivElement | null>(null)
  
  const [frameIndex, setFrameIndex] = useState(1)
  const [activeSection, setActiveSection] = useState(1)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [interactiveMode, setInteractiveMode] = useState(false)
  const [sliderPos, setSliderPos] = useState(50) // For interactive before/after

  const totalFrames = 294

  useEffect(() => {
    const container = containerRef.current
    const pin = pinRef.current
    if (!container || !pin) return

    const st = ScrollTrigger.create({
      trigger: container,
      start: "top top",
      end: "bottom bottom",
      pin: pin,
      scrub: 0.1, // Ultra smooth 60fps physics scrub
      onUpdate: (self) => {
        const progress = self.progress
        setScrollProgress(progress)

        // Interpolate frame index 1 to 294
        const targetFrame = 1 + progress * (totalFrames - 1)
        setFrameIndex(targetFrame)

        // Determine current narrative section (1-6)
        if (progress < 0.16) {
          setActiveSection(1)
        } else if (progress < 0.33) {
          setActiveSection(2)
        } else if (progress < 0.55) {
          setActiveSection(3)
        } else if (progress < 0.72) {
          setActiveSection(4)
        } else if (progress < 0.88) {
          setActiveSection(5)
        } else {
          setActiveSection(6)
        }
      },
    })

    return () => {
      st.kill()
    }
  }, [totalFrames])

  const scrollToSection = (sectionIndex: number) => {
    if (!containerRef.current) return
    const sectionRatios = [0, 0.1, 0.25, 0.45, 0.65, 0.82, 0.98]
    const targetScroll = sectionRatios[sectionIndex] * (containerRef.current.offsetHeight - window.innerHeight)
    window.scrollTo({
      top: containerRef.current.offsetTop + targetScroll,
      behavior: "smooth",
    })
  }

  return (
    <div ref={containerRef} className="relative w-full h-[600vh] bg-[#F8F9FA]">
      {/* Fixed Sticky Stage Container */}
      <div
        ref={pinRef}
        className="sticky top-0 left-0 w-full h-screen overflow-hidden flex flex-col justify-between"
      >
        {/* Canvas Background Layer */}
        <div className="absolute inset-0 z-0">
          <CinematicCanvas frameIndex={frameIndex} totalFrames={totalFrames} />
        </div>

        {/* Top Floating Mini Header */}
        <div className="relative z-20 w-full px-6 py-6 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">
              Product Brands • Studio Experience
            </span>
          </div>

          {/* Story Progress Indicator */}
          <div className="hidden md:flex items-center gap-2 bg-white/70 backdrop-blur-md px-4 py-2 rounded-full border border-gray-200/80 shadow-sm text-xs font-mono text-gray-600">
            <span>SCENE 0{activeSection} / 06</span>
            <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden ml-2">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-orange-500 to-red-500 transition-all duration-150"
                style={{ width: `${scrollProgress * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Story Section 1: Hero Section */}
        <AnimatePresence mode="wait">
          {activeSection === 1 && (
            <motion.div
              key="sec1"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-20 max-w-4xl mx-auto px-6 text-center pt-8 md:pt-16 pb-12 flex flex-col items-center justify-center my-auto pointer-events-auto"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/5 border border-black/10 backdrop-blur-sm mb-6">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-medium tracking-wider uppercase text-gray-800">
                  Private Label Manufacturing
                </span>
              </div>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-gray-900 leading-[1.05] mb-6">
                Private Label Your Products
              </h1>

              <p className="text-lg md:text-2xl text-gray-600 font-light max-w-2xl mx-auto mb-10 leading-relaxed">
                From concept to shelf-ready packaging. Watch raw unbranded materials transform into market-ready luxury.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Link href="/quote">
                  <Button size="lg" className="w-full sm:w-auto bg-gray-900 hover:bg-black text-white px-8 py-6 text-base rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
                    Start Your Brand
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <button
                  onClick={() => scrollToSection(3)}
                  className="w-full sm:w-auto px-8 py-3.5 text-base font-medium text-gray-700 hover:text-gray-900 bg-white/80 hover:bg-white border border-gray-300 rounded-full backdrop-blur-md shadow-sm transition-all"
                >
                  View Process
                </button>
              </div>

              <div className="mt-16 flex flex-col items-center gap-2 text-xs font-mono text-gray-400 uppercase tracking-widest animate-bounce">
                <span>Scroll to Begin</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Story Section 2: Before (Blank Packaging) */}
        <AnimatePresence mode="wait">
          {activeSection === 2 && (
            <motion.div
              key="sec2"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-20 max-w-md ml-6 md:ml-16 mb-20 p-8 rounded-3xl bg-white/80 backdrop-blur-xl border border-gray-200/80 shadow-2xl pointer-events-auto"
            >
              <div className="text-xs font-mono tracking-widest text-gray-400 uppercase mb-3">
                Phase 01 // Raw State
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                The Blank Canvas
              </h2>
              <p className="text-base text-gray-600 leading-relaxed mb-6">
                Pure, unbranded industrial packaging. Standardized forms waiting to be imbued with your custom brand identity and messaging.
              </p>
              <div className="flex items-center gap-3 text-xs font-semibold text-gray-700 bg-gray-100/80 px-4 py-2.5 rounded-xl border border-gray-200">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Pillow Bags • Stand-Up Pouches • Jars</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Story Section 3: Transformation (Occlusion Wipes & Light Sweeps) */}
        <AnimatePresence mode="wait">
          {activeSection === 3 && (
            <motion.div
              key="sec3"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-20 max-w-lg mr-6 md:mr-16 ml-auto mb-20 p-8 rounded-3xl bg-white/85 backdrop-blur-xl border border-gray-200/90 shadow-2xl pointer-events-auto"
            >
              <div className="text-xs font-mono tracking-widest text-blue-600 uppercase mb-3">
                Phase 02 // Transformation
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                Cinematic Precision
              </h2>
              <p className="text-base text-gray-600 leading-relaxed mb-6">
                Real-world physics in motion. As camera wipes sweep across the surface, metallic foils, spot UV varnish, and vibrant brand typography lock into place.
              </p>
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between text-xs font-medium text-gray-700">
                  <span>Surface Reflection</span>
                  <span className="font-mono text-blue-600">High Gloss + Spot UV</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, Math.max(0, (frameIndex - 90) * 1.1))}%` }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Story Section 4: Before vs After Interactive Comparison */}
        <AnimatePresence mode="wait">
          {activeSection === 4 && (
            <motion.div
              key="sec4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-20 max-w-md mx-auto mb-16 p-8 rounded-3xl bg-white/90 backdrop-blur-2xl border border-gray-200 shadow-2xl text-center pointer-events-auto"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-mono mb-4">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Phase 03 // Before vs After</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
                Raw to Retail-Ready
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Maintain identical camera geometry while sliding between raw unbranded packaging and finished retail shelf products.
              </p>

              {/* Interactive Comparison Slider Toggle */}
              <div className="relative w-full h-12 bg-gray-100 rounded-full p-1 border border-gray-200 flex items-center justify-between cursor-pointer">
                <div
                  className="absolute top-1 bottom-1 w-1/2 bg-white rounded-full shadow-md border border-gray-200 transition-all duration-300"
                  style={{ left: interactiveMode ? "48%" : "2%" }}
                />
                <button
                  onClick={() => setInteractiveMode(false)}
                  className={`relative z-10 w-1/2 text-xs font-bold transition-colors ${!interactiveMode ? "text-gray-900" : "text-gray-400"}`}
                >
                  Raw Packaging
                </button>
                <button
                  onClick={() => setInteractiveMode(true)}
                  className={`relative z-10 w-1/2 text-xs font-bold transition-colors ${interactiveMode ? "text-blue-600" : "text-gray-400"}`}
                >
                  Branded Product
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Story Section 5: The Color Explosion */}
        <AnimatePresence mode="wait">
          {activeSection === 5 && (
            <motion.div
              key="sec5"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-20 max-w-xl mx-auto mb-16 p-8 rounded-3xl bg-white/85 backdrop-blur-2xl border border-gray-200/80 shadow-2xl text-center pointer-events-auto"
            >
              <div className="flex justify-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-[#0066FF] shadow-sm animate-ping" />
                <span className="w-3 h-3 rounded-full bg-[#FF6B00] shadow-sm animate-ping" style={{ animationDelay: "0.2s" }} />
                <span className="w-3 h-3 rounded-full bg-[#FFB800] shadow-sm animate-ping" style={{ animationDelay: "0.4s" }} />
                <span className="w-3 h-3 rounded-full bg-[#FF2A55] shadow-sm animate-ping" style={{ animationDelay: "0.6s" }} />
              </div>

              <div className="text-xs font-mono tracking-widest text-red-500 uppercase mb-2">
                Phase 04 // Color Explosion
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
                Vibrant Brand Energy
              </h2>
              <p className="text-base text-gray-600 leading-relaxed mb-6 max-w-lg mx-auto">
                High-speed fluid macro paint splashes in vibrant Blue, Orange, Yellow, and Red surging behind the products with volumetric lighting.
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-gray-800 bg-gradient-to-r from-blue-50 via-orange-50 to-red-50 px-4 py-2 rounded-full border border-gray-200">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span>FDA Compliant • Custom Color Matching • Premium Matte & Gloss</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Story Section 6: Final Hero Reveal & CTAs */}
        <AnimatePresence mode="wait">
          {activeSection === 6 && (
            <motion.div
              key="sec6"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-20 max-w-3xl mx-auto px-6 text-center mb-16 p-10 rounded-3xl bg-white/90 backdrop-blur-2xl border border-gray-200/90 shadow-2xl pointer-events-auto"
            >
              <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-[1.08] mb-4">
                Your Brand. <br className="hidden sm:inline" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-orange-500 to-red-500">
                  Professionally Built.
                </span>
              </h2>

              <p className="text-base md:text-xl text-gray-600 mb-8 max-w-xl mx-auto leading-relaxed">
                Transform standard raw packaging into shelf-ready luxury products. Sourced, printed, packaged, and shipped worldwide.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/quote" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base rounded-full shadow-xl hover:shadow-2xl transition-all">
                    Start Your Project
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/contact" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-gray-300 hover:bg-gray-100 text-gray-900 px-8 py-6 text-base rounded-full backdrop-blur-md">
                    Talk to Packaging Expert
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Floating Section Navigation Bar */}
        <div className="relative z-20 w-full px-6 py-6 flex items-center justify-between pointer-events-auto bg-gradient-to-t from-white/90 via-white/50 to-transparent">
          <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
            {[
              { id: 1, label: "Hero" },
              { id: 2, label: "Raw State" },
              { id: 3, label: "Transformation" },
              { id: 4, label: "Before / After" },
              { id: 5, label: "Color Splash" },
              { id: 6, label: "Final Reveal" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  activeSection === item.id
                    ? "bg-gray-900 text-white shadow-md scale-105"
                    : "bg-white/70 hover:bg-white text-gray-600 border border-gray-200/80 backdrop-blur-sm"
                }`}
              >
                0{item.id}. {item.label}
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-gray-500">
            <Check className="w-4 h-4 text-green-600" />
            <span>60 FPS Render • Lenis Scroll Sync</span>
          </div>
        </div>
      </div>
    </div>
  )
}

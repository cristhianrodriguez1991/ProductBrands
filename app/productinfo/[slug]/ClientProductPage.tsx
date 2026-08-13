"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { 
  Box, 
  Scale, 
  Globe, 
  Coffee, 
  ShieldCheck, 
  Package, 
  Truck, 
  CheckCircle2, 
  Phone,
  Droplets,
  Layers
} from "lucide-react"

function getIconForTitle(title: string, isGrid: boolean) {
  const t = title.toLowerCase()
  const size = isGrid ? "h-10 w-10" : "h-6 w-6"
  const color = "text-[#8c6b4a]"
  const strokeWidth = 1.5

  const props = { className: `${size} ${color}`, strokeWidth }

  if (t.includes('name') || t.includes('item')) return <Box {...props} />
  if (t.includes('type') || t.includes('category')) return <Droplets {...props} />
  if (t.includes('origin') || t.includes('country')) return <Globe {...props} />
  if (t.includes('content') || t.includes('amount') || t.includes('count') || t.includes('qty')) return <Package {...props} />
  if (t.includes('weight') || t.includes('mass')) return <Scale {...props} />
  if (t.includes('ingredient')) return <Layers {...props} />
  if (t.includes('use') || t.includes('recommended')) return <Coffee {...props} />
  if (t.includes('storage') || t.includes('store')) return <ShieldCheck {...props} />
  if (t.includes('packag')) return <Box {...props} />
  if (t.includes('distribut') || t.includes('supplier')) return <Truck {...props} />
  
  return <CheckCircle2 {...props} /> // default
}

export default function ClientProductPage({ product }: { product: any }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const features = product.features as { title: string, description: string, format?: string }[] || []
  const mediaUrls = product.mediaUrls as string[] || []
  
  // Categorize features
  const gridFeatures = features.filter(f => !f.format || f.format === 'grid')
  const listFeatures = features.filter(f => f.format === 'list')
  
  if (!mounted) return null

  return (
    <div className="min-h-[100dvh] bg-[#fdfbf9] text-gray-900 selection:bg-[#8c6b4a] selection:text-white pb-24 font-sans">
      
      {/* Container - Max Width resembles a standard paper sheet */}
      <main className="max-w-4xl mx-auto bg-white min-h-screen md:my-8 md:shadow-[0_0_40px_rgba(0,0,0,0.05)] md:border border-gray-100 p-6 md:p-16">
        
        {/* Top Logo Section */}
        <div className="flex flex-col items-center mb-12">
          {mediaUrls.length > 0 ? (
            <div className="relative h-32 w-64 mb-6">
              <Image
                src={mediaUrls[0]}
                alt={product.name}
                fill
                className="object-contain"
                priority
              />
            </div>
          ) : (
            <div className="mb-8">
              <Coffee className="h-16 w-16 text-[#8c6b4a] mx-auto mb-2" strokeWidth={1.5} />
              <h1 className="text-3xl font-light tracking-[0.3em] uppercase text-center text-black">
                Product Brands
              </h1>
            </div>
          )}

          {/* Decorative Divider */}
          <div className="w-full max-w-lg flex items-center justify-center space-x-4 my-8">
            <div className="h-[1px] flex-1 bg-[#d8c3ad]"></div>
            <Coffee className="h-4 w-4 text-[#8c6b4a]" />
            <div className="h-[1px] flex-1 bg-[#d8c3ad]"></div>
          </div>

          <h2 className="text-2xl md:text-3xl font-medium tracking-[0.2em] uppercase text-gray-800 text-center">
            Product Information
          </h2>
        </div>

        {/* Short Specs (Grid Layout) */}
        {gridFeatures.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 border border-gray-200 mb-8 bg-white">
            {gridFeatures.map((feature, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col items-center justify-center p-8 text-center border-gray-200
                  ${idx % 3 !== 2 ? 'md:border-r' : ''} 
                  ${idx < gridFeatures.length - (gridFeatures.length % 3 || 3) ? 'md:border-b' : ''}
                  ${idx % 2 !== 1 ? 'sm:border-r' : 'sm:border-r-0'}
                  border-b last:border-b-0 md:last:border-b-0 sm:last:border-b-0
                `}
              >
                <div className="mb-4">
                  {getIconForTitle(feature.title, true)}
                </div>
                <h3 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3">
                  {feature.title}
                </h3>
                <p className="text-lg md:text-xl font-medium text-gray-900 leading-tight">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Detailed Specs (List Layout) */}
        {listFeatures.length > 0 && (
          <div className="border border-gray-200 bg-[#faf9f8] mb-12">
            {listFeatures.map((feature, idx) => (
              <div 
                key={idx} 
                className="flex flex-col md:flex-row border-b border-gray-200 last:border-0"
              >
                {/* List Item Label */}
                <div className="flex items-center space-x-4 p-4 md:p-6 md:w-64 bg-white md:border-r border-gray-200 shrink-0">
                  <div className="opacity-80">
                    {getIconForTitle(feature.title, false)}
                  </div>
                  <h3 className="text-sm font-bold tracking-wider uppercase text-gray-800">
                    {feature.title}
                  </h3>
                </div>
                {/* List Item Value */}
                <div className="p-4 md:p-6 flex-1 bg-white flex items-center">
                  <p className="text-gray-700 text-sm md:text-base leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Description Section (If provided, rendered gracefully) */}
        {product.description && (
          <div className="mb-12 text-center max-w-2xl mx-auto">
            <p className="text-gray-600 leading-relaxed italic">
              "{product.description}"
            </p>
          </div>
        )}

        {/* Footer / Contact */}
        <div className="mt-16 text-center">
          <div className="w-full max-w-md mx-auto flex items-center justify-center space-x-4 mb-8">
            <div className="h-[1px] flex-1 bg-[#d8c3ad]"></div>
            <Coffee className="h-3 w-3 text-[#d8c3ad]" />
            <div className="h-[1px] flex-1 bg-[#d8c3ad]"></div>
          </div>
          
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">
            Information provided for customer reference.
          </p>
          
          <div className="flex flex-col items-center justify-center space-y-2 mt-6">
            <a href="tel:1-800-000-0000" className="flex items-center space-x-2 text-[#8c6b4a] hover:text-[#70553b] transition-colors font-medium text-lg">
              <Phone className="h-5 w-5" />
              <span>Contact Product Brands: +1 (800) 000-0000</span>
            </a>
            
            {product.actionUrl && (
              <a 
                href={product.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 px-8 py-3 bg-[#8c6b4a] text-white text-sm font-bold tracking-widest uppercase rounded hover:bg-[#70553b] transition-colors"
              >
                Purchase Product
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageSlideshowProps {
  images: string[]
  autoPlay?: boolean
  interval?: number
  className?: string
}

export function ImageSlideshow({ 
  images, 
  autoPlay = true, 
  interval = 5000,
  className = "" 
}: ImageSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }[]>([])

  // Load image dimensions
  useEffect(() => {
    const loadDimensions = async () => {
      const dimensions = await Promise.all(
        images.map((src) => {
          return new Promise<{ width: number; height: number }>((resolve) => {
            const img = new window.Image()
            img.onload = () => {
              resolve({ width: img.naturalWidth, height: img.naturalHeight })
            }
            img.onerror = () => {
              resolve({ width: 16, height: 9 }) // Default aspect ratio
            }
            img.src = src
          })
        })
      )
      setImageDimensions(dimensions)
    }

    if (images.length > 0) {
      loadDimensions()
    }
  }, [images])

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || isPaused || images.length <= 1) return

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
    }, interval)

    return () => clearInterval(timer)
  }, [autoPlay, interval, isPaused, images.length])

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length)
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  if (!images || images.length === 0) {
    return null
  }

  // Get current image dimensions or use default
  const currentDimensions = imageDimensions[currentIndex] || { width: 16, height: 9 }
  const aspectRatio = currentDimensions.width / currentDimensions.height

  return (
    <div 
      className={`relative w-full overflow-hidden rounded-lg ${className}`}
      style={{
        aspectRatio: aspectRatio.toString(),
        maxHeight: '600px',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Images */}
      <div className="relative w-full h-full">
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            <Image
              src={image}
              alt={`Slide ${index + 1}`}
              fill
              className="object-contain"
              priority={index === 0}
              sizes="(max-width: 768px) 100vw, 50vw"
              onError={(e) => {
                console.error(`Failed to load image: ${image}`)
                e.currentTarget.style.display = "none"
              }}
            />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-full shadow-lg"
            onClick={goToPrevious}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6 text-gray-900" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-full shadow-lg"
            onClick={goToNext}
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6 text-gray-900" />
          </Button>
        </>
      )}

      {/* Dots Indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-white w-8"
                  : "bg-white/50 hover:bg-white/75"
              }`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Slide Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 right-4 z-20 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"

interface CinematicCanvasProps {
  frameIndex: number
  totalFrames?: number
  onLoadComplete?: () => void
}

interface Particle {
  x: number
  y: number
  size: number
  color: string
  vx: number
  vy: number
  alpha: number
}

export function CinematicCanvas({
  frameIndex,
  totalFrames = 294,
  onLoadComplete,
}: CinematicCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const [loadedCount, setLoadedCount] = useState(0)
  const [isReady, setIsReady] = useState(false)

  const particlesRef = useRef<Particle[]>([])

  // Preload all 294 frames
  useEffect(() => {
    let isMounted = true
    const loadedImages: HTMLImageElement[] = []
    let count = 0

    // Initialize color explosion particles
    const colors = ["#0066FF", "#FF6B00", "#FFB800", "#FF2A55"]
    const initialParticles: Particle[] = Array.from({ length: 60 }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 0.001,
      vy: (Math.random() - 0.5) * 0.001 - 0.0005,
      alpha: Math.random() * 0.7 + 0.3,
    }))
    particlesRef.current = initialParticles

    const preloadImage = (index: number) => {
      const img = new Image()
      const frameNum = String(index + 1).padStart(3, "0")
      img.src = `/frames_webp/frame_${frameNum}.webp`

      img.onload = () => {
        if (!isMounted) return
        count++
        setLoadedCount(count)
        if (count >= 30 && !isReady) {
          setIsReady(true)
          onLoadComplete?.()
        }
      }

      img.onerror = () => {
        // Fallback to jpg if webp fails
        img.src = `/frames/frame_${frameNum}.jpg`
      }

      loadedImages[index] = img
    }

    // Preload first 40 immediately, then lazy load rest
    for (let i = 0; i < Math.min(40, totalFrames); i++) {
      preloadImage(i)
    }

    const timer = setTimeout(() => {
      for (let i = 40; i < totalFrames; i++) {
        preloadImage(i)
      }
    }, 150)

    imagesRef.current = loadedImages

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [totalFrames])

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const targetFrame = Math.max(1, Math.min(totalFrames, Math.round(frameIndex)))
    const img = imagesRef.current[targetFrame - 1]

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const displayWidth = canvas.clientWidth
    const displayHeight = canvas.clientHeight

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr
      canvas.height = displayHeight * dpr
    }

    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, displayWidth, displayHeight)

    if (img && img.complete && img.naturalWidth > 0) {
      // Calculate contain ratio to keep high quality visual ratio
      const imgRatio = img.naturalWidth / img.naturalHeight
      const canvasRatio = displayWidth / displayHeight

      let renderW = displayWidth
      let renderH = displayHeight
      let offsetX = 0
      let offsetY = 0

      if (canvasRatio > imgRatio) {
        renderH = displayHeight
        renderW = displayHeight * imgRatio
        offsetX = (displayWidth - renderW) / 2
      } else {
        renderW = displayWidth
        renderH = displayWidth / imgRatio
        offsetY = (displayHeight - renderH) / 2
      }

      // Draw background ambient studio lighting glow
      const ambientGlow = ctx.createRadialGradient(
        displayWidth / 2,
        displayHeight / 2,
        10,
        displayWidth / 2,
        displayHeight / 2,
        displayWidth * 0.7
      )
      ambientGlow.addColorStop(0, "rgba(248, 249, 250, 0.95)")
      ambientGlow.addColorStop(0.5, "rgba(240, 242, 245, 0.9)")
      ambientGlow.addColorStop(1, "rgba(235, 238, 242, 0.85)")

      ctx.fillStyle = ambientGlow
      ctx.fillRect(0, 0, displayWidth, displayHeight)

      // Draw video frame
      ctx.drawImage(img, offsetX, offsetY, renderW, renderH)

      // SECTION 3: Transformation Light Sweep (frames 90 -> 180)
      if (frameIndex >= 90 && frameIndex <= 180) {
        const sweepProgress = (frameIndex - 90) / 90
        const sweepX = displayWidth * (sweepProgress * 1.5 - 0.25)

        ctx.save()
        ctx.globalCompositeOperation = "overlay"
        const sweepGrad = ctx.createLinearGradient(sweepX - 100, 0, sweepX + 100, displayHeight)
        sweepGrad.addColorStop(0, "rgba(255, 255, 255, 0)")
        sweepGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.25)")
        sweepGrad.addColorStop(1, "rgba(255, 255, 255, 0)")
        ctx.fillStyle = sweepGrad
        ctx.fillRect(0, 0, displayWidth, displayHeight)
        ctx.restore()
      }

      // SECTION 5: Color Explosion Particles & Fluid Bloom (frames 215 -> 275)
      if (frameIndex >= 215 && frameIndex <= 275) {
        const colorProgress = Math.min(1, (frameIndex - 215) / 45)

        ctx.save()
        ctx.globalCompositeOperation = "screen"

        // Ambient background color bloom
        const bloomGrad = ctx.createRadialGradient(
          displayWidth * 0.5,
          displayHeight * 0.5,
          20,
          displayWidth * 0.5,
          displayHeight * 0.5,
          displayWidth * 0.4
        )
        bloomGrad.addColorStop(0, `rgba(0, 102, 255, ${0.18 * colorProgress})`)
        bloomGrad.addColorStop(0.3, `rgba(255, 107, 0, ${0.15 * colorProgress})`)
        bloomGrad.addColorStop(0.6, `rgba(255, 184, 0, ${0.12 * colorProgress})`)
        bloomGrad.addColorStop(1, `rgba(255, 42, 85, 0)`)

        ctx.fillStyle = bloomGrad
        ctx.fillRect(0, 0, displayWidth, displayHeight)

        // Render fluid particle accents
        particlesRef.current.forEach((p) => {
          p.x = (p.x + p.vx) % 1
          if (p.x < 0) p.x += 1
          p.y = (p.y + p.vy) % 1
          if (p.y < 0) p.y += 1

          const px = p.x * displayWidth
          const py = p.y * displayHeight
          const pSize = p.size * (0.8 + colorProgress * 0.5)

          const pGrad = ctx.createRadialGradient(px, py, 0, px, py, pSize)
          pGrad.addColorStop(0, p.color)
          pGrad.addColorStop(1, "transparent")

          ctx.fillStyle = pGrad
          ctx.beginPath()
          ctx.arc(px, py, pSize, 0, Math.PI * 2)
          ctx.fill()
        })

        ctx.restore()
      }
    } else {
      // Elegant minimal loading state inside canvas
      ctx.fillStyle = "#F8F9FA"
      ctx.fillRect(0, 0, displayWidth, displayHeight)

      ctx.fillStyle = "#94A3B8"
      ctx.font = "14px Inter, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(
        `Preloading Cinematic Experience... ${Math.round((loadedCount / totalFrames) * 100)}%`,
        displayWidth / 2,
        displayHeight / 2
      )
    }

    ctx.restore()
  }, [frameIndex, totalFrames, loadedCount])

  return (
    <div className="relative w-full h-full bg-[#F8F9FA] overflow-hidden flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain block"
      />
    </div>
  )
}

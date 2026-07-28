"use client"

import { useRef, useEffect, useMemo, useCallback } from "react"
import type { MotionValue } from "framer-motion"
import { useMotionValueEvent } from "framer-motion"

/* ------------------------------------------------------------------ */
/*  Config                                                            */
/* ------------------------------------------------------------------ */

const TOTAL_FRAMES = 194
/** scrollYProgress value at which the final frame (194) is reached */
const ANIMATION_END = 0.95

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function padFrame(n: number): string {
  return String(n).padStart(5, "0")
}

/** Build the full frame-path array once */
function buildFramePaths(): string[] {
  return Array.from(
    { length: TOTAL_FRAMES },
    (_, i) => `/Animation Image/${padFrame(i + 1)}.jpg`
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface Props {
  scrollProgress: MotionValue<number>
}

function HeroImageSequence({ scrollProgress }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const frameRef = useRef(0)
  const reducedRef = useRef(false)
  const framePaths = useMemo(buildFramePaths, [])

  /* ---- draw frame onto HTML5 Canvas with cover aspect ratio ------- */
  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = imagesRef.current[index]
    if (!img || !img.complete || img.naturalWidth === 0) return

    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2)
    const displayWidth = canvas.clientWidth
    const displayHeight = canvas.clientHeight

    if (displayWidth === 0 || displayHeight === 0) return

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr
      canvas.height = displayHeight * dpr
    }

    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, displayWidth, displayHeight)

    // Calculate aspect ratio fit (cover mode for full-window background)
    const imgRatio = img.naturalWidth / img.naturalHeight
    const canvasRatio = displayWidth / displayHeight

    let drawWidth = displayWidth
    let drawHeight = displayHeight
    let offsetX = 0
    let offsetY = 0

    if (canvasRatio > imgRatio) {
      drawWidth = displayWidth
      drawHeight = displayWidth / imgRatio
      offsetY = (displayHeight - drawHeight) / 2
    } else {
      drawHeight = displayHeight
      drawWidth = displayHeight * imgRatio
      offsetX = (displayWidth - drawWidth) / 2
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
    ctx.restore()
  }, [])

  /* ---- reduced motion query ------------------------------------ */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    reducedRef.current = mq.matches
  }, [])

  /* ---- preload frames into Image array ------------------------ */
  useEffect(() => {
    let cancelled = false
    const loadedImages: HTMLImageElement[] = new Array(TOTAL_FRAMES)

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image()
      img.src = framePaths[i]
      if (i === 0) {
        img.onload = () => {
          if (!cancelled) drawFrame(0)
        }
      }
      loadedImages[i] = img
    }

    imagesRef.current = loadedImages

    const handleResize = () => {
      drawFrame(frameRef.current)
    }
    window.addEventListener("resize", handleResize)

    return () => {
      cancelled = true
      window.removeEventListener("resize", handleResize)
    }
  }, [framePaths, drawFrame])

  /* ---- scroll‑driven frame scrubbing --------------------------- */
  useMotionValueEvent(scrollProgress, "change", (latest: number) => {
    if (reducedRef.current) return

    const clamped = Math.max(0, Math.min(1, latest))
    const normalized = Math.min(clamped / ANIMATION_END, 1)
    const frameIndex = Math.round(normalized * (TOTAL_FRAMES - 1))
    const clampedIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, frameIndex))

    if (clampedIndex !== frameRef.current) {
      frameRef.current = clampedIndex
      requestAnimationFrame(() => drawFrame(clampedIndex))
    }
  })

  /* ---- render -------------------------------------------------- */
  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none">
      {/* High-Performance Full-Window Background Canvas with 50% transparency */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover opacity-50 transition-opacity duration-300"
        style={{
          mixBlendMode: "multiply",
          opacity: 0.5,
        }}
      />
    </div>
  )
}

export { HeroImageSequence }

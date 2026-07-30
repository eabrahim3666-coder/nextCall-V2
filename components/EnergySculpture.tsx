"use client"

import { useEffect, useRef } from "react"

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface OrbitalRing {
  tilt: number       // 0-1, apparent 3D tilt
  spin: number       // rotation speed (rad/s)
  phase: number      // starting phase
  radius: number     // ring radius
  squash: number     // y-axis squash (perspective foreshortening)
  hue: number
  sat: number
  light: number
  alpha: number      // base opacity
  width: number      // stroke width
  reverse: boolean   // counter-rotate
}

interface Particle {
  ringIndex: number
  t: number          // progress along ring 0-1
  speed: number      // radians per second
  offset: number     // radial offset from ring
  size: number
  hue: number
  sat: number
  light: number
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const RINGS: OrbitalRing[] = [
  { tilt: 0.35, spin: 0.15, phase: 0.0, radius: 280, squash: 0.35, hue: 270, sat: 75, light: 60, alpha: 0.20, width: 18, reverse: false },
  { tilt: 0.50, spin: 0.10, phase: 1.8, radius: 230, squash: 0.30, hue: 220, sat: 80, light: 55, alpha: 0.18, width: 14, reverse: true },
  { tilt: 0.25, spin: 0.18, phase: 3.2, radius: 320, squash: 0.40, hue: 280, sat: 70, light: 50, alpha: 0.15, width: 22, reverse: false },
  { tilt: 0.60, spin: 0.08, phase: 0.9, radius: 190, squash: 0.25, hue: 200, sat: 85, light: 58, alpha: 0.22, width: 12, reverse: true },
  { tilt: 0.40, spin: 0.13, phase: 2.5, radius: 260, squash: 0.38, hue: 300, sat: 65, light: 45, alpha: 0.16, width: 16, reverse: false },
  { tilt: 0.20, spin: 0.06, phase: 4.1, radius: 350, squash: 0.45, hue: 240, sat: 70, light: 50, alpha: 0.12, width: 20, reverse: true },
  { tilt: 0.55, spin: 0.20, phase: 1.4, radius: 160, squash: 0.28, hue: 260, sat: 75, light: 52, alpha: 0.24, width: 10, reverse: false },
]

const PARTICLES: Particle[] = []

// Generate particles for each ring
for (let ri = 0; ri < RINGS.length; ri++) {
  const count = 3 + Math.floor(RINGS[ri].radius / 60)
  for (let i = 0; i < count; i++) {
    PARTICLES.push({
      ringIndex: ri,
      t: Math.random() * Math.PI * 2,
      speed: RINGS[ri].spin * (0.8 + Math.random() * 0.4) * (RINGS[ri].reverse ? -1 : 1),
      offset: (Math.random() - 0.5) * 20,
      size: 1.5 + Math.random() * 3,
      hue: RINGS[ri].hue + (Math.random() - 0.5) * 20,
      sat: RINGS[ri].sat,
      light: RINGS[ri].light + 10 + Math.random() * 15,
    })
  }
}

/* ------------------------------------------------------------------ */
/*  Ring rendering                                                    */
/* ------------------------------------------------------------------ */

function drawRing(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  t: number, ring: OrbitalRing, mx: number, my: number
) {
  const angle = t * ring.spin + ring.phase
  const parallaxX = mx * 4
  const parallaxY = my * 3

  ctx.save()

  // Move to center + parallax
  ctx.translate(cx + parallaxX, cy + parallaxY)

  // Rotate the ring around the vertical axis
  ctx.rotate(angle)

  // Scale y for 3D tilt
  const sy = 1 - ring.tilt
  ctx.scale(1, sy)

  // Draw the ring as an ellipse (squashed for perspective)
  const rx = ring.radius
  const ry = ring.radius * ring.squash

  const hueShift = Math.sin(t * 0.04 + ring.phase) * 8
  const hue = ring.hue + hueShift
  const pulse = 1 + 0.06 * Math.sin(t * 0.07 + ring.phase)
  const alpha = ring.alpha * pulse

  // --- Glow pass ---
  ctx.beginPath()
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
  ctx.strokeStyle = `hsla(${hue}, ${ring.sat}%, ${ring.light + 5}%, ${alpha * 0.25})`
  ctx.lineWidth = ring.width * 3
  ctx.lineCap = "round"
  ctx.shadowColor = `hsla(${hue}, ${ring.sat}%, ${ring.light + 10}%, ${alpha * 0.35})`
  ctx.shadowBlur = 80
  ctx.stroke()

  // --- Mid glow ---
  ctx.beginPath()
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
  ctx.strokeStyle = `hsla(${hue}, ${ring.sat}%, ${ring.light + 3}%, ${alpha * 0.4})`
  ctx.lineWidth = ring.width * 1.8
  ctx.shadowColor = `hsla(${hue}, ${ring.sat}%, ${ring.light + 5}%, ${alpha * 0.3})`
  ctx.shadowBlur = 40
  ctx.stroke()

  // --- Main ring ---
  ctx.beginPath()
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
  ctx.strokeStyle = `hsla(${hue}, ${ring.sat}%, ${ring.light}%, ${alpha})`
  ctx.lineWidth = ring.width
  ctx.shadowColor = `hsla(${hue}, ${ring.sat}%, ${ring.light + 8}%, ${alpha * 0.25})`
  ctx.shadowBlur = 15
  ctx.stroke()

  // --- Bright core ---
  ctx.beginPath()
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
  ctx.strokeStyle = `hsla(${hue + 5}, ${ring.sat}%, ${ring.light + 20}%, ${alpha * 0.5})`
  ctx.lineWidth = ring.width * 0.25
  ctx.shadowColor = `hsla(${hue}, ${ring.sat}%, ${ring.light + 15}%, ${alpha * 0.4})`
  ctx.shadowBlur = 8
  ctx.stroke()

  ctx.restore()
}

/* ------------------------------------------------------------------ */
/*  Particle rendering                                                */
/* ------------------------------------------------------------------ */

function drawParticles(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  t: number, mx: number, my: number
) {
  const parallaxX = mx * 4
  const parallaxY = my * 3

  for (const p of PARTICLES) {
    const ring = RINGS[p.ringIndex]
    const angle = t * p.speed + p.t
    const ringAngle = t * ring.spin + ring.phase

    // Calculate 3D position on the ring
    const baseRadius = ring.radius
    const baseRx = (baseRadius + p.offset) * Math.cos(angle)
    const baseRy = (baseRadius + p.offset) * ring.squash * Math.sin(angle)

    // Apply the same transforms as the ring: rotate then scale y
    const cosA = Math.cos(ringAngle)
    const sinA = Math.sin(ringAngle)
    const x3d = baseRx * cosA - baseRy * sinA
    const y3d = (baseRx * sinA + baseRy * cosA) * (1 - ring.tilt)

    const px = cx + parallaxX + x3d
    const py = cy + parallaxY + y3d

    const depthFactor = 0.5 + 0.5 * Math.cos(angle)
    const alpha = 0.3 + 0.7 * depthFactor
    const size = p.size * (0.7 + 0.3 * depthFactor)

    const hueShift = Math.sin(t * 0.05 + p.t) * 5
    const hue = p.hue + hueShift

    // Glow
    ctx.beginPath()
    ctx.arc(px, py, size * 4, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${hue}, ${p.sat}%, ${p.light}%, ${alpha * 0.15})`
    ctx.fill()

    // Core
    ctx.beginPath()
    ctx.arc(px, py, size, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${hue}, ${p.sat}%, ${p.light}%, ${alpha * 0.8})`
    ctx.shadowColor = `hsla(${hue}, ${p.sat}%, ${p.light}%, ${alpha * 0.5})`
    ctx.shadowBlur = 12
    ctx.fill()

    // Reset shadow
    ctx.shadowBlur = 0
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function EnergySculpture() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })

  // Mouse tracking
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleMouse = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      mouseRef.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    }
    const reset = () => { mouseRef.current.x = 0; mouseRef.current.y = 0 }
    el.addEventListener("mousemove", handleMouse, { passive: true })
    el.addEventListener("mouseleave", reset, { passive: true })
    return () => {
      el.removeEventListener("mousemove", handleMouse)
      el.removeEventListener("mouseleave", reset)
    }
  }, [])

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    let running = true
    const startTime = performance.now()

    const render = (now: number) => {
      if (!running) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const rect = container.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      if (w === 0 || h === 0) {
        requestAnimationFrame(render)
        return
      }

      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.scale(dpr, dpr)

      const elapsed = (now - startTime) / 1000
      const { x: mx, y: my } = mouseRef.current

      ctx.clearRect(0, 0, w, h)

      const cx = w * 0.5
      const cy = h * 0.5

      // Deep ambient core glow
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 300)
      core.addColorStop(0, "hsla(270, 70%, 20%, 0.10)")
      core.addColorStop(0.4, "hsla(240, 60%, 15%, 0.06)")
      core.addColorStop(1, "transparent")
      ctx.fillStyle = core
      ctx.fillRect(0, 0, w, h)

      // Secondary wider glow
      const wide = ctx.createRadialGradient(cx + 40, cy - 30, 0, cx + 40, cy - 30, 500)
      wide.addColorStop(0, "hsla(280, 50%, 18%, 0.08)")
      wide.addColorStop(0.5, "hsla(210, 40%, 12%, 0.04)")
      wide.addColorStop(1, "transparent")
      ctx.fillStyle = wide
      ctx.fillRect(0, 0, w, h)

      // Draw rings (back to front = larger/slower first)
      for (let i = RINGS.length - 1; i >= 0; i--) {
        drawRing(ctx, cx, cy, elapsed, RINGS[i], mx, my)
      }

      // Draw particles on top
      drawParticles(ctx, cx, cy, elapsed, mx, my)

      requestAnimationFrame(render)
    }

    requestAnimationFrame(render)
    return () => { running = false }
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-visible pointer-events-none">
      <canvas ref={canvasRef} className="block" />
    </div>
  )
}

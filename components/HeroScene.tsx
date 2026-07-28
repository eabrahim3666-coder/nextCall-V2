"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Spline from "@splinetool/react-spline"
import type { Application } from "@splinetool/runtime"

const SCENE_URL = "https://prod.spline.design/OxfOaa3JyK8qUaVB/scene.splinecode"

export function HeroScene() {
  const [loaded, setLoaded] = useState(false)
  const appRef = useRef<Application | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const posRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const rafRef = useRef(0)
  const restartRef = useRef(() => {})

  // ─── Spline onLoad ────────────────────────────────────────────────
  const handleLoad = useCallback((app: Application) => {
    appRef.current = app
    setLoaded(true)
  }, [])

  // ─── Mouse + Touch tracking ───────────────────────────────────────
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    let startX = 0, startY = 0
    let settled = false

    const update = (cx: number, cy: number) => {
      const rect = el.getBoundingClientRect()
      posRef.current.tx = ((cx - rect.left) / rect.width) * 2 - 1
      posRef.current.ty = -(((cy - rect.top) / rect.height) * 2 - 1)
    }

    const onMouse = (e: MouseEvent) => {
      update(e.clientX, e.clientY)
      restartRef.current()
    }
    const onLeave = () => {
      posRef.current.tx = 0; posRef.current.ty = 0
      restartRef.current()
    }

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) { startX = t.clientX; startY = t.clientY }
      settled = false
    }

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      const dx = Math.abs(t.clientX - startX)
      const dy = Math.abs(t.clientY - startY)
      if (!settled && dx + dy > 10) {
        settled = true
      }
      if (settled && dx > dy) {
        update(t.clientX, t.clientY)
        restartRef.current()
        e.preventDefault()
      }
    }
    const onTouchEnd = () => {
      posRef.current.tx = 0; posRef.current.ty = 0; settled = false
      restartRef.current()
    }

    el.addEventListener("mousemove", onMouse, { passive: true })
    el.addEventListener("mouseleave", onLeave, { passive: true })
    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener("mousemove", onMouse)
      el.removeEventListener("mouseleave", onLeave)
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
    }
  }, [])

  // ─── Animation loop (fully stops when idle) ──────────────────────
  useEffect(() => {
    if (!loaded || !appRef.current) return

    const app = appRef.current
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    let cx = 0, cy = 0
    let cameras: any[] = []
    let groups: any[] = []
    let running = false

    const all = app.getAllObjects()
    for (const obj of all) {
      const n = (obj.name || "").toLowerCase()
      if (n === "camera") cameras.push(obj)
      if (n.includes("group") || n.includes("container")) groups.push(obj)
    }

    const tick = () => {
      const p = posRef.current
      cx = lerp(cx, p.tx, 0.06)
      cy = lerp(cy, p.ty, 0.06)

      // Fully stop RAF loop when the value has converged
      if (Math.abs(cx - p.tx) < 0.001 && Math.abs(cy - p.ty) < 0.001) {
        cx = p.tx; cy = p.ty
        running = false
        return
      }

      if (cameras.length > 0) {
        for (const cam of cameras) {
          if (cam.position) {
            cam.position.x = cx * 8
            cam.position.y = cy * 6 + 15
          }
        }
      } else if (groups.length > 0) {
        for (const g of groups) {
          if (g.rotation) {
            g.rotation.y = cx * 0.15
            g.rotation.x = cy * 0.1
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    restartRef.current = () => {
      if (running) return
      running = true
      rafRef.current = requestAnimationFrame(tick)
    }

    // One initial pulse to settle at center
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      restartRef.current = () => {}
    }
  }, [loaded])

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 size-full overflow-hidden"
    >
      <style>{`
        .hero-spline-wrap::after {
          content: "";
          position: absolute;
          bottom: 0;
          right: 0;
          width: 220px;
          height: 70px;
          background: #000102;
          z-index: 20;
          pointer-events: none;
        }
      `}</style>

      {!loaded && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: "#0a0a0a" }}
        />
      )}

      <div className="hero-spline-wrap absolute inset-0">
        <Spline
          scene={SCENE_URL}
          onLoad={handleLoad}
          style={{
            width: "100%",
            height: "100%",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}
        />
      </div>
    </div>
  )
}

"use client"

import dynamic from "next/dynamic"
import { useState } from "react"

/* Spline is loaded dynamically to avoid SSR issues with WebGL */
const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => null,
})

const SCENE_URL =
  "https://prod.spline.design/S2uJjpFGXV0f5fqc/scene.splinecode"

export function SplineHeroLeft() {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="absolute inset-0 size-full">
      {/* Spline canvas */}
      <div
        className="absolute inset-0"
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}
      >
        <Spline
          scene={SCENE_URL}
          onLoad={() => setLoaded(true)}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Skeleton shimmer while loading */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-[420px] h-[420px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, hsla(270,60%,30%,0.15) 0%, transparent 70%)",
              animation: "splinePulse 2s ease-in-out infinite",
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes splinePulse {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50%       { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}

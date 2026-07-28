"use client"

import { useState } from "react"
import Spline from "@splinetool/react-spline"

const SCENE_URL = "https://prod.spline.design/OxfOaa3JyK8qUaVB/scene.splinecode"

export function HeroScene() {
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      className="absolute inset-0 size-full"
      style={{ pointerEvents: "none" }}
    >
      {/* Dark placeholder while loading — prevents white flash */}
      {!loaded && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "#0a0a0a" }}
        />
      )}

      <Spline
        scene={SCENE_URL}
        onLoad={() => setLoaded(true)}
        style={{
          width: "100%",
          height: "100%",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      />
    </div>
  )
}

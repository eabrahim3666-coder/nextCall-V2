"use client";
import { ReactNode, useEffect } from "react";
import Lenis from "lenis";

export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // LERP (exponential damping) mode instead of duration/easing. In duration
    // mode every wheel notch restarts a fresh eased animation that travels only
    // a few px during the first frames — the "initial dead zone". With lerp,
    // each wheel input updates the target instantly and the animated scroll
    // closes the gap by `1 - Math.exp(-lerp * 60 * dt)` on the very next frame,
    // so the first wheel notch visibly moves the scrollbar/page while the
    // exponential decay keeps the smooth, cinematic LERP glide.
    const lenis = new Lenis({
      lerp: 0.09,
      smoothWheel: true,
      wheelMultiplier: 1.15, // small boost so 1 notch = visible scrollbar move
      touchMultiplier: 1.5,
      syncTouch: false,
      infinite: false,
    });

    let rafId = 0;
    const raf = (time: number) => { lenis.raf(time); rafId = requestAnimationFrame(raf); };
    rafId = requestAnimationFrame(raf);

    return () => { cancelAnimationFrame(rafId); lenis.destroy(); };
  }, []);

  return <>{children}</>;
}

"use client";
import { ReactNode, useEffect } from "react";
import Lenis from "lenis";

// The active Lenis instance (desktop smooth-scroll only), so other modules —
// e.g. SceneStack's nav-scroll handling — can drive programmatic scrolling.
export let activeLenis: Lenis | null = null;

export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Touch devices use native scrolling — let the browser handle it 1:1.
    // Lenis on Android/iOS hijacks touch scroll and breaks "scroll back up".
    if (window.matchMedia("(pointer: coarse)").matches) return;

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
    activeLenis = lenis;

    let rafId = 0;
    const raf = (time: number) => { lenis.raf(time); rafId = requestAnimationFrame(raf); };
    rafId = requestAnimationFrame(raf);

    return () => { cancelAnimationFrame(rafId); lenis.destroy(); activeLenis = null; };
  }, []);

  return <>{children}</>;
}

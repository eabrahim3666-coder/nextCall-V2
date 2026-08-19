"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.4,
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] origin-left z-[60] pointer-events-none"
      style={{
        scaleX,
        background:
          "linear-gradient(90deg, #a78bfa 0%, #6366f1 50%, #22d3ee 100%)",
      }}
    />
  );
}

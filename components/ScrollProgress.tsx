"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 260,
    damping: 32,
    mass: 0.25,
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] origin-left z-[60] pointer-events-none"
      style={{
        scaleX,
        background:
          "linear-gradient(90deg, #ff4b00 0%, #ff7a2e 50%, #ffc299 100%)",
      }}
    />
  );
}

"use client";

import { ReactNode, useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";
import { cn } from "@/lib/utils";

type Intensity = "subtle" | "medium" | "strong";

interface Section3DProps {
  children: ReactNode;
  className?: string;
  id?: string;
  intensity?: Intensity;
  bg?: string;
}

const INTENSITY: Record<
  Intensity,
  {
    rotate: number;
    scale: number;
    z: number;
    opacityFloor: number;
    blur: number;
  }
> = {
  subtle: { rotate: 4, scale: 0.98, z: -40, opacityFloor: 0.75, blur: 2 },
  medium: { rotate: 7, scale: 0.96, z: -80, opacityFloor: 0.55, blur: 3 },
  strong: { rotate: 12, scale: 0.92, z: -160, opacityFloor: 0.35, blur: 6 },
};

export function Section3D({
  children,
  className,
  id,
  intensity = "medium",
  bg,
}: Section3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const cfg = INTENSITY[intensity];

  const rotateXRaw = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [cfg.rotate, 0, -cfg.rotate]
  );
  const scaleRaw = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [cfg.scale, 1, cfg.scale]
  );
  const zRaw = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [cfg.z, 0, cfg.z]
  );
  const opacityRaw = useTransform(
    scrollYProgress,
    [0, 0.15, 0.85, 1],
    [cfg.opacityFloor, 1, 1, cfg.opacityFloor]
  );
  const yRaw = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [30, 0, -30]
  );

  const springCfg = { stiffness: 140, damping: 36, mass: 0.5 };
  const rotateX = useSpring(rotateXRaw, springCfg);
  const scale = useSpring(scaleRaw, springCfg);
  const z = useSpring(zRaw, springCfg);
  const opacity = useSpring(opacityRaw, springCfg);
  const y = useSpring(yRaw, springCfg);

  return (
    <div
      ref={ref}
      id={id}
      className={cn("relative w-full", className)}
      style={{
        perspective: "1000px",
        perspectiveOrigin: "center center",
        background: bg,
      }}
    >
      <motion.div
        style={{
          rotateX,
          scale,
          z,
          opacity,
          y,
          transformStyle: "preserve-3d",
          transformOrigin: "center center",
          background: bg,
          minHeight: "100vh",
          width: "100%",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

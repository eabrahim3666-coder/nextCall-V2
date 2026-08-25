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
  preserveOpacity?: boolean;
  minHeight?: string;
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
  subtle: { rotate: 1.5, scale: 0.995, z: -8, opacityFloor: 0.92, blur: 0 },
  medium: { rotate: 2.25, scale: 0.99, z: -14, opacityFloor: 0.88, blur: 0 },
  strong: { rotate: 4, scale: 0.98, z: -28, opacityFloor: 0.78, blur: 0 },
};

export function Section3D({
  children,
  className,
  id,
  intensity = "medium",
  bg,
  preserveOpacity = false,
  minHeight = "100vh",
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
  const opacityRaw = useTransform(
    scrollYProgress,
    [0, 0.15, 0.85, 1],
    preserveOpacity ? [1, 1, 1, 1] : [cfg.opacityFloor, 1, 1, cfg.opacityFloor]
  );
  const yRaw = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [10, 0, -10]
  );

  const springCfg = { stiffness: 130, damping: 40, mass: 0.5 };
  const rotateX = useSpring(rotateXRaw, springCfg);
  const scale = useSpring(scaleRaw, springCfg);
  const opacity = useSpring(opacityRaw, springCfg);
  const y = useSpring(yRaw, springCfg);

  return (
    <div
      ref={ref}
      id={id}
      className={cn("relative w-full", className)}
      style={{
        background: bg,
      }}
    >
      <motion.div
        style={{
          rotateX,
          scale,
          opacity,
          y,
          transformOrigin: "center center",
          background: bg,
          minHeight,
          width: "100%",
          willChange: "transform",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

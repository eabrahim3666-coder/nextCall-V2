"use client";

import { useRef, ReactNode } from "react";
import { motion, useInView, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "left" | "right" | "scale" | "fade" | "tilt";

interface RevealProps {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  amount?: number;
}

const EXPO_OUT = [0.34, 1, 0.64, 1] as const;

export function Reveal({
  children,
  direction = "up",
  delay = 0,
  duration = 2,
  className,
  once = true,
  amount = 0.2,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount });

  const offsets: Record<
    Direction,
    { x: number; y: number; scale: number; rotate: number }
  > = {
    up: { x: 0, y: 60, scale: 0.96, rotate: 0 },
    down: { x: 0, y: -60, scale: 0.96, rotate: 0 },
    left: { x: 60, y: 0, scale: 0.96, rotate: 0 },
    right: { x: -60, y: 0, scale: 0.96, rotate: 0 },
    scale: { x: 0, y: 0, scale: 0.85, rotate: 0 },
    fade: { x: 0, y: 0, scale: 1, rotate: 0 },
    tilt: { x: 0, y: 50, scale: 0.95, rotate: -2 },
  };

  const off = offsets[direction];

  return (
    <motion.div
      ref={ref}
      initial={{
        opacity: 0,
        x: off.x,
        y: off.y,
        scale: off.scale,
        rotate: off.rotate,
        filter: "blur(14px)",
      }}
      animate={
        inView
          ? {
              opacity: 1,
              x: 0,
              y: 0,
              scale: 1,
              rotate: 0,
              filter: "blur(0px)",
            }
          : undefined
      }
      transition={{
        duration,
        delay: delay + 0.15,
        ease: EXPO_OUT,
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function StaggerGroup({
  children,
  className,
  stagger = 0.18,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: { opacity: 1 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: stagger,
            delayChildren: delay + 0.1,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem: Variants = {
hidden: {
    opacity: 0,
    y: 50,
    scale: 0.94,
    filter: "blur(12px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 1.8,
      ease: EXPO_OUT,
    },
  },
};

interface StaggerGridProps<T> {
  items: T[];
  columns: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  once?: boolean;
  amount?: number;
}

export function StaggerGrid<T>({
  items,
  columns,
  renderItem,
  className,
  once = true,
  amount = 0.15,
}: StaggerGridProps<T>) {
  return (
    <motion.div
      className={cn("grid", className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={{
        hidden: { opacity: 1 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.15,
            delayChildren: 0.1,
          },
        },
      }}
    >
      {items.map((item, i) => {
        const row = Math.floor(i / columns);
        const colInRow = i % columns;
        const delay = row * 0.45 + colInRow * 0.15;
        return (
          <motion.div
            key={i}
            variants={{
              hidden: {
                opacity: 0,
                y: 50,
                scale: 0.92,
                filter: "blur(12px)",
              },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
                transition: {
                  duration: 1.8,
                  ease: EXPO_OUT,
                  delay,
                },
              },
            }}
          >
            {renderItem(item, i)}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

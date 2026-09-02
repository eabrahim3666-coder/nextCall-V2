"use client";

import { useRef, ReactNode } from "react";
import { motion, useInView, useReducedMotion, Variants } from "framer-motion";
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
  duration = 0.65,
  className,
  once = true,
  amount = 0.2,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount });
  // Respect prefers-reduced-motion: fade without movement (WCAG 2.3.3).
  const reduceMotion = useReducedMotion();

  const offsets: Record<
    Direction,
    { x: number; y: number; scale: number; rotate: number }
  > = {
    up: { x: 0, y: 24, scale: 0.98, rotate: 0 },
    down: { x: 0, y: -24, scale: 0.98, rotate: 0 },
    left: { x: 24, y: 0, scale: 0.98, rotate: 0 },
    right: { x: -24, y: 0, scale: 0.98, rotate: 0 },
    scale: { x: 0, y: 0, scale: 0.96, rotate: 0 },
    fade: { x: 0, y: 0, scale: 1, rotate: 0 },
    tilt: { x: 0, y: 22, scale: 0.98, rotate: -1 },
  };

  const off = reduceMotion ? offsets.fade : offsets[direction];

  return (
    <motion.div
      ref={ref}
      initial={{
        opacity: 0,
        x: off.x,
        y: off.y,
        scale: off.scale,
        rotate: off.rotate,
      }}
      animate={
        inView
          ? {
              opacity: 1,
              x: 0,
              y: 0,
              scale: 1,
              rotate: 0,
            }
          : undefined
      }
      transition={{
        duration: reduceMotion ? 0.2 : duration,
        delay: reduceMotion ? 0 : delay + 0.05,
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
  stagger = 0.08,
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
            delayChildren: delay + 0.05,
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
    y: 24,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.65,
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
            staggerChildren: 0.06,
            delayChildren: 0.04,
          },
        },
      }}
    >
      {items.map((item, i) => {
        const row = Math.floor(i / columns);
        const colInRow = i % columns;
        const delay = row * 0.12 + colInRow * 0.04;
        return (
          <motion.div
            key={i}
            variants={{
              hidden: {
                opacity: 0,
                y: 22,
                scale: 0.98,
              },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  duration: 0.65,
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

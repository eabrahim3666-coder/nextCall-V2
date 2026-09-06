"use client";

import { ReactNode } from "react";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/utils";

type CinematicChartCardProps = {
    children: ReactNode;
    className?: string;
    /** Reveal delay (seconds) — stagger sections down the page. */
    delay?: number;
    /** Bigger padding for the main analytics panels. */
    padding?: "sm" | "lg";
};

/**
 * Shared cinematic shell for dashboard analytics cards: the familiar black
 * card with an orange hairline glow rim, a soft ambient glow, and a scroll
 * rise-in entrance (respects prefers-reduced-motion via Reveal).
 */
export default function CinematicChartCard({
    children,
    className,
    delay = 0,
    padding = "sm",
}: CinematicChartCardProps) {
    return (
        <Reveal direction="up" delay={delay} className={className}>
            <div
                className={cn(
                    "relative overflow-hidden rounded-2xl border border-white/5 bg-black",
                    "shadow-[0_0_60px_-20px_rgba(255,75,0,0.25)]",
                    padding === "lg" ? "p-8" : "p-6"
                )}
            >
                {/* Orange hairline rim across the top */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff4b00]/40 to-transparent pointer-events-none" />
                {children}
            </div>
        </Reveal>
    );
}

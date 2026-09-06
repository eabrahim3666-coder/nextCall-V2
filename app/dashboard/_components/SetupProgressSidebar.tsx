"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, animate, useReducedMotion } from "framer-motion";
import type { SetupProgress } from "@/lib/setup-progress";

const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Game-style setup progression widget for the dashboard sidebar:
 * a glowing gradient ring with a count-up percentage, a segmented
 * notch bar (one notch per setup item), and a "Next up" checklist
 * where every remaining step's full label is the deep link itself.
 * The pulsing dot marks the ACTIVE step: the first remaining item by
 * default, or whichever step the user last clicked (selection sticks
 * across dashboard navigation because the sidebar never unmounts).
 * Hides itself at 100% (the parent decides by not rendering it).
 */
export default function SetupProgressSidebar({ setup }: { setup: SetupProgress }) {
    const remaining = setup.remaining;
    const reduceMotion = useReducedMotion();

    // The step the user focused on — falls back to the first remaining
    // step, and auto-reverts if the selected one gets completed.
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const activeId = remaining.some((i) => i.id === selectedId)
        ? (selectedId as string)
        : remaining[0]?.id;

    // Count-up percentage — snaps instantly when prefers-reduced-motion.
    const [displayPercent, setDisplayPercent] = useState(reduceMotion ? setup.percent : 0);
    useEffect(() => {
        if (reduceMotion) return;
        const controls = animate(0, setup.percent, {
            duration: 1.1,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (v) => setDisplayPercent(Math.round(v)),
        });
        return () => controls.stop();
    }, [setup.percent, reduceMotion]);

    return (
        <div className="mt-6 pt-4 border-t border-white/5">
            {/* Ring + header */}
            <div className="flex items-center gap-3.5">
                <div className="relative w-14 h-14 shrink-0">
                    <svg viewBox="0 0 64 64" className="w-14 h-14 -rotate-90">
                        <defs>
                            <linearGradient id="setupRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#ff4b00" />
                                <stop offset="100%" stopColor="#ffb07a" />
                            </linearGradient>
                        </defs>
                        <circle cx="32" cy="32" r={RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
                        <motion.circle
                            cx="32"
                            cy="32"
                            r={RING_RADIUS}
                            fill="none"
                            stroke="url(#setupRingGrad)"
                            strokeWidth={5}
                            strokeLinecap="round"
                            strokeDasharray={RING_CIRCUMFERENCE}
                            initial={{ strokeDashoffset: reduceMotion ? RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * setup.percent) / 100 : RING_CIRCUMFERENCE }}
                            animate={{ strokeDashoffset: RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * setup.percent) / 100 }}
                            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                            style={{ filter: "drop-shadow(0 0 5px rgba(255,75,0,0.55))" }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-white tabular-nums">{displayPercent}%</span>
                    </div>
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-[#A7ADBB] uppercase tracking-wider">Setup Progress</p>
                    <p className="text-xs text-[#C3C9D6] mt-0.5">
                        <span className="text-[#ff4b00] font-medium">
                            {setup.remaining.length} step{setup.remaining.length === 1 ? "" : "s"}
                        </span>{" "}
                        to full power
                    </p>
                </div>
            </div>

            {/* Segmented notch bar — one notch per setup item */}
            <div className="mt-3.5 flex gap-1">
                {setup.items.map((item, i) => (
                    <motion.div
                        key={item.id}
                        className={`h-1 flex-1 rounded-full ${
                            item.done
                                ? "bg-gradient-to-r from-[#ff4b00] to-[#ff8a4d] shadow-[0_0_6px_rgba(255,75,0,0.45)]"
                                : "bg-white/[0.06]"
                        }`}
                        initial={{ opacity: reduceMotion ? 1 : 0, scaleY: reduceMotion ? 1 : 0.3 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        transition={{ delay: reduceMotion ? 0 : 0.04 * i, duration: 0.3 }}
                    />
                ))}
            </div>

            {/* Next up checklist — full labels, each one the deep link itself */}
            {remaining.length > 0 && (
                <div className="mt-3.5">
                    <p className="text-[9px] uppercase tracking-wider text-neutral-600 mb-0.5">Next up</p>
                    <ul>
                        {remaining.map((item, idx) => (
                            <motion.li
                                key={item.id}
                                initial={{ opacity: reduceMotion ? 1 : 0, x: reduceMotion ? 0 : -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: reduceMotion ? 0 : 0.25 + 0.07 * idx, duration: 0.35, ease: "easeOut" }}
                                className={`group flex items-center gap-2 py-1.5 px-1.5 -mx-1.5 rounded-lg transition-colors ${
                                    item.id === activeId ? "bg-[#ff4b00]/[0.07]" : "hover:bg-white/[0.03]"
                                }`}
                            >
                                {item.id === activeId ? (
                                    // Pulsing live dot marks the active step (AIStatusPill pattern)
                                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff4b00] opacity-75" />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#ff4b00]" />
                                    </span>
                                ) : (
                                    <span
                                        onClick={() => setSelectedId(item.id)}
                                        className="w-1.5 h-1.5 rounded-full bg-neutral-600 shrink-0 cursor-pointer hover:bg-[#ff4b00] transition-colors"
                                    />
                                )}
                                {item.fixUrl ? (
                                    <Link
                                        href={item.fixUrl}
                                        onClick={() => setSelectedId(item.id)}
                                        className={`flex-1 min-w-0 text-[11px] transition-colors truncate ${
                                            item.id === activeId ? "text-white" : "text-[#C3C9D6] hover:text-white"
                                        }`}
                                    >
                                        {item.label}
                                    </Link>
                                ) : (
                                    <span
                                        onClick={() => setSelectedId(item.id)}
                                        className={`flex-1 min-w-0 text-[11px] transition-colors truncate flex items-center gap-1.5 cursor-pointer ${
                                            item.id === activeId ? "text-white" : "text-[#C3C9D6] hover:text-white"
                                        }`}
                                    >
                                        {item.label}
                                        <span className="text-[9px] text-neutral-600 shrink-0">(auto)</span>
                                    </span>
                                )}
                            </motion.li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

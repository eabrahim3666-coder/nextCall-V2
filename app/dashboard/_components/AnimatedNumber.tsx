"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

type AnimatedNumberProps = {
    value: number;
    /** Custom formatter — receives the running number, returns display text. */
    format?: (n: number) => string;
    duration?: number;
    className?: string;
};

/**
 * Counts a number up from 0 when scrolled into view. Snaps instantly to the
 * final value when prefers-reduced-motion is set (same pattern as the setup
 * progress ring).
 */
export default function AnimatedNumber({
    value,
    format,
    duration = 1.1,
    className,
}: AnimatedNumberProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.5 });
    const reduceMotion = useReducedMotion();
    const [display, setDisplay] = useState(format ? format(reduceMotion ? value : 0) : String(reduceMotion ? value : 0));

    // Keep the formatter out of the effect deps so a parent re-render can't
    // restart a running count-up (inline arrow props get a new identity
    // every render).
    const formatRef = useRef(format);
    formatRef.current = format;

    useEffect(() => {
        const fmt = formatRef.current;
        if (!inView || reduceMotion) {
            setDisplay(fmt ? fmt(value) : String(value));
            return;
        }
        const controls = animate(0, value, {
            duration,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (v) => setDisplay(fmt ? fmt(Math.round(v)) : String(Math.round(v))),
        });
        return () => controls.stop();
    }, [inView, value, duration, reduceMotion]);

    return (
        <span ref={ref} className={className}>
            {display}
        </span>
    );
}

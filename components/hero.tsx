"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Icon } from "@iconify/react"

import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*  Variants                                                          */
/* ------------------------------------------------------------------ */

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}

const container = {
  animate: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
}

/* ------------------------------------------------------------------ */
/*  Hero                                                              */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-ds-bg-primary py-16 md:py-24">
      {/* ---------------------------------------------------------------- */}
      {/* Background Styling                                               */}
      {/* ---------------------------------------------------------------- */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.6) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* Atmospheric gradient orbs */}
        <div className="absolute top-[-20%] right-[-10%] h-[650px] w-[650px] rounded-full bg-ds-accent-primary/[0.05] blur-[140px]" />
        <div className="absolute bottom-[5%] left-[-10%] h-[550px] w-[550px] rounded-full bg-ds-accent-highlight/[0.03] blur-[120px]" />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Hero Content                                                     */}
      {/* ---------------------------------------------------------------- */}
      <motion.div
        className="relative z-10 mx-auto max-w-4xl px-4 text-center"
        variants={container}
        initial="initial"
        animate="animate"
      >
        {/* AI Badge */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-ds-border-primary/80 bg-ds-bg-primary/80 px-4 py-1.5 backdrop-blur-lg">
            <span className="size-1.5 rounded-full bg-ds-state-success" />
            <span className="text-ds-overline font-medium text-ds-text-muted uppercase tracking-[0.08em]">
              AI-Powered Lead Capture
            </span>
          </div>
        </motion.div>

        {/* Headline (Gap from Badge) */}
        <motion.h1
          variants={fadeUp}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 md:mt-8 text-balance text-center text-[clamp(2.5rem,5.5vw,4.25rem)] font-bold leading-[1.08] tracking-[-0.03em] text-ds-text-primary drop-shadow-md"
        >
          Never miss a lead,{" "}
          <span className="bg-linear-to-r from-ds-accent-primary via-ds-accent-secondary to-ds-accent-highlight bg-clip-text text-transparent">
            even after hours
          </span>
        </motion.h1>

        {/* Description (Increased gap from Headline) */}
        <motion.p
          variants={fadeUp}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 md:mt-10 max-w-[640px] mx-auto text-balance text-center text-ds-body text-ds-text-secondary leading-[1.75] drop-shadow-sm font-normal"
        >
          Next Call Chat answers every call and chat when you can&apos;t.
          Capture leads, book appointments, and grow your business — 24/7.
        </motion.p>

        {/* CTAs (Increased gap from Description) */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 md:mt-12 flex flex-row items-center justify-center gap-3 sm:gap-4"
        >
          <Button variant="gradient" size="xl" className="rounded-full shadow-ds-md" asChild>
            <Link href="/dashboard">
              Start Free Trial
              <Icon icon="lucide:arrow-right" width={16} />
            </Link>
          </Button>
          <Button variant="outline" size="xl" className="rounded-full bg-ds-bg-primary/80 backdrop-blur-md border-ds-border-primary/80" asChild>
            <a href="#how-it-works">
              <Icon icon="lucide:play-circle" width={18} />
              See How It Works
            </a>
          </Button>
        </motion.div>

        {/* Trust Indicators (Increased gap from CTAs) */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 md:mt-20 flex items-center justify-center gap-x-6 gap-y-3 flex-wrap"
        >
          {[
            { icon: "lucide:phone-call", label: "24/7 AI Receptionist" },
            { icon: "lucide:target", label: "Never Miss A Lead" },
            { icon: "lucide:zap", label: "Instant Setup" },
            { icon: "lucide:briefcase", label: "Works With Your Business" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 bg-ds-bg-primary/80 px-3.5 py-1.5 rounded-full backdrop-blur-md border border-ds-border-primary/50">
              <Icon
                icon={item.icon}
                width={14}
                className="text-ds-accent-primary"
              />
              <span className="text-ds-caption font-medium text-ds-text-secondary whitespace-nowrap">
                {item.label}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>

    </section>
  )
}

export { Hero }

"use client"

import { motion } from "framer-motion"
import { Icon } from "@iconify/react"
import Link from "next/link"

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}

function FinalCta() {
  return (
    <section className="relative bg-ds-bg-primary py-24 md:py-40 overflow-hidden">
      <div className="pointer-events-none absolute top-[-20%] left-[50%] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-ds-accent-primary/[0.015] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-ds-accent-highlight/[0.01] blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ animate: { transition: { staggerChildren: 0.12 } } }}
          className="mx-auto max-w-3xl"
        >
          <div className="relative rounded-2xl border border-ds-border-primary bg-ds-bg-card p-12 shadow-ds-xl md:p-16 lg:p-20">
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-br from-ds-accent-primary/[0.03] via-ds-accent-secondary/[0.02] to-transparent" />

            <div className="relative z-10 text-center">
              <motion.span
                variants={fadeUp}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 rounded-full border border-ds-accent-primary/20 bg-ds-accent-primary/10 px-4 py-1.5 text-ds-caption font-medium text-ds-accent-primary"
              >
                <Icon icon="lucide:sparkles" width={14} />
                Start today — no credit card required
              </motion.span>

              <motion.h2
                variants={fadeUp}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 text-balance text-center text-[clamp(2rem,4vw,3.5rem)] font-bold leading-[1.15] tracking-[-0.02em] text-ds-text-primary"
              >
                Ready to never{" "}
                <span className="bg-linear-to-r from-ds-accent-primary via-ds-accent-secondary to-ds-accent-highlight bg-clip-text text-transparent">
                  miss a lead?
                </span>
              </motion.h2>

              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mx-auto mt-4 max-w-lg text-ds-body text-ds-text-secondary leading-relaxed"
              >
                Start your free trial today. No credit card required. Set up in
                under 5 minutes.
              </motion.p>

              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
              >
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full bg-ds-text-primary px-8 py-4 text-ds-button font-medium text-ds-bg-primary transition-all duration-300 hover:opacity-90 hover:shadow-ds-lg"
                >
                  Get Started Free
                  <Icon icon="lucide:arrow-right" width={16} />
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export { FinalCta }

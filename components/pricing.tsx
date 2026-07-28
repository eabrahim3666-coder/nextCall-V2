"use client"

import { motion } from "framer-motion"
import { Icon } from "@iconify/react"

import { cn } from "@/lib/utils"

const PLANS = [
  {
    name: "Standard",
    subtitle: "For small businesses getting started with AI",
    price: "$299",
    period: "/month",
    minutes: "200 minutes included + $0.50/min overage",
    badge: null,
    features: [
      "AI answers calls 24/7",
      "Follow-up emails after every call",
      "Appointment booking + email reminders",
      "1 phone number",
      "Call dashboard & basic analytics",
      "Knowledge base training",
      "Custom greeting",
      "Emergency call routing",
      "Daily summary emails",
      "Email support",
    ],
    cta: "outline",
  },
  {
    name: "Premium",
    subtitle: "For growing businesses that need more power",
    price: "$399",
    period: "/month",
    minutes: "500 minutes included + $0.40/min overage",
    badge: "Popular",
    features: [
      "Everything in Standard, plus:",
      "3 phone numbers",
      "Priority call routing rules",
      "Advanced analytics dashboard",
      "Lead value & revenue tracking",
      "Call source breakdown",
      "Conversion funnel",
      "Peak hours heatmap",
      "AI performance score",
      "Priority support chat",
    ],
    cta: "primary",
  },
] as const

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}

function Pricing({ refCode = "" }: { refCode?: string }) {
  return (
    <section
      id="pricing"
      className="relative bg-ds-bg-primary py-24 md:py-32 overflow-hidden"
    >
      <div className="pointer-events-none absolute top-[-15%] left-[10%] h-[500px] w-[500px] rounded-full bg-ds-accent-primary/[0.02] blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[5%] h-[400px] w-[400px] rounded-full bg-ds-accent-secondary/[0.015] blur-[80px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Section header */}
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.span
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-ds-overline font-medium text-ds-accent-primary uppercase tracking-[0.08em]"
          >
            Pricing
          </motion.span>
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-ds-section-heading text-ds-text-primary"
          >
            Simple,{" "}
            <span className="bg-linear-to-r from-ds-accent-primary via-ds-accent-secondary to-ds-accent-highlight bg-clip-text text-transparent">
              transparent
            </span>{" "}
            pricing
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-ds-body text-ds-text-secondary leading-relaxed"
          >
            No hidden fees. No contracts. Cancel anytime. 3-day free trial
            included.
          </motion.p>
        </motion.div>

        {/* Pricing cards */}
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            animate: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
          }}
          className="mt-16 grid gap-6 md:grid-cols-2 max-w-4xl mx-auto"
        >
          {PLANS.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "relative rounded-xl border bg-ds-bg-card p-8 overflow-hidden",
                "transition-all duration-300",
                plan.badge
                  ? "border-ds-border-accent shadow-ds-md"
                  : "border-ds-border-primary shadow-ds-sm hover:shadow-ds-md hover:border-ds-border-hover"
              )}
            >
              {/* Glow for premium */}
              {plan.badge && (
                <div className="pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-full bg-ds-accent-primary/10 blur-[50px]" />
              )}

              <div className="relative z-10">
                {/* Header */}
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h3 className="text-ds-large-heading text-ds-text-primary">
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-ds-small-body text-ds-text-secondary">
                      {plan.subtitle}
                    </p>
                  </div>
                  {plan.badge && (
                    <span className="shrink-0 rounded-full border border-ds-accent-primary/20 bg-ds-accent-primary/10 px-3 py-1 text-ds-overline font-medium uppercase tracking-[0.08em] text-ds-accent-primary">
                      {plan.badge}
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold text-ds-text-primary">
                      {plan.price}
                    </span>
                    <span className="text-ds-small-body text-ds-text-secondary">
                      {plan.period}
                    </span>
                  </div>
                  <p className="mt-1 text-ds-caption text-ds-text-muted">
                    {plan.minutes}
                  </p>
                </div>

                {/* Features */}
                <ul className="mb-8 space-y-3">
                  {plan.features.map((item, i) => {
                    const isLabel = i === 0 && plan.badge
                    return (
                      <li key={i} className="flex items-start gap-3">
                        <span
                          className={cn(
                            "mt-0.5 shrink-0 text-xs",
                            isLabel
                              ? "text-ds-accent-primary"
                              : "text-ds-state-success"
                          )}
                        >
                          {isLabel ? "+" : <Icon icon="lucide:check" width={14} />}
                        </span>
                        <span
                          className={cn(
                            "text-ds-small-body",
                            isLabel
                              ? "text-ds-accent-primary font-medium"
                              : "text-ds-text-secondary"
                          )}
                        >
                          {item}
                        </span>
                      </li>
                    )
                  })}
                </ul>

                {/* CTA */}
                <a
                  href={`/dashboard${refCode ? `?ref=${refCode}` : ""}`}
                  className={cn(
                    "flex w-full items-center justify-center rounded-full px-6 py-3.5 text-ds-button font-medium transition-all duration-300",
                    plan.cta === "primary"
                      ? "bg-ds-text-primary text-ds-bg-primary hover:opacity-90"
                      : "border border-ds-border-primary bg-ds-bg-card text-ds-text-primary hover:bg-ds-bg-muted"
                  )}
                >
                  Start Free Trial
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}

export { Pricing }

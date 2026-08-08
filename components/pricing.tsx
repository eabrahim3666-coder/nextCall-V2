"use client"

import { motion } from "framer-motion"
import { Icon } from "@iconify/react"

import { cn } from "@/lib/utils"

const PLANS = [
  {
    name: "Free Trial",
    subtitle: "Try your AI receptionist risk-free for 3 days.",
    price: "$0",
    period: "/3 days",
    minutes: "50 minutes included",
    badge: "Free",
    free: true,
    label: null,
    ctaText: "Start Free Trial",
    cta: "outline",
    features: [
      "AI answers calls 24/7",
      "1 phone number",
      "Basic call dashboard",
      "50 minutes included",
    ],
  },
  {
    name: "Standard",
    subtitle: "For small businesses getting started with AI",
    price: "$299",
    period: "/month",
    minutes: "200 minutes included · $0.50/min overage",
    badge: "Best Value",
    free: false,
    label: null,
    ctaText: "Get Standard",
    cta: "outline",
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
  },
  {
    name: "Premium",
    subtitle: "For growing businesses that need more power",
    price: "$399",
    period: "/month",
    minutes: "500 minutes included · $0.40/min overage",
    badge: "Most Popular",
    free: false,
    label: "Everything in Standard, plus:",
    ctaText: "Get Premium",
    cta: "primary",
    features: [
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
      <div className="pointer-events-none absolute top-[-15%] left-[10%] h-[500px] w-[500px] rounded-full bg-ds-accent-primary/[0.03] blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[5%] h-[400px] w-[400px] rounded-full bg-ds-accent-secondary/[0.02] blur-[80px]" />

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
            No hidden fees. No contracts. Cancel anytime. Start with a free
            3-day trial — no credit card required.
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
          className="mt-16 grid gap-6 lg:grid-cols-3 max-w-6xl mx-auto items-stretch"
        >
          {PLANS.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "relative flex flex-col rounded-[2rem] border p-7 overflow-hidden",
                "transition-all duration-300",
                plan.free
                  ? "border-dashed border-ds-border-primary bg-ds-bg-card/60 hover:border-ds-border-hover"
                  : plan.badge
                    ? "border-ds-accent-primary/40 bg-gradient-to-b from-ds-accent-primary/[0.07] via-ds-bg-card to-ds-bg-card shadow-ds-md"
                    : "border-ds-border-primary bg-ds-bg-card shadow-ds-sm hover:shadow-ds-md hover:border-ds-border-hover hover:-translate-y-1"
              )}
            >
              {/* Glow for highlighted plan */}
              {plan.badge && (
                <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-ds-accent-primary/20 blur-[60px]" />
              )}

              <div className="relative z-10 flex flex-col flex-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-ds-large-heading text-ds-text-primary">
                      {plan.name}
                    </h3>
                    <p className="mt-1.5 text-ds-small-body text-ds-text-secondary leading-relaxed">
                      {plan.subtitle}
                    </p>
                  </div>
                  {plan.badge && (
                    <span className="shrink-0 rounded-full border border-ds-accent-primary/30 bg-ds-accent-primary/10 px-3 py-1 text-ds-overline font-semibold uppercase tracking-[0.08em] text-ds-accent-primary">
                      {plan.badge}
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="mt-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-6xl font-semibold tracking-tight text-ds-text-primary">
                      {plan.price}
                    </span>
                    <span className="text-ds-small-body text-ds-text-secondary">
                      {plan.period}
                    </span>
                  </div>
                  <p className="mt-1.5 text-ds-caption text-ds-text-muted">
                    {plan.minutes}
                  </p>
                </div>

                {/* Divider */}
                <div className="my-5 h-px w-full bg-linear-to-r from-transparent via-ds-border-primary to-transparent" />

                {/* Features */}
                <ul className="flex-1 space-y-2.5">
                  {plan.label && (
                    <li className="flex items-start gap-3 pb-2">
                      <span className="mt-0.5 text-xs font-bold text-ds-accent-primary">
                        +
                      </span>
                      <span className="text-ds-small-body font-semibold text-ds-accent-primary">
                        {plan.label}
                      </span>
                    </li>
                  )}
                  {plan.features.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                          plan.free
                            ? "bg-ds-state-success/10 text-ds-state-success"
                            : "bg-ds-accent-primary/10 text-ds-accent-secondary"
                        )}
                      >
                        <Icon icon="lucide:check" width={11} />
                      </span>
                      <span className="text-ds-small-body text-ds-text-secondary leading-relaxed">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <a
                  href={`/dashboard${refCode ? `?ref=${refCode}` : ""}`}
                  className={cn(
                    "mt-5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-ds-button font-semibold transition-all duration-300",
                    plan.cta === "primary"
                      ? "bg-ds-text-primary text-ds-bg-primary shadow-ds-md hover:opacity-90"
                      : plan.free
                        ? "border border-ds-state-success/25 bg-ds-state-success/5 text-ds-text-primary hover:bg-ds-state-success/10"
                        : "border border-ds-border-primary bg-ds-bg-card text-ds-text-primary hover:bg-ds-bg-muted"
                  )}
                >
                  {plan.ctaText}
                  {plan.cta === "primary" && (
                    <Icon icon="lucide:arrow-right" width={15} />
                  )}
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

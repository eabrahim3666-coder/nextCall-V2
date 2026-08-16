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
      "Appointment booking + Google Calendar sync",
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
      "AI text-back — customers can text your number",
      "Follow-up emails after every call",
      "Appointment booking + email reminders",
      "1 phone number",
      "Call dashboard, transcripts & recordings",
      "Knowledge base training",
      "Custom greeting & tone",
      "Instant price quotes from your price list",
      "Emergency call routing",
      "Daily & weekly summary emails",
      "Email support",
    ],
  },
  {
    name: "Premium",
    subtitle: "For growing businesses\nthat want to win every call",
    price: "$399",
    period: "/month",
    minutes: "500 minutes included · $0.40/min overage",
    badge: "Most Popular",
    free: false,
    label: "Includes everything in Standard, plus:",
    ctaText: "Get Premium",
    cta: "primary",
    features: [
      "500 minutes — 2.5× more call handling",
      "3 phone numbers (+ buy more anytime)",
      "Hot-lead instant alerts",
      "Missed-call auto-SMS",
      "Advanced analytics: lead value & revenue tracking",
      "Conversion funnel, peak-hours heatmap & AI performance score",
      "Marketing channel / call source breakdown",
      "WhatsApp, Facebook & Instagram chat-back",
      "Zapier / Make / n8n webhooks",
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
      className="relative bg-ds-bg-primary py-20 md:py-24 overflow-hidden"
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
          className="mt-10 grid gap-4 lg:grid-cols-3 max-w-6xl mx-auto items-stretch"
        >
          {PLANS.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "relative flex flex-col rounded-[1.5rem] border p-5 overflow-hidden",
                "transition-all duration-300",
                plan.free
                  ? "border-dashed border-ds-border-primary bg-ds-bg-card/60 hover:border-ds-border-hover"
                  : "border-ds-border-primary bg-ds-bg-card shadow-ds-sm hover:shadow-ds-md hover:border-ds-border-hover hover:-translate-y-1"
              )}
            >
              <div className="relative z-10 flex flex-col flex-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-ds-large-heading text-ds-text-primary">
                      {plan.name}
                    </h3>
                    <p className="mt-1 whitespace-pre-line text-ds-small-body text-ds-text-secondary leading-snug">
                      {plan.subtitle}
                    </p>
                  </div>
                  {plan.badge && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-3 py-1 text-ds-overline font-semibold uppercase tracking-[0.08em]",
                        plan.free
                          ? "border-ds-border-primary bg-ds-bg-muted text-ds-text-muted"
                          : "border-ds-border-primary bg-ds-accent-primary/5 text-ds-text-secondary"
                      )}
                    >
                      {plan.badge}
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="mt-2.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-5xl font-semibold tracking-tight text-ds-text-primary">
                      {plan.price}
                    </span>
                    <span className="text-ds-small-body text-ds-text-secondary">
                      {plan.period}
                    </span>
                  </div>
                  <p className="mt-0.5 text-ds-caption text-ds-text-muted">
                    {plan.minutes}
                  </p>
                </div>

                {/* Divider */}
                <div className="my-3 h-px w-full bg-linear-to-r from-transparent via-ds-border-primary to-transparent" />

                {/* Features */}
                <ul className="flex-1 space-y-1.5">
                  {plan.label && (
                    <li className="flex items-start gap-3 pb-1.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ds-accent-primary/10 text-ds-accent-secondary">
                        <Icon icon="lucide:check" width={11} />
                      </span>
                      <span className="text-ds-small-body font-semibold text-ds-accent-secondary">
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
                    "mt-3.5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-2.5 text-ds-button font-semibold transition-all duration-300",
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

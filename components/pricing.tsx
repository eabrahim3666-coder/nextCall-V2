"use client"

import { motion } from "framer-motion"
import { Icon } from "@iconify/react"

import { cn } from "@/lib/utils"

type PlanFeature = { t: string; x?: boolean }

const PLANS = [
  {
    name: "Free Trial",
    subtitle: "Try your AI receptionist risk-free for 3 days.",
    price: "$0",
    period: "/3 days",
    minutes: "50 minutes included",
    badge: "Free",
    free: true,
    featured: false,
    anchor: null,
    label: null,
    ctaText: "Start Free Trial",
    cta: "outline",
    features: [
      { t: "AI answers calls 24/7" },
      { t: "1 phone number" },
      { t: "Appointment booking + Google Calendar sync" },
      { t: "Basic call dashboard" },
      { t: "50 minutes included" },
    ] as PlanFeature[],
  },
  {
    name: "Standard",
    subtitle: "For small businesses getting started with AI",
    price: "$299",
    period: "/month",
    minutes: "200 minutes included · $0.50/min overage",
    badge: "Best Value",
    free: false,
    featured: false,
    anchor: null,
    label: null,
    ctaText: "Get Standard",
    cta: "outline",
    features: [
      { t: "AI answers calls 24/7" },
      { t: "AI text-back — customers can text your number" },
      { t: "Follow-up emails after every call" },
      { t: "Appointment booking + email reminders" },
      { t: "1 phone number" },
      { t: "Call dashboard, transcripts & recordings" },
      { t: "Knowledge base training" },
      { t: "Custom greeting & tone" },
      { t: "Instant price quotes from your price list" },
      { t: "Emergency call routing" },
      { t: "Daily & weekly summary emails" },
      { t: "Email support" },
    ] as PlanFeature[],
  },
  {
    name: "Premium",
    subtitle: "For growing businesses that want to win every call",
    price: "$399",
    period: "/month",
    minutes: "500 minutes included · $0.40/min overage",
    badge: "Most Popular",
    free: false,
    featured: true,
    anchor: "≈ $13/day — one recovered lead pays for the plan",
    label: "Includes everything in Standard, plus:",
    ctaText: "Get Premium",
    cta: "primary",
    features: [
      { t: "500 minutes — 2.5× more call handling", x: true },
      { t: "3 phone numbers (+ buy more anytime)", x: true },
      { t: "Hot-lead instant alerts", x: true },
      { t: "Missed-call auto-SMS", x: true },
      { t: "Advanced analytics: lead value & revenue tracking", x: true },
      { t: "Marketing channel / call source breakdown", x: true },
      { t: "Conversion funnel + peak-hours heatmap", x: true },
      { t: "AI performance score", x: true },
      { t: "WhatsApp, Facebook & Instagram chat-back", x: true },
      { t: "Zapier / Make / n8n webhooks", x: true },
      { t: "Priority support chat", x: true },
      { t: "Cheaper overage & minute packs", x: true },
    ] as PlanFeature[],
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
      <div className="pointer-events-none absolute bottom-[-10%] right-[5%] h-[400px] w-[400px] rounded-full bg-ds-accent-secondary/[0.03] blur-[80px]" />

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
                plan.featured
                  ? // Premium — the hero card
                    "border-ds-accent-secondary/60 bg-gradient-to-b from-ds-accent-secondary/[0.10] via-ds-bg-card to-ds-bg-card shadow-ds-lg shadow-ds-glow-secondary lg:scale-[1.04] lg:-translate-y-2"
                  : plan.free
                    ? "border-dashed border-ds-border-primary bg-ds-bg-card/60 hover:border-ds-border-hover"
                    : "border-ds-border-primary bg-ds-bg-card shadow-ds-sm hover:shadow-ds-md hover:border-ds-border-hover hover:-translate-y-1"
              )}
            >
              {/* Glow for the featured (Premium) plan */}
              {plan.featured && (
                <>
                  <div className="pointer-events-none absolute -top-20 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-ds-accent-secondary/25 blur-[70px]" />
                  <div className="pointer-events-none absolute -bottom-20 -right-16 h-44 w-44 rounded-full bg-ds-accent-highlight/15 blur-[70px]" />
                </>
              )}

              {/* Crown badge for the featured plan */}
              {plan.featured && (
                <div className="pointer-events-none absolute inset-x-0 -top-px mx-auto flex justify-center lg:-translate-y-1/2">
                  <span className="rounded-full bg-linear-to-r from-ds-accent-secondary to-ds-accent-highlight px-4 py-1.5 text-ds-overline font-bold uppercase tracking-[0.08em] text-white shadow-ds-glow-secondary">
                    {plan.badge}
                  </span>
                </div>
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
                  {plan.badge && !plan.featured && (
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
                <div className="mt-4">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={cn(
                        "text-6xl font-semibold tracking-tight text-ds-text-primary",
                        plan.featured && "bg-linear-to-r from-ds-accent-primary via-ds-accent-secondary to-ds-accent-highlight bg-clip-text text-transparent"
                      )}
                    >
                      {plan.price}
                    </span>
                    <span className="text-ds-small-body text-ds-text-secondary">
                      {plan.period}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-1.5 text-ds-caption",
                      plan.featured ? "text-ds-accent-secondary font-medium" : "text-ds-text-muted"
                    )}
                  >
                    {plan.minutes}
                  </p>
                  {plan.anchor && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-ds-accent-secondary/25 bg-ds-accent-secondary/5 px-3 py-1 text-ds-caption font-medium text-ds-text-secondary">
                      <Icon icon="lucide:sprout" width={12} className="text-ds-accent-secondary" />
                      {plan.anchor}
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div
                  className={cn(
                    "my-5 h-px w-full bg-linear-to-r from-transparent via-ds-border-primary to-transparent",
                    plan.featured && "via-ds-accent-secondary/40"
                  )}
                />

                {/* Features */}
                <ul className="flex-1 space-y-2.5">
                  {plan.label && (
                    <li className={cn("flex items-start gap-3 pb-2", plan.featured && "border-b border-ds-border-primary/60")}>
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-ds-accent-secondary to-ds-accent-highlight text-white">
                        <Icon icon="lucide:check" width={11} />
                      </span>
                      <span className="text-ds-small-body font-semibold text-ds-text-primary">
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
                            : item.x
                              ? "bg-linear-to-br from-ds-accent-secondary/20 to-ds-accent-highlight/20 text-ds-accent-secondary"
                              : "bg-ds-accent-primary/10 text-ds-accent-secondary"
                        )}
                      >
                        <Icon
                          icon={item.x ? "lucide:gem" : "lucide:check"}
                          width={11}
                        />
                      </span>
                      <span
                        className={cn(
                          "text-ds-small-body leading-relaxed",
                          item.x
                            ? "font-medium text-ds-text-primary"
                            : plan.free
                              ? "text-ds-text-secondary"
                              : "text-ds-text-secondary"
                        )}
                      >
                        {item.t}
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
                      ? "bg-linear-to-r from-ds-accent-primary via-ds-accent-secondary to-ds-accent-highlight text-white shadow-ds-glow-secondary hover:opacity-95 hover:shadow-ds-xl"
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

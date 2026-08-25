"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

import { Reveal, StaggerGroup, staggerItem } from "@/components/Reveal";
import { PerspectiveCard } from "@/components/PerspectiveCard";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Free Trial",
    subtitle: "Try your AI receptionist risk-free for 3 days.",
    price: "$0",
    period: "/3 days",
    minutes: "50 minutes included",
    badge: "Free",
    free: true,
    highlight: false,
    label: null,
    ctaText: "Start Free Trial",
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
    highlight: true,
    label: null,
    ctaText: "Get Standard",
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
    highlight: false,
    label: "Includes everything in Standard, plus:",
    ctaText: "Get Premium",
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
];

function Pricing({ refCode = "" }: { refCode?: string }) {
  return (
    <section
      id="pricing"
      className="section-full relative overflow-hidden py-20 sm:py-24 flex flex-col justify-center"
    >
      {/* Ambient background — STATIC */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-5%] w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(190,195,205,0.14)_0%,transparent_70%)] blur-[56px] opacity-40" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(140,145,155,0.1)_0%,transparent_70%)] blur-[64px] opacity-40" />
      </div>

      {/* Grid lines backdrop — STATIC */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="grain" />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 w-full">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <Reveal>
            <span className="text-xs uppercase tracking-[0.25em] text-[#D3D8E2] font-medium">
              Pricing
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="section-headline-shine mt-3 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
              Simple, transparent pricing
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 text-base sm:text-lg text-zinc-400">
              No hidden fees. No contracts. Cancel anytime. Start with a free
              3-day trial — no credit card required.
            </p>
          </Reveal>
        </div>

        {/* Pricing cards */}
        <StaggerGroup
          className="grid gap-6 lg:grid-cols-3 max-w-6xl mx-auto items-stretch"
          stagger={0.15}
          delay={0.1}
        >
          {PLANS.map((plan) => (
            <motion.div
              key={plan.name}
              variants={staggerItem}
              className="h-full"
            >
              <PerspectiveCard
                maxTilt={0}
                scale={1}
                glare={false}
                hover={false}
                className="relative flex flex-col rounded-3xl p-7 sm:p-8 overflow-hidden h-full glass-card no-hover"
              >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              )}

              <div className="relative z-10 flex flex-col flex-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-semibold text-white">
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-400 leading-snug whitespace-pre-line">
                      {plan.subtitle}
                    </p>
                  </div>
                  {plan.badge && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
                        plan.highlight
                          ? "bg-purple-500/20 text-purple-200 border border-purple-400/30"
                          : plan.free
                            ? "border border-white/10 bg-white/5 text-zinc-400"
                            : "border border-white/10 bg-white/5 text-zinc-300"
                      )}
                    >
                      {plan.badge}
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="mt-2.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-5xl font-semibold tracking-tight text-white">
                      {plan.price}
                    </span>
                    <span className="text-sm text-zinc-400">{plan.period}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">{plan.minutes}</p>
                </div>

                {/* Divider */}
                <div className="my-3 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                {/* Features */}
                <ul className="flex-1 space-y-1.5">
                  {plan.label && (
                    <li className="flex items-start gap-3 pb-1.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-purple-300">
                        <Check className="w-3 h-3" />
                      </span>
                      <span className="text-sm font-semibold text-purple-200">
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
                            ? "bg-purple-500/15 text-purple-300"
                            : "bg-purple-500/15 text-purple-300"
                        )}
                      >
                        <Check className="w-3 h-3" />
                      </span>
                      <span className="text-sm text-zinc-300 leading-relaxed">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <a
                  href={`/dashboard${refCode ? `?ref=${refCode}` : ""}`}
                  className={cn(
                    "mt-3.5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03]",
                    plan.free
                      ? "border border-emerald-500/25 bg-emerald-500/5 text-white hover:bg-emerald-500/10 hover:border-emerald-400/50"
                      : "border border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/30 hover:shadow-[0_16px_40px_-12px_rgba(255,255,255,0.15)]"
                  )}
                >
                  {plan.ctaText}
                  {plan.free && <Sparkles className="w-4 h-4 text-purple-300" />}
                </a>
              </div>
              </PerspectiveCard>
            </motion.div>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

export { Pricing };

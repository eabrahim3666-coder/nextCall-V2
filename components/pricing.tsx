"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

import { PerspectiveCard } from "@/components/PerspectiveCard";
import { cn } from "@/lib/utils";

const PRICING_INTRO_CSS = `
.pricing-box {
  background-image: linear-gradient(var(--ga, 135deg), #141417 0%, #000000 62%);
  border-radius: 16px;
  border: none;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease, filter 0.35s ease;
}
.pricing-box:hover, .pricing-box:active {
  transform: translateY(-4px);
  filter: brightness(1.15);
  box-shadow: 0 18px 44px -16px rgba(255, 75, 0, 0.22), 0 10px 26px -14px rgba(0, 0, 0, 0.85);
}
@media (max-width: 640px) {
  .pricing-box {
    background-image: linear-gradient(180deg, #161619 0%, #000000 55%) !important;
  }
}
@media (hover: none) {
  .pricing-box:active {
    transform: translateY(-4px);
    filter: brightness(1.15);
    box-shadow: 0 18px 44px -16px rgba(255, 75, 0, 0.22), 0 10px 26px -14px rgba(0, 0, 0, 0.85);
  }
}
.pricing-sheen-bar {
  position: absolute;
  top: -15%;
  bottom: -15%;
  left: 0;
  width: 42%;
  transform: translateX(-150%) skewX(-14deg);
  background: linear-gradient(100deg, rgba(255,75,0,0) 0%, rgba(255,75,0,0.05) 35%, rgba(255,75,0,0.13) 50%, rgba(255,75,0,0.05) 65%, rgba(255,75,0,0) 100%);
  will-change: transform;
}
@media (prefers-reduced-motion: no-preference) {
  .pricing-section:not(.pricing-play) :is(.pricing-box, .pricing-box-item, .pricing-feature, .pricing-kicker, .pricing-sub, .pricing-sheen) {
    opacity: 0;
  }
  .pricing-section:not(.pricing-play) .pricing-word {
    opacity: 0;
    transform: translateY(115%);
  }
  .pricing-section:not(.pricing-play) .pricing-box {
    transition: none;
  }
  .pricing-play .pricing-kicker {
    animation: pricing-kicker 1.2s cubic-bezier(0.22, 1, 0.36, 1) 180ms backwards;
  }
  .pricing-play .pricing-word {
    animation: pricing-word 1.0s cubic-bezier(0.22, 1, 0.36, 1) var(--wd) backwards;
  }
  .pricing-play .pricing-sub {
    animation: pricing-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) 650ms backwards;
  }
  .pricing-play .pricing-grid {
    animation: pricing-grid 2.0s cubic-bezier(0.22, 1, 0.36, 1) 500ms backwards;
  }
  /* Stage 1 â€” the box/shell itself loads first (clean, quick settle). */
  .pricing-play .pricing-box {
    animation: pricing-card 0.8s cubic-bezier(0.22, 1, 0.36, 1) var(--fd) backwards;
    will-change: transform, opacity, filter;
  }
  /* Stage 2 â€” content rises into the landed box, block by block. */
  .pricing-play .pricing-box-item {
    animation: pricing-item 0.7s cubic-bezier(0.22, 1, 0.36, 1) var(--id) backwards;
    will-change: transform, opacity;
  }
  .pricing-play .pricing-divider {
    animation: pricing-divider 0.6s cubic-bezier(0.22, 1, 0.36, 1) var(--id) backwards;
    transform-origin: left center;
  }
  .pricing-play .pricing-feature {
    animation: pricing-feature 0.5s cubic-bezier(0.22, 1, 0.36, 1) var(--id) backwards;
  }
  .pricing-play .pricing-sheen-bar {
    animation: pricing-sheen-bar 1.3s cubic-bezier(0.22, 1, 0.36, 1) 2550ms backwards;
  }
}
@keyframes pricing-kicker {
  from { opacity: 0; letter-spacing: 0.55em; transform: translateY(10px); }
  to { opacity: 1; letter-spacing: 0.3em; transform: translateY(0); }
}
@keyframes pricing-word {
  from { transform: translateY(115%); }
  to { transform: translateY(0); }
}
@keyframes pricing-rise {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pricing-grid {
  from { opacity: 0.5; transform: scale(1.045) translateY(20px); filter: blur(7px); }
  to { opacity: 1; transform: none; filter: blur(0); }
}
@keyframes pricing-card {
  0% { opacity: 0; transform: translate(var(--fx), var(--fy)) rotate(var(--fr)) scale(var(--fs)); filter: blur(6px); }
  30% { opacity: 1; filter: blur(0); }
  100% { opacity: 1; transform: translate(0,0) rotate(0deg) scale(1); filter: blur(0); }
}
@keyframes pricing-item {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pricing-divider {
  from { opacity: 0; transform: scaleX(0); }
  to { opacity: 1; transform: scaleX(1); }
}
@keyframes pricing-feature {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes pricing-sheen-bar {
  from { transform: translateX(-150%) skewX(-14deg); }
  to { transform: translateX(350%) skewX(-14deg); }
}
`;

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
    ga: "135deg",
    fx: -150,
    fy: -60,
    fr: -6,
    fs: 0.84,
  },
  {
    name: "Standard",
    subtitle: "For small businesses getting started with AI",
    price: "$299",
    period: "/month",
    minutes: "200 minutes included Â· $0.50/min overage",
    badge: "Best Value",
    free: false,
    highlight: true,
    label: null,
    ctaText: "Get Standard",
    features: [
      "AI answers calls 24/7",
      "AI text-back â€” customers can text your number",
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
    ga: "205deg",
    fx: 0,
    fy: -80,
    fr: 3,
    fs: 0.85,
  },
  {
    name: "Premium",
    subtitle: "For growing businesses\nthat want to win every call",
    price: "$399",
    period: "/month",
    minutes: "500 minutes included Â· $0.40/min overage",
    badge: "Most Popular",
    free: false,
    highlight: false,
    label: "Includes everything in Standard, plus:",
    ctaText: "Get Premium",
    features: [
      "500 minutes â€” 2.5Ã— more call handling",
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
    ga: "315deg",
    fx: 150,
    fy: -60,
    fr: 6,
    fs: 0.82,
  },
];

const TITLE_WORDS = ["Simple,", "transparent", "pricing"] as const;
const CARD_BASE = 700;
const CARD_STAGGER = 130;
// Stage-2 content timing (ms). Content starts after the box shell has mostly
// landed, then each block rises in and each feature row slips into place.
const CONTENT_START = 520; // ms after the box begins its entrance
const CONTENT_STAGGER = 100; // ms between major content blocks
const FEATURE_STAGGER = 55; // ms between feature rows
const CTA_GAP = 80; // ms after the last feature row

function Pricing({ refCode = "" }: { refCode?: string }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPlaying(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className={`pricing-section section-full relative overflow-hidden py-20 sm:py-24 flex flex-col justify-center ${playing ? "pricing-play" : ""}`}
    >
      <style dangerouslySetInnerHTML={{ __html: PRICING_INTRO_CSS }} />
      <noscript
        dangerouslySetInnerHTML={{
          __html:
            "<style>.pricing-section:not(.pricing-play) :is(.pricing-box,.pricing-box-item,.pricing-feature,.pricing-kicker,.pricing-sub,.pricing-word){opacity:1!important;transform:none!important}</style>",
        }}
      />
      {/* Ambient background â€” STATIC */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(12,12,14,0.45)_0%,transparent_60%)] opacity-30" />
        <div className="absolute inset-0 bg-[linear-gradient(315deg,rgba(12,12,14,0.4)_0%,transparent_60%)] opacity-30" />
      </div>

      {/* Grid lines backdrop â€” STATIC */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="grain" />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 w-full">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <div className="pricing-kicker flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D3D8E2]">
            <span aria-hidden className="h-px w-8 bg-white/15" />
            Pricing
            <span aria-hidden className="h-px w-8 bg-white/15" />
          </div>
          <h2 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight text-white">
            {TITLE_WORDS.map((word, i) => (
              <span key={word} className="-mb-2 inline-block overflow-hidden pb-2 align-bottom">
                <span
                  className="pricing-word inline-block"
                  style={{ "--wd": `${220 + i * 110}ms` } as CSSProperties}
                >
                  {word}
                  {i < TITLE_WORDS.length - 1 ? "\u00A0" : ""}
                </span>
              </span>
            ))}
          </h2>
          <p className="pricing-sub mt-5 text-base sm:text-lg text-zinc-400">
            No hidden fees. No contracts. Cancel anytime. Start with a free
            3-day trial â€” no credit card required.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="pricing-grid relative grid gap-6 lg:grid-cols-3 max-w-6xl mx-auto items-stretch">
          {PLANS.map((plan, idx) => {
            const cardDelay = CARD_BASE + idx * CARD_STAGGER;
            const featOffset = plan.label ? 1 : 0;
            const contentBase = cardDelay + CONTENT_START;
            const featBase = contentBase + CONTENT_STAGGER * 3;
            const ctaDelay =
              featBase + (featOffset + plan.features.length) * FEATURE_STAGGER + CTA_GAP;
            return (
            <div
              key={plan.name}
              style={
                {
                  "--ga": plan.ga,
                  "--fd": `${cardDelay}ms`,
                  "--fx": `${plan.fx}px`,
                  "--fy": `${plan.fy}px`,
                  "--fr": `${plan.fr}deg`,
                  "--fs": plan.fs,
                } as CSSProperties
              }
            >
              <PerspectiveCard
                maxTilt={0}
                scale={1}
                glare={false}
                hover={false}
                className="pricing-box relative flex flex-col rounded-3xl p-7 sm:p-8 overflow-hidden h-full"
              >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              )}

              <div className="relative z-10 flex flex-col flex-1">
                {/* Header */}
                <div
                  className="pricing-box-item flex items-start justify-between gap-3"
                  style={{ "--id": `${contentBase}ms` } as CSSProperties}
                >
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
                          ? "bg-[#ff4b00]/20 text-[#ff4b00] border border-[#ff4b00]/30"
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
                <div
                  className="pricing-box-item mt-2.5"
                  style={{ "--id": `${contentBase + CONTENT_STAGGER}ms` } as CSSProperties}
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-5xl font-semibold tracking-tight text-white">
                      {plan.price}
                    </span>
                    <span className="text-sm text-zinc-400">{plan.period}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">{plan.minutes}</p>
                </div>

                {/* Divider */}
                <div
                  className="pricing-box-item pricing-divider my-3 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  style={{ "--id": `${contentBase + CONTENT_STAGGER * 2}ms` } as CSSProperties}
                />

                {/* Features */}
                <ul
                  className="pricing-box-item flex-1 space-y-1.5"
                  style={{ "--id": `${featBase}ms` } as CSSProperties}
                >
                  {plan.label && (
                    <li
                      className="pricing-feature flex items-start gap-3 pb-1.5"
                      style={{ "--id": `${featBase}ms` } as CSSProperties}
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff4b00]/15 text-[#ff4b00]">
                        <Check className="w-3 h-3" />
                      </span>
                      <span className="text-sm font-semibold text-[#ff4b00]">
                        {plan.label}
                      </span>
                    </li>
                  )}
                  {plan.features.map((item, i) => (
                    <li
                      key={i}
                      className="pricing-feature flex items-start gap-3"
                      style={
                        {
                          "--id": `${featBase + (featOffset + i) * FEATURE_STAGGER}ms`,
                        } as CSSProperties
                      }
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                          plan.free
                            ? "bg-[#ff4b00]/15 text-[#ff4b00]"
                            : "bg-[#ff4b00]/15 text-[#ff4b00]"
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
                    "pricing-box-item mt-3.5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03]",
                    plan.free
                      ? "border border-emerald-500/25 bg-emerald-500/5 text-white hover:bg-emerald-500/10 hover:border-emerald-400/50"
                      : "border border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/30 hover:shadow-[0_16px_40px_-12px_rgba(255,255,255,0.15)]"
                  )}
                  style={{ "--id": `${ctaDelay}ms` } as CSSProperties}
                >
                  {plan.ctaText}
                </a>
              </div>
              </PerspectiveCard>
            </div>
            );
          })}
          <div aria-hidden="true" className="pricing-sheen pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
            <div className="pricing-sheen-bar" />
          </div>
        </div>
      </div>
    </section>
  );
}

export { Pricing };

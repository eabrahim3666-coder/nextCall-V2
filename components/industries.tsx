"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  HeartPulse,
  Scissors,
  Scale,
  Building2,
  UtensilsCrossed,
  Car,
  Wrench,
  Dumbbell,
  Briefcase,
  ShoppingCart,
  Globe,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";

/* =====================================================================
   EMBEDDED STYLES — everything this section needs, zero globals.css edits.
   (All rules are namespaced ind-* so they can't clash with your site.)
   Requires: Tailwind (layout utilities used in JSX) + lucide-react.
   ===================================================================== */
const INDUSTRIES_CSS = `
/* ---- Card skin: randomized warm-black gradient, borderless ---- */
.ind-card {
  background-image: linear-gradient(var(--ga, 135deg), #0a0604 0%, #000000 62%);
  transition:
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.35s ease,
    filter 0.35s ease;
}

/* ---- Hover: slight lift + darkish orange glow only ---- */
.ind-card:hover {
  transform: translateY(-4px);
  filter: brightness(1.15);
  box-shadow:
    0 18px 44px -16px rgba(255, 75, 0, 0.22),
    0 10px 26px -14px rgba(0, 0, 0, 0.85);
}
@media (max-width: 640px) {
  .ind-card {
    background-image: linear-gradient(180deg, #0a0604 0%, #000000 55%) !important;
  }
}

/* ---- Sheen bar rests off-screen left, clipped by its wrapper ---- */
.ind-sheen-bar {
  position: absolute;
  top: -15%;
  bottom: -15%;
  left: 0;
  width: 42%;
  transform: translateX(-150%) skewX(-14deg);
  background: linear-gradient(
    100deg,
    rgba(255, 75, 0, 0) 0%,
    rgba(255, 75, 0, 0.05) 35%,
    rgba(255, 75, 0, 0.13) 50%,
    rgba(255, 75, 0, 0.05) 65%,
    rgba(255, 75, 0, 0) 100%
  );
  will-change: transform;
}

@media (prefers-reduced-motion: no-preference) {
  /* Pre-play: everything waits hidden (no flash before hydration). */
  .ind-section:not(.ind-play)
    :is(.ind-card, .ind-icon, .ind-title, .ind-desc, .ind-kicker, .ind-sub) {
    opacity: 0;
  }
  .ind-section:not(.ind-play) .ind-word {
    opacity: 0;
    transform: translateY(115%);
  }
  .ind-section:not(.ind-play) .ind-sheen {
    opacity: 0;
  }
  /* Instant reset when replaying (no fade-out drift). */
  .ind-section:not(.ind-play) .ind-card {
    transition: none;
  }

  /* Header choreography */
  .ind-play .ind-kicker {
    animation: ind-kicker 0.9s cubic-bezier(0.22, 1, 0.36, 1) 60ms backwards;
  }
  .ind-play .ind-word {
    animation: ind-word 0.75s cubic-bezier(0.22, 1, 0.36, 1) var(--wd)
      backwards;
  }
  .ind-play .ind-sub {
    animation: ind-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) 430ms backwards;
  }

  /* Grid rack-focus */
  .ind-play .ind-grid {
    animation: ind-grid 1.6s cubic-bezier(0.22, 1, 0.36, 1) 320ms backwards;
  }

  /* Boxes fly in and reconstruct (elastic overshoot landing) */
  .ind-play .ind-card {
    animation: ind-card 0.85s cubic-bezier(0.19, 1.14, 0.29, 1) var(--fd)
      backwards;
    will-change: transform, opacity, filter;
  }

  /* Content materializes inside each box */
  .ind-play .ind-icon {
    animation: ind-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)
      calc(var(--fd) + 520ms) backwards;
  }
  .ind-play .ind-title {
    animation: ind-rise 0.6s cubic-bezier(0.22, 1, 0.36, 1)
      calc(var(--fd) + 640ms) backwards;
  }
  .ind-play .ind-desc {
    animation: ind-rise 0.65s cubic-bezier(0.22, 1, 0.36, 1)
      calc(var(--fd) + 760ms) backwards;
  }

  /* Light sweep across the assembled grid */
  .ind-play .ind-sheen-bar {
    animation: ind-sheen-bar 1.15s ease-in-out 1750ms backwards;
  }
}

@keyframes ind-kicker {
  from {
    opacity: 0;
    letter-spacing: 0.55em;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    letter-spacing: 0.3em;
    transform: translateY(0);
  }
}

@keyframes ind-word {
  from {
    transform: translateY(115%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes ind-rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes ind-grid {
  from {
    opacity: 0.5;
    transform: scale(1.045) translateY(20px);
    filter: blur(7px);
  }
  to {
    opacity: 1;
    transform: none;
    filter: blur(0);
  }
}

@keyframes ind-card {
  0% {
    opacity: 0;
    transform: translate(var(--fx), var(--fy)) rotate(var(--fr))
      scale(var(--fs));
    filter: blur(9px);
  }
  55% {
    opacity: 1;
    filter: blur(0);
  }
  100% {
    opacity: 1;
    transform: translate(0, 0) rotate(0deg) scale(1);
    filter: blur(0);
  }
}

@keyframes ind-pop {
  from {
    opacity: 0;
    transform: scale(0.2) rotate(-8deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes ind-sheen-bar {
  from {
    transform: translateX(-150%) skewX(-14deg);
  }
  to {
    transform: translateX(350%) skewX(-14deg);
  }
}
`;

function ToothIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 3.5C5.5 3.5 4 4.5 4 7c0 2 .8 3 1.2 4.5.4 1.5.6 3.5.8 5 .15 1.1.6 2 1.4 2 .9 0 1.1-1.3 1.4-2.7.3-1.5.8-3.3 3.2-3.3s2.9 1.8 3.2 3.3c.3 1.4.5 2.7 1.4 2.7.8 0 1.25-.9 1.4-2 .2-1.5.4-3.5.8-5C18 10 20 9 20 7c0-2.5-1.5-3.5-3-3.5-1.5 0-3 .8-5 .8s-3.5-.8-5-.8Z" />
    </svg>
  );
}

type Industry = {
  name: string;
  description: string;
  icon: LucideIcon | "tooth";
  className: string;
  /**
   * Cinematic entrance — where each box flies in FROM:
   * fx/fy = starting offset (px), fr = rotation (deg), fs = starting scale.
   */
  fx: number;
  fy: number;
  fr: number;
  fs: number;
  /** Per-box gradient angle (deg) — randomized so no two boxes shade alike. */
  ga: string;
};

/**
 * Bento layout (lg, 12-col grid):
 * Row 1: Dental (1-7)        | Medical (8-12)
 * Row 2: Salons (1-3) | Law (4-6) | Real Estate (7-9) | Restaurants (10-12)
 * Row 3: Automotive (1-5) | Home (6-9) | Fitness (10-12)
 * Row 4: Agencies (1-4) | E-commerce (5-8) | Professional (9-12)
 */
const industries: Industry[] = [
  {
    name: "Dental Clinics",
    description:
      "Book appointments, send reminders, and answer insurance questions 24/7.",
    icon: "tooth",
    className: "md:col-span-2 lg:col-span-7 lg:col-start-1 lg:row-start-1",
    fx: -150,
    fy: -80,
    fr: -7,
    fs: 0.82,
    ga: "135deg",
  },
  {
    name: "Medical Practices",
    description:
      "Handle patient calls, triage requests, and schedule follow-ups automatically.",
    icon: HeartPulse,
    className: "lg:col-span-5 lg:col-start-8 lg:row-start-1",
    fx: 160,
    fy: -90,
    fr: 6,
    fs: 0.8,
    ga: "205deg",
  },
  {
    name: "Salons & Spas",
    description:
      "Manage bookings, answer service questions, and reduce no-shows.",
    icon: Scissors,
    className: "lg:col-span-3 lg:col-start-1 lg:row-start-2",
    fx: -170,
    fy: 40,
    fr: -5,
    fs: 0.84,
    ga: "250deg",
  },
  {
    name: "Law Firms",
    description:
      "Screen potential clients, capture case details, and book consultations.",
    icon: Scale,
    className: "lg:col-span-3 lg:col-start-4 lg:row-start-2",
    fx: -40,
    fy: -120,
    fr: -4,
    fs: 0.85,
    ga: "160deg",
  },
  {
    name: "Real Estate",
    description:
      "Qualify leads, schedule showings, and follow up with potential buyers.",
    icon: Building2,
    className: "lg:col-span-3 lg:col-start-7 lg:row-start-2",
    fx: 70,
    fy: -130,
    fr: 5,
    fs: 0.84,
    ga: "315deg",
  },
  {
    name: "Restaurants",
    description:
      "Take reservations, answer menu questions, and manage call-in orders.",
    icon: UtensilsCrossed,
    className: "lg:col-span-3 lg:col-start-10 lg:row-start-2",
    fx: 180,
    fy: 30,
    fr: 7,
    fs: 0.82,
    ga: "110deg",
  },
  {
    name: "Automotive",
    description:
      "Schedule service appointments, provide estimates, and send reminders.",
    icon: Car,
    className: "lg:col-span-5 lg:col-start-1 lg:row-start-3",
    fx: -160,
    fy: 70,
    fr: -6,
    fs: 0.83,
    ga: "225deg",
  },
  {
    name: "Home Services",
    description: "Dispatch technicians, quote jobs, and handle emergency calls.",
    icon: Wrench,
    className: "lg:col-span-4 lg:col-start-6 lg:row-start-3",
    fx: 20,
    fy: 140,
    fr: 4,
    fs: 0.84,
    ga: "140deg",
  },
  {
    name: "Fitness Studios",
    description:
      "Book classes, manage memberships, and answer membership questions.",
    icon: Dumbbell,
    className: "lg:col-span-3 lg:col-start-10 lg:row-start-3",
    fx: 170,
    fy: 80,
    fr: 6,
    fs: 0.83,
    ga: "290deg",
  },
  {
    name: "Agencies",
    description:
      "Capture leads, qualify prospects, and schedule discovery calls.",
    icon: Briefcase,
    className: "lg:col-span-4 lg:col-start-1 lg:row-start-4",
    fx: -150,
    fy: 120,
    fr: -5,
    fs: 0.85,
    ga: "180deg",
  },
  {
    name: "E-commerce",
    description: "Handle customer support, track orders, and process returns.",
    icon: ShoppingCart,
    className: "lg:col-span-4 lg:col-start-5 lg:row-start-4",
    fx: -20,
    fy: 150,
    fr: -3,
    fs: 0.85,
    ga: "320deg",
  },
  {
    name: "Professional Services",
    description:
      "Manage client intake, automate follow-ups, and book consultations.",
    icon: Globe,
    className: "lg:col-span-4 lg:col-start-9 lg:row-start-4",
    fx: 160,
    fy: 120,
    fr: 5,
    fs: 0.84,
    ga: "205deg",
  },
];

const TITLE_WORDS = ["Built", "for", "every", "business"] as const;

/** Base delay before the first box starts flying (ms) + per-box stagger. */
const CARD_DELAY_BASE = 420;
const CARD_STAGGER = 75;

export default function IndustriesSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const replayTimer = useRef<number | undefined>(undefined);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    // Play once — on load if visible, otherwise when scrolled into view.
    // (prefers-reduced-motion is handled purely in CSS.)
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setPlaying(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      window.clearTimeout(replayTimer.current);
    };
  }, []);

  const replay = () => {
    // Remove the play class so every piece resets to its hidden/scattered
    // state, then re-add it to restart the whole choreography.
    setPlaying(false);
    window.clearTimeout(replayTimer.current);
    replayTimer.current = window.setTimeout(() => setPlaying(true), 90);
  };

  return (
    <main className="overflow-clip bg-black">
      {/* Embedded stylesheet — self-contained, no globals.css changes needed */}
      <style dangerouslySetInnerHTML={{ __html: INDUSTRIES_CSS }} />
      <noscript
        dangerouslySetInnerHTML={{
          __html:
            "<style>.ind-section:not(.ind-play) :is(.ind-card,.ind-icon,.ind-title,.ind-desc,.ind-kicker,.ind-sub,.ind-word,.ind-sheen){opacity:1!important;transform:none!important}</style>",
        }}
      />
      <section
        ref={sectionRef}
        aria-labelledby="industries-heading"
        className={`ind-section bg-black py-20 lg:py-28 ${
          playing ? "ind-play" : ""
        }`}
      >
        <div className="mx-auto max-w-[1200px] px-6">
          {/* Section header */}
          <div className="mx-auto max-w-2xl text-center">
            <div className="ind-kicker flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-white">
              <span aria-hidden className="h-px w-8 bg-white/15" />
              Industries
              <span aria-hidden className="h-px w-8 bg-white/15" />
            </div>
            <h2
              id="industries-heading"
              className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl"
            >
              {TITLE_WORDS.map((word, i) => (
                <span
                  key={word}
                  className="-mb-2 inline-block overflow-hidden pb-2 align-bottom"
                >
                  <span
                    className="ind-word inline-block"
                    style={{ "--wd": `${140 + i * 85}ms` } as CSSProperties}
                  >
                    {word}
                    {i < TITLE_WORDS.length - 1 ? "\u00A0" : ""}
                  </span>
                </span>
              ))}
            </h2>
            <p className="ind-sub mt-5 text-base leading-relaxed text-neutral-400 sm:text-lg">
              Your AI receptionist adapts to your industry out of the box. No
              custom training, no complex setup — just plug and play.
            </p>
          </div>

          {/* Bento grid */}
          <div className="ind-grid relative mt-14 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12">
            {industries.map((industry, i) => {
              const Icon = industry.icon;
              return (
                <article
                  key={industry.name}
                  className={`ind-card relative flex min-h-[180px] flex-col rounded-2xl p-6 lg:min-h-[212px] lg:p-7 ${industry.className}`}
                  style={
                    {
                      "--fd": `${CARD_DELAY_BASE + i * CARD_STAGGER}ms`,
                      "--fx": `${industry.fx}px`,
                      "--fy": `${industry.fy}px`,
                      "--fr": `${industry.fr}deg`,
                      "--fs": industry.fs,
                      "--ga": industry.ga,
                    } as CSSProperties
                  }
                >
                  {Icon === "tooth" ? (
                    <ToothIcon className="ind-icon h-[26px] w-[26px] text-[#ff4b00]" />
                  ) : (
                    <Icon
                      className="ind-icon h-[26px] w-[26px] text-[#ff4b00]"
                      aria-hidden="true"
                    />
                  )}
                  <h3 className="ind-title mt-5 text-lg font-semibold text-white">
                    {industry.name}
                  </h3>
                  <p className="ind-desc mt-2 text-sm leading-relaxed text-neutral-400">
                    {industry.description}
                  </p>
                </article>
              );
            })}

            {/* Light sweep across the assembled grid */}
            <div
              aria-hidden="true"
              className="ind-sheen pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl"
            >
              <div className="ind-sheen-bar" />
            </div>
          </div>


        </div>
      </section>
      </main>
  );
}
export { IndustriesSection as Industries };

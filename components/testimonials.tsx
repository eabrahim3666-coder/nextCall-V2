"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Star } from "lucide-react";

import { PerspectiveCard } from "@/components/PerspectiveCard";
import { cn } from "@/lib/utils";

const TESTIMONIAL_INTRO_CSS = `
.feat-box {
  background-image: linear-gradient(var(--ga, 135deg), #0a0604 0%, #000000 62%);
  border-radius: 16px;
  border: none;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease, filter 0.35s ease;
}
.feat-box:hover, .feat-box:active {
  transform: translateY(-4px);
  filter: brightness(1.15);
  box-shadow: 0 18px 44px -16px rgba(255, 75, 0, 0.22), 0 10px 26px -14px rgba(0, 0, 0, 0.85);
}
@media (hover: none) {
  .feat-box:active {
    transform: translateY(-4px);
    filter: brightness(1.15);
    box-shadow: 0 18px 44px -16px rgba(255, 75, 0, 0.22), 0 10px 26px -14px rgba(0, 0, 0, 0.85);
  }
}
.testi-sheen-bar {
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
  .testi-section:not(.testi-play) :is(.feat-box, .testi-kicker, .testi-sub, .testi-pills, .testi-review) {
    opacity: 0;
  }
  .testi-section:not(.testi-play) .testi-word {
    opacity: 0;
    transform: translateY(115%);
  }
  .testi-section:not(.testi-play) .feat-box {
    transition: none;
  }
  .testi-section:not(.testi-play) .testi-sheen {
    opacity: 0;
  }
  .testi-play .testi-kicker {
    animation: testi-kicker 1.2s cubic-bezier(0.22, 1, 0.36, 1) 180ms backwards;
  }
  .testi-play .testi-word {
    animation: testi-word 1.0s cubic-bezier(0.22, 1, 0.36, 1) var(--wd) backwards;
  }
  .testi-play .testi-sub {
    animation: testi-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) 650ms backwards;
  }
  .testi-play .testi-grid {
    animation: testi-grid 2.0s cubic-bezier(0.22, 1, 0.36, 1) 500ms backwards;
  }
  .testi-play .feat-box {
    animation: testi-card 1.2s cubic-bezier(0.22, 1, 0.36, 1) var(--fd) backwards;
    will-change: transform, opacity, filter;
  }
  .testi-play .testi-pills {
    animation: testi-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) 1100ms backwards;
  }
  .testi-play .testi-review {
    animation: testi-rise 1.0s cubic-bezier(0.22, 1, 0.36, 1) 1300ms backwards;
  }
  .testi-play .testi-sheen-bar {
    animation: testi-sheen-bar 1.3s cubic-bezier(0.22, 1, 0.36, 1) 2400ms backwards;
  }
}
@keyframes testi-kicker {
  from { opacity: 0; letter-spacing: 0.55em; transform: translateY(10px); }
  to { opacity: 1; letter-spacing: 0.3em; transform: translateY(0); }
}
@keyframes testi-word {
  from { transform: translateY(115%); }
  to { transform: translateY(0); }
}
@keyframes testi-rise {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes testi-grid {
  from { opacity: 0.5; transform: scale(1.045) translateY(20px); filter: blur(7px); }
  to { opacity: 1; transform: none; filter: blur(0); }
}
@keyframes testi-card {
  0% { opacity: 0; transform: translate(var(--fx), var(--fy)) rotate(var(--fr)) scale(var(--fs)); filter: blur(9px); }
  55% { opacity: 1; filter: blur(0); }
  100% { opacity: 1; transform: translate(0,0) rotate(0deg) scale(1); filter: blur(0); }
}
@keyframes testi-sheen-bar {
  from { transform: translateX(-150%) skewX(-14deg); }
  to { transform: translateX(350%) skewX(-14deg); }
}
`;

const TESTIMONIALS = [
  {
    name: "Sarah Mitchell",
    company: "Bright Smile Dental",
    role: "Owner",
    content:
      "We never miss a patient call anymore. The AI books appointments just like our front desk — except it works at 2am on a Sunday.",
    rating: 5,
  },
  {
    name: "James Chen",
    company: "Chen & Associates Law",
    role: "Managing Partner",
    content:
      "NextCall transformed how we handle client calls. The AI screens potential clients so we only spend time on qualified leads.",
    rating: 5,
  },
  {
    name: "Maria Rodriguez",
    company: "Elite Fitness Studio",
    role: "Founder",
    content:
      "I was skeptical about AI answering our phones. After one week, I couldn't imagine running the studio without it.",
    rating: 5,
  },
];

const STATS = [
  { title: "Answer Every Call", desc: "24/7 — No Voicemail", ga: "135deg", fx: -150, fy: -60, fr: -6, fs: 0.84 },
  { title: "Capture the Lead", desc: "Name, Intent, Score", ga: "205deg", fx: 140, fy: -70, fr: 6, fs: 0.83 },
  { title: "Book or Follow Up", desc: "Calendar + SMS + Email", ga: "315deg", fx: -140, fy: 60, fr: -5, fs: 0.84 },
  { title: "See Everything", desc: "Real-Time Dashboard", ga: "110deg", fx: 150, fy: 50, fr: 7, fs: 0.82 },
];

const TITLE_WORDS = ["Why", "businesses", "trust", "NextCall"] as const;
const CARD_DELAY_BASE = 700;
const CARD_STAGGER = 130;

function Testimonials() {
  const [active, setActive] = useState(0);
  const current = TESTIMONIALS[active];
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
      className={`testi-section section-full relative overflow-hidden py-20 sm:py-24 flex flex-col justify-center ${playing ? "testi-play" : ""}`}
    >
      <style dangerouslySetInnerHTML={{ __html: TESTIMONIAL_INTRO_CSS }} />
      <noscript
        dangerouslySetInnerHTML={{
          __html:
            "<style>.testi-section:not(.testi-play) :is(.feat-box,.testi-kicker,.testi-sub,.testi-pills,.testi-review,.testi-word){opacity:1!important;transform:none!important}</style>",
        }}
      />
      {/* Ambient background — STATIC */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,5,4,0.45)_0%,transparent_60%)] opacity-30" />
        <div className="absolute inset-0 bg-[linear-gradient(315deg,rgba(8,5,4,0.4)_0%,transparent_60%)] opacity-30" />
      </div>

      {/* Grid lines backdrop — STATIC */}
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
          <div className="testi-kicker flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D3D8E2]">
            <span aria-hidden className="h-px w-8 bg-white/15" />
            Trusted by businesses
            <span aria-hidden className="h-px w-8 bg-white/15" />
          </div>
          <h2 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight text-white">
            {TITLE_WORDS.map((word, i) => (
              <span key={word} className="-mb-2 inline-block overflow-hidden pb-2 align-bottom">
                <span
                  className="testi-word inline-block"
                  style={{ "--wd": `${220 + i * 110}ms` } as CSSProperties}
                >
                  {word}
                  {i < TITLE_WORDS.length - 1 ? "\u00A0" : ""}
                </span>
              </span>
            ))}
          </h2>
          <p className="testi-sub mt-3 text-base sm:text-lg text-[#C3C9D6] max-w-2xl mx-auto">Real businesses, real results — hear why they never miss a lead.</p>
        </div>

        {/* Stats — delayed + smooth scatter */}
        <div className="testi-grid relative grid grid-cols-2 gap-4 md:grid-cols-4 max-w-4xl mx-auto mb-14">
          {STATS.map((stat, i) => (
            <div
              key={stat.title}
              style={
                {
                  "--ga": stat.ga,
                  "--fd": `${CARD_DELAY_BASE + i * CARD_STAGGER}ms`,
                  "--fx": `${stat.fx}px`,
                  "--fy": `${stat.fy}px`,
                  "--fr": `${stat.fr}deg`,
                  "--fs": stat.fs,
                } as CSSProperties
              }
            >
              <PerspectiveCard
                hover={false}
                className="flex flex-col items-center gap-1 feat-box p-5 text-center h-full"
              >
                <span className="text-sm font-semibold text-[#D3D8E2]">{stat.title}</span>
                <span className="text-xs text-[#C3C9D6]">{stat.desc}</span>
              </PerspectiveCard>
            </div>
          ))}
          <div aria-hidden="true" className="testi-sheen pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
            <div className="testi-sheen-bar" />
          </div>
        </div>

        {/* Review pills */}
        <div className="testi-pills flex flex-wrap justify-center gap-2 sm:gap-3 mb-8">
          {TESTIMONIALS.map((t, i) => (
            <button
              key={t.name}
              onClick={() => setActive(i)}
              className={cn(
                "px-4 py-2 rounded-full text-sm transition-all duration-300 border hover:-translate-y-0.5",
                active === i
                  ? "bg-white/10 border-white/25 text-[#D3D8E2]"
                  : "border-white/10 text-[#C3C9D6] hover:border-white/20 hover:text-[#E5E7EB]"
              )}
            >
              {t.name.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Rotating review */}
        <div className="testi-review relative max-w-3xl mx-auto min-h-[220px] sm:min-h-[190px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <PerspectiveCard
                maxTilt={0}
                scale={1}
                glare={false}
                hover={false}
                className="rounded-3xl glass-card no-hover p-8 sm:p-10 text-center"
              >
                <div className="flex justify-center gap-1 mb-5">
                  {Array.from({ length: current.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#ff4b00] text-[#ff4b00]" />
                  ))}
                </div>
                <p className="text-lg sm:text-xl text-[#C3C9D6] leading-relaxed">
                  &ldquo;{current.content}&rdquo;
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full border border-[#ff4b00]/30 bg-[#ff4b00]/10 text-sm font-medium text-[#ff4b00]">
                    {current.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[#E5E7EB]">{current.name}</p>
                    <p className="text-xs text-[#C3C9D6]">
                      {current.company} &middot; {current.role}
                    </p>
                  </div>
                </div>
              </PerspectiveCard>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export { Testimonials };

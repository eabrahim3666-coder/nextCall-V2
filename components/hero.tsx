"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown } from "lucide-react";
import AINetworkAnimation from "./AINetworkAnimation";

const HERO_INTRO_CSS = `
.hero-section:not(.hero-play) :is(.hero-kicker, .hero-sub, .hero-cta, .hero-anim, .hero-scroll) {
  opacity: 0;
}
.hero-section:not(.hero-play) .hero-word {
  opacity: 0;
  transform: translateY(115%);
}
.hero-section:not(.hero-play) .hero-anim {
  opacity: 0;
  transform: translateY(24px) scale(0.98);
  filter: blur(7px);
}
@media (prefers-reduced-motion: no-preference) {
  .hero-play .hero-kicker {
    animation: hero-kicker 1.1s cubic-bezier(0.22, 1, 0.36, 1) 250ms backwards;
  }
  .hero-play .hero-word {
    animation: hero-word 0.9s cubic-bezier(0.22, 1, 0.36, 1) var(--wd) backwards;
  }
  .hero-play .hero-sub {
    animation: hero-rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) 750ms backwards;
  }
  .hero-play .hero-cta {
    animation: hero-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) 950ms backwards;
  }
  .hero-play .hero-anim {
    animation: hero-card 1.1s cubic-bezier(0.22, 1, 0.36, 1) 1250ms backwards;
    will-change: transform, opacity, filter;
  }
  .hero-play .hero-scroll {
    animation: hero-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) 1600ms backwards;
  }
}
@keyframes hero-kicker {
  from { opacity: 0; letter-spacing: 0.55em; transform: translateY(10px); }
  to { opacity: 1; letter-spacing: 0.3em; transform: translateY(0); }
}
@keyframes hero-word {
  from { transform: translateY(115%); }
  to { transform: translateY(0); }
}
@keyframes hero-rise {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes hero-card {
  0% { opacity: 0; transform: translateY(24px) scale(0.98); filter: blur(7px); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
`;

const HERO_TITLE_WORDS = ["Turn", "Calls", "Into", "Customers"] as const;

function Hero() {
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
      className={`hero-section isolate flex flex-col items-center justify-start relative overflow-hidden bg-[#050505] text-[#e7ddd9] pt-28 pb-0 sm:pt-24 sm:pb-2 ${playing ? "hero-play" : ""}`}
    >
      <style dangerouslySetInnerHTML={{ __html: HERO_INTRO_CSS }} />
      <noscript
        dangerouslySetInnerHTML={{
          __html:
            "<style>.hero-section:not(.hero-play) :is(.hero-kicker,.hero-sub,.hero-cta,.hero-anim,.hero-scroll,.hero-word){opacity:1!important;transform:none!important}</style>",
        }}
      />
      {/* Hero background image */}
      <div
        className="absolute inset-0 z-0 pointer-events-none bg-no-repeat bg-cover bg-center"
        style={{
          backgroundImage: "url('/hero-bg-v2.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Dark overlay to keep text readable */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-black/30" />

      {/* Grid lines backdrop — STATIC */}
      <div
        className="absolute inset-0 z-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="grain z-0" />

      {/* Content */}
      <div className="relative z-20 mx-auto max-w-5xl px-5 sm:px-8 w-full flex flex-col items-center text-center mt-12 sm:mt-16 lg:mt-20">
        {/* Top — copy (badge, H1, paragraph, CTAs, stats) */}
        <div className="text-center w-full max-w-5xl">
          {/* Badge */}
          <div className="hero-kicker inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card text-xs text-[#e7ddd9] mb-3">
            <span className="w-2 h-2 rounded-full bg-[#ff4b00] pulse-dot" />
            24/7 AI Receptionist · Instant Setup
          </div>

          {/* Main heading — word-by-word rise */}
          <h1 className="hero-headline-shine w-max max-w-full mx-auto text-[clamp(2rem,6vw,4.5rem)] leading-[1.08] font-semibold tracking-tight text-white sm:whitespace-nowrap">
            <span className="block">
              {HERO_TITLE_WORDS.map((word, i) => (
                <span key={word} className="-mb-2 inline-block overflow-hidden pb-2 align-bottom">
                  <span
                    className="hero-word inline-block"
                    style={{ "--wd": `${300 + i * 110}ms` } as CSSProperties}
                  >
                    {word}
                    {i < HERO_TITLE_WORDS.length - 1 ? "\u00A0" : ""}
                  </span>
                </span>
              ))}
            </span>
          </h1>

          {/* Supporting paragraph */}
          <p className="hero-sub mt-3 text-base sm:text-lg text-[#e7ddd9] max-w-2xl mx-auto leading-snug">
            <span className="block">NextCall Ai answers every call and chat when you can&apos;t.</span>
            <span className="block">Captures leads, books appointments, and grows your business — 24/7.</span>
          </p>

          {/* CTA buttons */}
          <div className="hero-cta mt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#pricing"
              className="text-sm sm:text-base font-medium px-6 py-3 rounded-full inline-flex items-center justify-center gap-2 bg-[#ff4b00] text-[#e7ddd9] hover:bg-[#e04400] hover:-translate-y-0.5 hover:scale-[1.03] transition-all shadow-lg"
            >
              Start Free Trial
              <ArrowDown className="w-4 h-4 text-white" />
            </a>
            <a
              href="#how-it-works"
              className="text-sm sm:text-base font-medium text-[#e7ddd9] px-6 py-3 rounded-full border border-white/15 hover:bg-white/5 hover:-translate-y-0.5 hover:scale-[1.03] hover:border-white/25 transition-all inline-flex items-center justify-center"
            >
              See how it works
            </a>
          </div>
        </div>
      </div>

      {/* AI Network Animation v2 - bottom middle — gap minimized, top box fully visible */}
      <div className="hero-anim relative z-10 w-full flex justify-center items-start -mt-1 sm:-mt-2 mb-0 overflow-hidden">
        <div
          className="relative flex w-full max-w-[min(100%,1400px)] items-start"
          style={{
            aspectRatio: "20 / 8.2",
            maskImage: "radial-gradient(ellipse 72% 80% at 50% 42%, black 55%, transparent 98%)",
            WebkitMaskImage: "radial-gradient(ellipse 72% 80% at 50% 42%, black 55%, transparent 98%)",
            clipPath: "inset(36px 0 12px 0)",
          }}
        >
          <AINetworkAnimation />
        </div>
      </div>

      {/* Scroll hint — at wire ends, bg ends there */}
      <div className="hero-scroll absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-[#e7ddd9]">
        <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
        <ArrowDown className="w-3.5 h-3.5 text-[#ff4b00]" />
      </div>
    </section>
  );
}

export { Hero };

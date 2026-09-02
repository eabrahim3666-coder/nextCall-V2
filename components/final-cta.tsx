"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const CTA_INTRO_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .cta-section:not(.cta-play) :is(.cta-kicker, .cta-sub, .cta-cta) {
    opacity: 0;
  }
  .cta-section:not(.cta-play) .cta-word {
    opacity: 0;
    transform: translateY(115%);
  }
  .cta-play .cta-kicker {
    animation: cta-kicker 1.3s cubic-bezier(0.22, 1, 0.36, 1) 250ms backwards;
  }
  .cta-play .cta-word {
    animation: cta-word 1.1s cubic-bezier(0.22, 1, 0.36, 1) var(--wd) backwards;
  }
  .cta-play .cta-sub {
    animation: cta-rise 1.0s cubic-bezier(0.22, 1, 0.36, 1) 800ms backwards;
  }
  .cta-play .cta-cta {
    animation: cta-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) 1150ms backwards;
  }
}
@keyframes cta-kicker {
  from { opacity: 0; letter-spacing: 0.55em; transform: translateY(10px); }
  to { opacity: 1; letter-spacing: 0.3em; transform: translateY(0); }
}
@keyframes cta-word {
  from { transform: translateY(115%); }
  to { transform: translateY(0); }
}
@keyframes cta-rise {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

const TITLE_WORDS = ["Ready", "to", "never", "miss", "a", "lead?"] as const;

function FinalCta() {
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
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`cta-section section-full relative overflow-hidden py-24 sm:py-40 flex flex-col justify-center items-center bg-[#0a0a0a] ${playing ? "cta-play" : ""}`}
    >
      <style dangerouslySetInnerHTML={{ __html: CTA_INTRO_CSS }} />
      <noscript
        dangerouslySetInnerHTML={{
          __html:
            "<style>.cta-section:not(.cta-play) :is(.cta-kicker,.cta-sub,.cta-cta,.cta-word){opacity:1!important;transform:none!important}</style>",
        }}
      />
      {/* CTA background image — shown unmodified */}
      <div
        className="absolute inset-0 pointer-events-none bg-no-repeat bg-cover bg-center"
        style={{
          backgroundImage: "url('/cta-bg.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl px-5 sm:px-8 w-full text-center">
        <div className="cta-kicker inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/30 backdrop-blur px-4 py-1.5 text-xs text-white">
          <Sparkles className="w-3.5 h-3.5 text-[#ff4b00]" />
          Start today — no credit card required
        </div>

        <h2 className="mt-6 text-[clamp(2.4rem,5vw,4.5rem)] font-semibold tracking-tight leading-[1.1] text-white">
          {TITLE_WORDS.map((word, i) => (
            <span key={word} className="-mb-2 inline-block overflow-hidden pb-2 align-bottom">
              <span
                className="cta-word inline-block"
                style={{ "--wd": `${320 + i * 120}ms` } as CSSProperties}
              >
                {word}
                {i < TITLE_WORDS.length - 1 ? "\u00A0" : ""}
              </span>
            </span>
          ))}
        </h2>

        <p className="cta-sub mx-auto mt-5 max-w-lg text-base sm:text-lg text-white/90 leading-relaxed">
          Start your free trial today. No credit card required. Set up in under 5 minutes.
        </p>

        <div className="cta-cta mt-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm sm:text-base font-semibold text-black hover:bg-gray-100 transition-colors"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4 text-[#ff4b00]" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export { FinalCta };

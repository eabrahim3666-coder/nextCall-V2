"use client";

import { ArrowDown, Phone, Calendar, Star, MessageSquare } from "lucide-react";

function Words({
  text,
  gradient = false,
}: {
  text: string;
  gradient?: boolean;
}) {
  const words = text.split(" ");
  if (gradient) {
    return (
      <>
        {words.map((word, i) => (
          <span key={i} className="inline-block">
            {word}
            {i < words.length - 1 ? "\u00A0" : ""}
          </span>
        ))}
      </>
    );
  }
  return (
    <>
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden align-baseline"
          style={{ paddingBottom: "0.08em" }}
        >
          {word}
          {i < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </>
  );
}

function Hero() {
  const stats = [
    { icon: Phone, label: "AI Answers Calls 24/7" },
    { icon: Calendar, label: "Books Appointments" },
    { icon: Star, label: "Replies to Reviews" },
    { icon: MessageSquare, label: "SMS & WhatsApp" },
  ];

  return (
    <section className="section-full items-center justify-center relative overflow-hidden pt-24 pb-14 sm:pt-10 sm:pb-10">
      {/* Ambient background — STATIC */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 bg-no-repeat bg-center"
          style={{
            backgroundImage: "url('/hero-bg.png')",
            backgroundSize: "cover",
            opacity: 0.35,
          }}
        />
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

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-5 sm:px-8 w-full flex flex-col items-center text-center">
        {/* Top — copy (badge, H1, paragraph, CTAs, stats) */}
        <div className="text-center w-full max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card text-xs text-[#C3C9D6] mb-10">
            <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-dot" />
            24/7 AI Receptionist · Instant Setup
          </div>

          {/* Main heading */}
          <h1 className="hero-headline-shine text-[clamp(3rem,7vw,5.5rem)] leading-[1.08] font-semibold tracking-tight text-transparent bg-clip-text bg-[linear-gradient(90deg,#4E5562_0%,#4E5562_35%,#0C0C0C_50%,#4E5562_65%,#4E5562_100%)] bg-[length:200%_100%] animate-[text-shine_7s_linear_infinite]">
            <span className="block">
              <Words text="Never miss a lead," />
            </span>
            <span className="block">
              <Words text="even after hours" gradient />
            </span>
          </h1>

          {/* Supporting paragraph */}
          <p className="mt-8 text-base sm:text-lg text-[#C3C9D6] max-w-2xl mx-auto leading-relaxed">
            <span className="block">
              NextCall Chat answers every call and chat when you can&apos;t.
            </span>
            <span className="block">
              Captures leads, books appointments, and grows your business —
              24/7.
            </span>
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#pricing"
              className="btn-silver text-sm sm:text-base font-medium px-6 py-3 rounded-full inline-flex items-center justify-center gap-2"
            >
              Start Free Trial
              <ArrowDown className="w-4 h-4" />
            </a>
            <a
              href="#how-it-works"
              className="text-sm sm:text-base font-medium text-[#C3C9D6] px-6 py-3 rounded-full border border-white/15 hover:bg-white/5 hover:-translate-y-0.5 hover:scale-[1.03] hover:border-white/25 transition-all inline-flex items-center justify-center"
            >
              See how it works
            </a>
          </div>

          {/* Rolling ticker — quick badges loop continuously */}
          <div className="relative mt-12 w-full overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
            <div className="flex w-max items-center gap-x-10 sm:gap-x-14 animate-[marquee_22s_linear_infinite]">
              {[...stats, ...stats].map((s, i) => (
                <span
                  key={i}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#C3C9D6] whitespace-nowrap"
                >
                  <s.icon className="w-4 h-4 text-[#D3D8E2]" />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-zinc-500">
        <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
        <ArrowDown className="w-3.5 h-3.5" />
      </div>
    </section>
  );
}

export { Hero };

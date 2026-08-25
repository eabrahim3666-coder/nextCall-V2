"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Reveal } from "@/components/Reveal";

function FinalCta() {
  return (
    <section className="section-full relative overflow-hidden py-24 sm:py-40 flex flex-col justify-center items-center">
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

      <div className="relative z-10 mx-auto max-w-4xl px-5 sm:px-8 w-full text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full glass-card px-4 py-1.5 text-xs text-[#D3D8E2]">
            <Sparkles className="w-3.5 h-3.5 text-[#D3D8E2]" />
            Start today — no credit card required
          </span>
        </Reveal>

        <Reveal delay={0.05}>
          <h2 className="section-headline-shine mt-6 text-[clamp(2.4rem,5vw,4.5rem)] font-semibold tracking-tight leading-[1.1]">
            Ready to never miss a lead?
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-lg text-base sm:text-lg text-[#C3C9D6] leading-relaxed">
            Start your free trial today. No credit card required. Set up in
            under 5 minutes.
          </p>
        </Reveal>

        <Reveal delay={0.15} className="mt-10">
          <Link
            href="/dashboard"
            className="btn-silver inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm sm:text-base font-medium"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4 text-purple-300" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export { FinalCta };

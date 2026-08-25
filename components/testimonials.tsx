"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Star } from "lucide-react";

import { Reveal } from "@/components/Reveal";
import { PerspectiveCard } from "@/components/PerspectiveCard";
import { cn } from "@/lib/utils";

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
  { title: "Answer Every Call", desc: "24/7 — No Voicemail" },
  { title: "Capture the Lead", desc: "Name, Intent, Score" },
  { title: "Book or Follow Up", desc: "Calendar + SMS + Email" },
  { title: "See Everything", desc: "Real-Time Dashboard" },
];

function Testimonials() {
  const [active, setActive] = useState(0);
  const current = TESTIMONIALS[active];

  return (
    <section className="section-full relative overflow-hidden py-20 sm:py-24 flex flex-col justify-center">
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
              Trusted by businesses
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="section-headline-shine mt-3 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
              Why businesses trust NextCall
            </h2>
          </Reveal>
        </div>

        {/* Stats */}
        <Reveal delay={0.1} className="mb-14">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 max-w-4xl mx-auto">
            {STATS.map((stat) => (
              <PerspectiveCard
                key={stat.title}
                maxTilt={6}
                scale={1.03}
                className="flex flex-col items-center gap-1 rounded-2xl glass-card p-5 text-center"
              >
                <span className="text-sm font-semibold text-[#D3D8E2]">
                  {stat.title}
                </span>
                <span className="text-xs text-[#C3C9D6]">{stat.desc}</span>
              </PerspectiveCard>
            ))}
          </div>
        </Reveal>

        {/* Review pills */}
        <Reveal delay={0.15} className="mb-8">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
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
        </Reveal>

        {/* Rotating review */}
        <div className="relative max-w-3xl mx-auto min-h-[220px] sm:min-h-[190px]">
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
                    <Star key={i} className="w-4 h-4 fill-purple-300 text-purple-300" />
                  ))}
                </div>
                <p className="text-lg sm:text-xl text-[#C3C9D6] leading-relaxed">
                  &ldquo;{current.content}&rdquo;
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/10 text-sm font-medium text-purple-300">
                    {current.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[#E5E7EB]">
                      {current.name}
                    </p>
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

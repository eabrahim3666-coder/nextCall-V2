"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Plug, BrainCircuit, Rocket } from "lucide-react";

import { Reveal } from "@/components/Reveal";

const STEPS = [
  {
    no: "01",
    icon: Plug,
    title: "Connect Your Business",
    description:
      "Link your phone number, social accounts, and business details. The AI instantly knows your services, hours, and brand voice.",
  },
  {
    no: "02",
    icon: BrainCircuit,
    title: "Train Your AI Receptionist",
    description:
      "Upload FAQs, set booking rules, and customize responses. Your AI learns your business inside and out — no coding needed.",
  },
  {
    no: "03",
    icon: Rocket,
    title: "Go Live",
    description:
      "Your AI receptionist starts answering calls, booking appointments, and replying to customers 24/7. Leads roll in immediately.",
  },
];

function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const lineScale = useTransform(scrollYProgress, [0.1, 0.7], [0, 1]);

  return (
    <section
      id="how-it-works"
      className="section-full relative overflow-hidden py-20 sm:py-24 flex flex-col justify-center"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-5%] w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(190,195,205,0.16)_0%,transparent_70%)] blur-[100px] opacity-60" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(140,145,155,0.12)_0%,transparent_70%)] blur-[120px] opacity-60" />
      </div>
      <div className="grain" />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <Reveal>
            <span className="text-xs uppercase tracking-[0.25em] text-[#C3C9D6] font-medium">
              How It Works
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight text-transparent bg-clip-text bg-[linear-gradient(90deg,#0C0C0C_0%,#0C0C0C_35%,#4E5562_50%,#0C0C0C_65%,#0C0C0C_100%)] bg-[length:200%_100%] animate-[text-shine_7s_linear_infinite]">
              Live in 5 minutes
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 text-base sm:text-lg text-zinc-400">
              Three steps. Zero technical skills required. Seriously.
            </p>
          </Reveal>
        </div>

        <div ref={ref} className="relative">
          {/* Connecting line */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-white/10 hidden md:block">
            <motion.div
              style={{ scaleY: lineScale, transformOrigin: "top" }}
              className="w-full h-full bg-gradient-to-b from-purple-500 via-indigo-500 to-cyan-400"
            />
          </div>

          <div className="space-y-12 md:space-y-24">
            {STEPS.map((step, i) => (
              <Reveal
                key={step.no}
                direction={i % 2 === 0 ? "left" : "right"}
                className="relative"
              >
                <div
                  className={`grid md:grid-cols-2 gap-8 items-center ${
                    i % 2 === 0 ? "" : "md:[&>*:first-child]:order-2"
                  }`}
                >
                  {/* Text side */}
                  <div
                    className={`pl-0 md:pl-0 ${
                      i % 2 === 0 ? "md:pr-16 md:text-right" : "md:pl-16"
                    }`}
                  >
                    <span className="text-7xl sm:text-8xl font-semibold text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-700 block leading-none mb-3">
                      {step.no}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-medium text-[#C3C9D6] mb-3">
                      {step.title}
                    </h3>
                    <p className="text-base text-[#A7ADBB] leading-relaxed max-w-md md:inline-block">
                      {step.description}
                    </p>
                  </div>

                  {/* Visual side — number badge */}
                  <div
                    className={`flex justify-center relative ${
                      i % 2 === 0 ? "md:justify-start" : "md:justify-end"
                    }`}
                  >
                    <div
                      className={`grid place-items-center w-24 h-24 sm:w-32 sm:h-32 rounded-full ${
                        i % 2 === 0 ? "md:ml-16" : "md:mr-16"
                      } relative`}
                      style={{
                        background:
                          "radial-gradient(circle at 30% 30%, rgba(139,92,246,0.25), rgba(34,211,238,0.05))",
                        border: "1px solid rgba(167, 139, 250, 0.3)",
                        backdropFilter: "blur(12px)",
                      }}
                    >
                      <step.icon className="w-10 h-10 sm:w-12 sm:h-12 text-purple-300" />
                      <motion.div
                        initial={{ rotate: 0 }}
                        whileInView={{ rotate: 360 }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 20,
                          ease: "linear",
                          repeat: Infinity,
                        }}
                        className="absolute inset-0 rounded-full border border-dashed border-cyan-400/20"
                      />
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export { HowItWorks };

"use client";

import { useState, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

import { Reveal } from "@/components/Reveal";
import { PerspectiveCard } from "@/components/PerspectiveCard";
import { cn } from "@/lib/utils";

const FAQ_BOX_CSS = `
.faq-box {
  background-image: linear-gradient(var(--ga, 135deg), #0a0604 0%, #000000 62%);
  border-radius: 16px;
  border: none !important;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease, filter 0.35s ease;
}
.faq-box:hover, .faq-box:active {
  transform: translateY(-4px);
  filter: brightness(1.15);
  box-shadow: 0 18px 44px -16px rgba(255, 75, 0, 0.22), 0 10px 26px -14px rgba(0, 0, 0, 0.85);
}
@media (max-width: 640px) {
  .faq-box {
    background-image: linear-gradient(180deg, #0a0604 0%, #000000 55%) !important;
  }
}
@media (hover: none) {
  .faq-box:active {
    transform: translateY(-4px);
    filter: brightness(1.15);
    box-shadow: 0 18px 44px -16px rgba(255, 75, 0, 0.22), 0 10px 26px -14px rgba(0, 0, 0, 0.85);
  }
}
`;

const FAQ_ITEMS = [
  {
    question: "How does the AI answer calls?",
    answer:
      "Next Call Chat connects to your business phone number. When a call comes in, our AI picks up within 2 rings, greets the caller naturally, and handles the conversation based on your business information. It can answer questions about your services, hours, and pricing, book appointments, and capture lead details — all in a natural voice that sounds like your front desk.",
  },
  {
    question: "Will callers know it's an AI?",
    answer:
      "Most callers can't tell the difference. The AI speaks naturally with appropriate pauses, tone variations, and conversational flow. It knows your business inside and out, so it responds with real answers — not robotic scripts. If a caller asks something the AI can't handle, it smoothly offers to take a message or transfer the call.",
  },
  {
    question: "What happens after the call ends?",
    answer:
      "You get an instant notification with the full call summary, caller details, sentiment analysis, and any appointments booked. If it's a hot lead, we flag it for you. The AI also sends a follow-up text or email to the caller automatically, so they feel taken care of even after hanging up.",
  },
  {
    question: "Can I customize what the AI says?",
    answer:
      "Absolutely. You control the AI's knowledge base — your services, pricing, hours, special offers, tone of voice, and more. Update it anytime from your dashboard. The AI adapts immediately. You can also set rules like 'always offer free estimates' or 'transfer emergency calls to my cell.'",
  },
  {
    question: "How many calls can it handle at once?",
    answer:
      "Unlimited. Unlike a human receptionist who can only take one call at a time, Next Call Chat handles multiple calls simultaneously. During peak hours, holidays, or after hours — every single caller gets answered immediately. No hold music, no voicemail.",
  },
  {
    question: "What's included in the plan?",
    answer:
      "Both plans include AI call answering, appointment scheduling, SMS follow-ups, and a real-time analytics dashboard. The Standard plan ($299/month) covers 200 minutes with full features, while the Premium plan ($399/month) includes 500 minutes plus advanced analytics, lead tracking, and priority support. Additional minutes are $0.40-$0.50 each. Most small businesses stay comfortably within their plan's included minutes.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. No contracts, no commitments, no cancellation fees. Cancel from your dashboard with one click. We also include a 3-day free trial so you can see the results before paying anything.",
  },
];

function FaqAccordion({
  item,
  isOpen,
  onToggle,
  index,
}: {
  item: { question: string; answer: string };
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <PerspectiveCard
      hover={false}
      className={cn("faq-box", isOpen && "ring-1 ring-[#ff4b00]/20")}
    >
      <h3>
        <button
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={`faq-panel-${index}`}
          id={`faq-trigger-${index}`}
          className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 rounded-2xl"
        >
          <span className="text-base font-medium text-[#D3D8E2] pr-4">
            {item.question}
          </span>
          <span
            className={cn(
              "shrink-0 flex items-center justify-center size-8 rounded-full border transition-all duration-300",
              isOpen
                ? "border-white/25 bg-white/10 text-[#D3D8E2] rotate-45"
                : "border-white/15 text-[#C3C9D6]"
            )}
          >
            <Plus className="w-4 h-4 text-[#ff4b00]" />
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`faq-panel-${index}`}
            role="region"
            aria-labelledby={`faq-trigger-${index}`}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6">
              <p className="text-sm text-[#C3C9D6] leading-relaxed">
                {item.answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PerspectiveCard>
  );
}

function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="section-full relative overflow-hidden py-20 sm:py-24 flex flex-col justify-center"
    >
      <style dangerouslySetInnerHTML={{ __html: FAQ_BOX_CSS }} />
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

      <div className="relative z-10 mx-auto max-w-3xl px-5 sm:px-8 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
          <Reveal>
            <div className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D3D8E2]"><span aria-hidden className="h-px w-8 bg-white/15" />FAQ<span aria-hidden className="h-px w-8 bg-white/15" /></div>
          </Reveal>
          <h2 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight text-white">
            Common questions
          </h2>
          <Reveal delay={0.1}>
            <p className="mt-5 text-base sm:text-lg text-[#C3C9D6]">
              Everything you need to know before getting started.
            </p>
          </Reveal>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <Reveal key={item.question} delay={i * 0.05} amount={0.3}>
              <div style={{ "--ga": `${[135,205,315,110,225,160,250][i % 7]}deg` } as CSSProperties}>
                <FaqAccordion
                  item={item}
                  index={i}
                  isOpen={openIndex === i}
                  onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export { Faq };

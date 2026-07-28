"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Icon } from "@iconify/react"

import { cn } from "@/lib/utils"

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
] as const

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}

function FaqAccordion({
  item,
  isOpen,
  onToggle,
  index,
}: {
  item: { question: string; answer: string }
  isOpen: boolean
  onToggle: () => void
  index: number
}) {
  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-300",
        isOpen
          ? "border-ds-border-hover shadow-ds-sm"
          : "border-ds-border-primary hover:border-ds-border-hover"
      )}
    >
      <h3>
        <button
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={`faq-panel-${index}`}
          id={`faq-trigger-${index}`}
          className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent-primary/40 focus-visible:ring-offset-2 focus-visible:rounded-lg"
        >
          <span className="text-ds-label text-ds-text-primary pr-4">
            {item.question}
          </span>
          <span
            className={cn(
              "shrink-0 flex items-center justify-center size-6 rounded-lg border transition-all duration-300",
              isOpen
                ? "border-ds-accent-primary/30 bg-ds-accent-primary/10 text-ds-accent-primary rotate-45"
                : "border-ds-border-primary text-ds-text-muted"
            )}
          >
            <Icon icon="lucide:plus" width={14} />
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
            <div className="px-6 pb-6 pt-0">
              <p className="text-ds-small-body text-ds-text-secondary leading-relaxed">
                {item.answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section
      id="faq"
      className="relative bg-ds-bg-primary py-24 md:py-32 overflow-hidden"
    >
      <div className="pointer-events-none absolute top-[-10%] right-[5%] h-[400px] w-[400px] rounded-full bg-ds-accent-secondary/[0.02] blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[-15%] left-[10%] h-[500px] w-[500px] rounded-full bg-ds-accent-primary/[0.015] blur-[80px]" />

      <div className="relative z-10 mx-auto max-w-3xl px-6">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.span
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-ds-overline font-medium text-ds-accent-primary uppercase tracking-[0.08em]"
          >
            FAQ
          </motion.span>
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-ds-section-heading text-ds-text-primary"
          >
            Common{" "}
            <span className="bg-linear-to-r from-ds-accent-primary via-ds-accent-secondary to-ds-accent-highlight bg-clip-text text-transparent">
              questions
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-ds-body text-ds-text-secondary leading-relaxed"
          >
            Everything you need to know before getting started.
          </motion.p>
        </motion.div>

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            animate: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
          }}
          className="mt-16 space-y-3"
        >
          {FAQ_ITEMS.map((item, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <FaqAccordion
                item={item}
                index={i}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export { Faq }

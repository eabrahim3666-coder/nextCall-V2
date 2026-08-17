"use client"

import { motion } from "framer-motion"
import { Icon } from "@iconify/react"

import { cn } from "@/lib/utils"

const FEATURES = [
  {
    icon: "lucide:phone-call",
    title: "AI Answers Calls 24/7",
    description:
      "Never miss a call again. Your AI receptionist answers every inbound call with natural conversation, captures caller info, and routes intelligently.",
  },
  {
    icon: "lucide:calendar-check",
    title: "Books Appointments Automatically",
    description:
      "Syncs with your calendar and books appointments directly. No back-and-forth — the AI handles scheduling end-to-end.",
  },
  {
    icon: "lucide:message-square",
    title: "Replies to Reviews",
    description:
      "Automatically responds to Google and review platform feedback. Maintain your reputation without lifting a finger.",
  },
  {
    icon: "lucide:instagram",
    title: "Instagram & Facebook DM",
    description:
      "Your AI handles DMs across Instagram and Facebook — answering questions, capturing leads, and booking appointments around the clock.",
  },
  {
    icon: "lucide:message-circle",
    title: "SMS & WhatsApp",
    description:
      "Two-way texting via SMS and WhatsApp. The AI carries on natural conversations, sends reminders, and follows up automatically.",
  },
  {
    icon: "lucide:mic",
    title: "AI Voice Receptionist",
    description:
      "A natural, human-like voice that answers calls with your business info, tone, and branding. Callers can't tell it's AI.",
  },
  {
    icon: "lucide:layers",
    title: "CRM Integration",
    description:
      "Every call, chat, and lead is logged to your CRM automatically. Full context, no data entry, never lose a lead.",
  },
  {
    icon: "lucide:bar-chart-3",
    title: "Analytics & Insights",
    description:
      "Real-time dashboard with call volumes, lead scores, conversion data, and peak hours. Know exactly what's working.",
  },
] as const

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}

function Features() {
  return (
    <section
      id="features"
      className="relative bg-ds-bg-primary py-24 md:py-32 overflow-hidden"
    >
      <div className="pointer-events-none absolute top-[-10%] right-[-5%] h-[500px] w-[500px] rounded-full bg-ds-accent-primary/[0.02] blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[-10%] left-[-5%] h-[400px] w-[400px] rounded-full bg-ds-accent-highlight/[0.015] blur-[80px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Section header */}
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            animate: {
              transition: { staggerChildren: 0.1 },
            },
          }}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.span
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-ds-overline font-medium text-ds-accent-primary uppercase tracking-[0.08em]"
          >
            Features
          </motion.span>
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-ds-section-heading text-ds-text-primary"
          >
            Everything you{" "}
            <span className="bg-linear-to-r from-ds-accent-primary via-ds-accent-secondary to-ds-accent-highlight bg-clip-text text-transparent">
              need
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-ds-body text-ds-text-secondary leading-relaxed"
          >
            Your AI receptionist that never sleeps, never takes a day off, and
            never misses an opportunity.
          </motion.p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            animate: {
              transition: { staggerChildren: 0.06, delayChildren: 0.15 },
            },
          }}
          className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "group relative rounded-[1.5rem] border bg-ds-bg-card p-6 md:p-8",
                "border-ds-border-primary shadow-ds-sm",
                "transition-all duration-300",
                "hover:shadow-ds-md hover:border-ds-border-hover hover:-translate-y-0.5"
              )}
            >
              <div
                className={cn(
                  "flex size-12 items-center justify-center rounded-xl",
                  "bg-ds-accent-primary/10 border border-ds-accent-primary/20",
                  "transition-transform duration-300 group-hover:scale-105"
                )}
              >
                <Icon
                  icon={feature.icon}
                  width={22}
                  className="text-ds-accent-primary"
                />
              </div>
              <h3 className="mt-5 text-ds-card-title text-ds-text-primary">
                {feature.title}
              </h3>
              <p className="mt-2 text-ds-small-body text-ds-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export { Features }

"use client"

import { motion } from "framer-motion"
import { Icon } from "@iconify/react"

import { cn } from "@/lib/utils"

const STEPS = [
  {
    number: "01",
    icon: "lucide:building-2",
    title: "Connect Your Business",
    description:
      "Link your phone number, social accounts, and business details. The AI instantly knows your services, hours, and brand voice.",
  },
  {
    number: "02",
    icon: "lucide:brain",
    title: "Train Your AI Receptionist",
    description:
      "Upload FAQs, set booking rules, and customize responses. Your AI learns your business inside and out — no coding needed.",
  },
  {
    number: "03",
    icon: "lucide:rocket",
    title: "Go Live",
    description:
      "Your AI receptionist starts answering calls, booking appointments, and replying to customers 24/7. Leads roll in immediately.",
  },
] as const

const INTEGRATIONS = [
  { icon: "lucide:calendar", name: "Google Calendar", description: "Sync bookings" },
  { icon: "lucide:message-circle", name: "WhatsApp", description: "Two-way chat" },
  { icon: "lucide:instagram", name: "Instagram", description: "DM automation" },
  { icon: "lucide:message-square", name: "Messenger", description: "Facebook DM" },
  { icon: "lucide:sms", name: "SMS", description: "Text messaging" },
  { icon: "lucide:star", name: "Google Reviews", description: "Auto replies" },
  { icon: "lucide:zap", name: "Zapier (Premium)", description: "Call data via webhooks" },
] as const

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}

function HowItWorks() {
  return (
    <>
      {/* ============ HOW IT WORKS ============ */}
      <section
        id="how-it-works"
        className="relative bg-ds-bg-primary py-24 md:py-32 overflow-hidden"
      >
        <div className="pointer-events-none absolute top-[-15%] left-[-5%] h-[500px] w-[500px] rounded-full bg-ds-accent-secondary/[0.02] blur-[100px]" />
        <div className="pointer-events-none absolute bottom-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-ds-accent-highlight/[0.015] blur-[80px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          {/* Section header */}
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
              How It Works
            </motion.span>
            <motion.h2
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 text-ds-section-heading text-ds-text-primary"
            >
              Live in{" "}
              <span className="bg-linear-to-r from-ds-accent-primary via-ds-accent-secondary to-ds-accent-highlight bg-clip-text text-transparent">
                5 minutes
              </span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 text-ds-body text-ds-text-secondary leading-relaxed"
            >
              Three steps. Zero technical skills required. Seriously.
            </motion.p>
          </motion.div>

          {/* Timeline */}
          <div className="relative mt-20">
            {/* Desktop horizontal line */}
            <div className="hidden lg:block absolute top-[52px] left-[calc(16.666%+24px)] right-[calc(16.666%+24px)] h-px bg-ds-border-primary" />

            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-80px" }}
              variants={{
                animate: { transition: { staggerChildren: 0.18, delayChildren: 0.1 } },
              }}
              className="grid gap-12 lg:grid-cols-3"
            >
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.number}
                  variants={fadeUp}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Number circle */}
                  <div
                    className={cn(
                      "relative flex size-[104px] items-center justify-center rounded-full",
                      "bg-linear-to-b from-ds-accent-primary/[0.08] to-ds-accent-primary/[0.02]",
                      "border border-ds-accent-primary/20",
                      "transition-transform duration-300 hover:scale-105"
                    )}
                  >
                    <span className="text-ds-large-heading font-bold text-ds-accent-primary">
                      {step.number}
                    </span>
                    {/* Step connector dot on mobile */}
                    {i < STEPS.length - 1 && (
                      <div className="absolute -bottom-8 left-1/2 h-6 w-px -translate-x-1/2 bg-ds-border-primary lg:hidden" />
                    )}
                  </div>

                  {/* Icon */}
                  <div className="mt-6 flex size-12 items-center justify-center rounded-xl bg-ds-accent-primary/10 border border-ds-accent-primary/20">
                    <Icon
                      icon={step.icon}
                      width={22}
                      className="text-ds-accent-primary"
                    />
                  </div>

                  <h3 className="mt-4 text-ds-card-title text-ds-text-primary">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-xs text-ds-small-body text-ds-text-secondary leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ INTEGRATIONS ============ */}
      <section
        id="built-on"
        className="relative bg-ds-bg-primary border-t border-ds-border-primary py-24 md:py-32 overflow-hidden"
      >
        <div className="pointer-events-none absolute top-[-10%] right-[-5%] h-[450px] w-[450px] rounded-full bg-ds-accent-primary/[0.02] blur-[100px]" />
        <div className="pointer-events-none absolute bottom-[-10%] left-[-5%] h-[350px] w-[350px] rounded-full bg-ds-accent-highlight/[0.015] blur-[80px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          {/* Section header */}
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
              Integrations
            </motion.span>
            <motion.h2
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 text-ds-section-heading text-ds-text-primary"
            >
              Works with your{" "}
              <span className="bg-linear-to-r from-ds-accent-primary via-ds-accent-secondary to-ds-accent-highlight bg-clip-text text-transparent">
                stack
              </span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 text-ds-body text-ds-text-secondary leading-relaxed"
            >
              Every service here is actively powering your calls, data, and
              automations in production.
            </motion.p>
          </motion.div>

          {/* Integration grid */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={{
              animate: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
            }}
            className="mt-16 flex flex-wrap items-center justify-center gap-x-4 gap-y-8"
          >
            {INTEGRATIONS.map((item) => (
              <motion.div
                key={item.name}
                variants={fadeUp}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-full border p-3 pr-6",
                  "sm:w-[calc(50%-0.5rem)]",
                  "lg:w-[calc(20%-0.8rem)]",
                  "border-ds-border-primary bg-ds-bg-card shadow-ds-sm",
                  "transition-all duration-300",
                  "hover:shadow-ds-md hover:border-ds-border-hover hover:-translate-y-0.5"
                )}
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ds-accent-primary/10 border border-ds-accent-primary/20 transition-transform duration-300 group-hover:scale-105">
                  <Icon
                    icon={item.icon}
                    width={20}
                    className="text-ds-accent-primary"
                  />
                </div>
                <div className="text-left">
                  <p className="text-ds-label font-medium text-ds-text-primary leading-tight">
                    {item.name}
                  </p>
                  <p className="text-ds-caption text-ds-text-muted leading-tight">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </>
  )
}

export { HowItWorks }

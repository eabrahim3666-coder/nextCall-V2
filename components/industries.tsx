"use client"

import { motion } from "framer-motion"
import { Icon } from "@iconify/react"

import { cn } from "@/lib/utils"

const INDUSTRIES = [
  { icon: "lucide:tooth", name: "Dental Clinics", benefit: "Book appointments, send reminders, answer insurance questions 24/7" },
  { icon: "lucide:heart-pulse", name: "Medical Practices", benefit: "Handle patient calls, triage requests, and schedule follow-ups automatically" },
  { icon: "lucide:scissors", name: "Salons & Spas", benefit: "Manage bookings, answer service questions, and reduce no-shows" },
  { icon: "lucide:scale", name: "Law Firms", benefit: "Screen potential clients, capture case details, and book consultations" },
  { icon: "lucide:building", name: "Real Estate", benefit: "Qualify leads, schedule showings, and follow up with potential buyers" },
  { icon: "lucide:utensils", name: "Restaurants", benefit: "Take reservations, answer menu questions, and manage call-in orders" },
  { icon: "lucide:car", name: "Automotive", benefit: "Schedule service appointments, provide estimates, and send reminders" },
  { icon: "lucide:wrench", name: "Home Services", benefit: "Dispatch technicians, quote jobs, and handle emergency calls" },
  { icon: "lucide:dumbbell", name: "Fitness Studios", benefit: "Book classes, manage memberships, and answer membership questions" },
  { icon: "lucide:briefcase", name: "Agencies", benefit: "Capture leads, qualify prospects, and schedule discovery calls" },
  { icon: "lucide:shopping-cart", name: "E-commerce", benefit: "Handle customer support, track orders, and process returns" },
  { icon: "lucide:globe", name: "Professional Services", benefit: "Manage client intake, automate follow-ups, and book consultations" },
] as const

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
] as const

const STATS = [
  { title: "Answer Every Call", desc: "24/7 — No Voicemail" },
  { title: "Capture the Lead", desc: "Name, Intent, Score" },
  { title: "Book or Follow Up", desc: "Calendar + SMS + Email" },
  { title: "See Everything", desc: "Real-Time Dashboard" },
] as const

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}

function Industries() {
  return (
    <>
      {/* ============ INDUSTRIES ============ */}
      <section className="relative bg-ds-bg-primary py-24 md:py-32 overflow-hidden">
        <div className="pointer-events-none absolute top-[-15%] right-[-5%] h-[500px] w-[500px] rounded-full bg-ds-accent-primary/[0.02] blur-[100px]" />
        <div className="pointer-events-none absolute bottom-[-10%] left-[-5%] h-[400px] w-[400px] rounded-full bg-ds-accent-highlight/[0.015] blur-[80px]" />

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
              Industries
            </motion.span>
            <motion.h2
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 text-ds-section-heading text-ds-text-primary"
            >
              Built for{" "}
              <span className="bg-linear-to-r from-ds-accent-primary via-ds-accent-secondary to-ds-accent-highlight bg-clip-text text-transparent">
                every business
              </span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 text-ds-body text-ds-text-secondary leading-relaxed"
            >
              Your AI receptionist adapts to your industry out of the box. No
              custom training, no complex setup — just plug and play.
            </motion.p>
          </motion.div>

          {/* Industry grid */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={{
              animate: { transition: { staggerChildren: 0.04, delayChildren: 0.15 } },
            }}
            className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
          >
            {INDUSTRIES.map((item) => (
              <motion.div
                key={item.name}
                variants={fadeUp}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "group flex flex-col gap-3 rounded-[2rem] border p-5",
                  "border-ds-border-primary bg-ds-bg-card shadow-ds-sm",
                  "transition-all duration-300",
                  "hover:shadow-ds-md hover:border-ds-border-hover hover:-translate-y-0.5"
                )}
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-ds-accent-primary/10 border border-ds-accent-primary/20 transition-transform duration-300 group-hover:scale-105">
                  <Icon
                    icon={item.icon}
                    width={20}
                    className="text-ds-accent-primary"
                  />
                </div>
                <div>
                  <p className="text-ds-label font-medium text-ds-text-primary">
                    {item.name}
                  </p>
                  <p className="mt-1 text-ds-caption text-ds-text-muted leading-relaxed">
                    {item.benefit}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ SOCIAL PROOF ============ */}
      <section className="relative bg-ds-bg-secondary border-t border-ds-border-primary py-24 md:py-32 overflow-hidden">
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
              Trusted by businesses
            </motion.span>
            <motion.h2
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 text-ds-section-heading text-ds-text-primary"
            >
              Why businesses trust{" "}
              <span className="bg-linear-to-r from-ds-accent-primary via-ds-accent-secondary to-ds-accent-highlight bg-clip-text text-transparent">
                NextCall
              </span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 text-ds-body text-ds-text-secondary leading-relaxed"
            >
              Built for real service businesses. No fluff, no fake claims — just
              a system that works.
            </motion.p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={{
              animate: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
            }}
            className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4"
          >
            {STATS.map((stat) => (
              <motion.div
                key={stat.title}
                variants={fadeUp}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-1 rounded-[2rem] border border-ds-border-primary bg-ds-bg-card p-6 text-center shadow-ds-sm"
              >
                <span className="text-ds-label font-semibold text-ds-accent-primary">
                  {stat.title}
                </span>
                <span className="text-ds-caption text-ds-text-muted">
                  {stat.desc}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Testimonials */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={{
              animate: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
            }}
            className="mt-16 grid gap-6 md:grid-cols-3"
          >
            {TESTIMONIALS.map((t) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col rounded-[2rem] border border-ds-border-primary bg-ds-bg-card p-6 shadow-ds-sm"
              >
                {/* Stars */}
                <div className="flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Icon
                      key={i}
                      icon="lucide:star"
                      width={14}
                      className="text-ds-state-warning"
                    />
                  ))}
                </div>

                {/* Content */}
                <p className="mt-4 flex-1 text-ds-small-body text-ds-text-secondary leading-relaxed">
                  &ldquo;{t.content}&rdquo;
                </p>

                {/* Author */}
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-ds-accent-primary/10 border border-ds-accent-primary/20 text-ds-label font-medium text-ds-accent-primary">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-ds-label font-medium text-ds-text-primary">
                      {t.name}
                    </p>
                    <p className="text-ds-caption text-ds-text-muted">
                      {t.company} &middot; {t.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </>
  )
}

export { Industries }

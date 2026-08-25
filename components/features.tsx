"use client";

import { motion } from "framer-motion";
import {
  PhoneCall,
  CalendarCheck,
  Star,
  MessageSquare,
  Mic2,
  Database,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@iconify/react";

import { Reveal, StaggerGroup, staggerItem } from "@/components/Reveal";
import { PerspectiveCard } from "@/components/PerspectiveCard";

interface Feature {
  icon: LucideIcon | typeof Icon;
  iconName?: string;
  title: string;
  text: string;
  span?: string;
}

const features: Feature[] = [
  {
    icon: PhoneCall,
    title: "AI Answers Calls 24/7",
    text: "Never miss a call again. Your AI receptionist answers every inbound call with natural conversation, captures caller info, and routes intelligently.",
    span: "md:col-span-2",
  },
  {
    icon: CalendarCheck,
    title: "Books Appointments Automatically",
    text: "Syncs with your calendar and books appointments directly. No back-and-forth — the AI handles scheduling end-to-end.",
  },
  {
    icon: Star,
    title: "Replies to Reviews",
    text: "Automatically responds to Google and review platform feedback. Maintain your reputation without lifting a finger.",
  },
  {
    icon: Icon,
    iconName: "lucide:instagram",
    title: "Instagram & Facebook DM",
    text: "Turn DMs into leads. The AI answers Facebook & Instagram — answering questions, capturing leads, and booking appointments around the clock.",
    span: "md:col-span-2",
  },
  {
    icon: MessageSquare,
    title: "SMS & WhatsApp",
    text: "Two-way texting via SMS and WhatsApp. The AI carries on natural conversations, sends reminders, and follows up automatically.",
  },
  {
    icon: Mic2,
    title: "AI Voice Receptionist",
    text: "A natural, human-like voice that answers calls with your business info, tone, and branding. Callers can't tell it's AI.",
  },
  {
    icon: Database,
    title: "CRM Integration",
    text: "Every call, chat, and lead is logged to your CRM automatically. Full context, no data entry, never lose a lead.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    text: "Real-time dashboard with call volume, lead scores, conversion rates, and peak hours. Know exactly what's working.",
    span: "md:col-span-2",
  },
];

export function Features() {
  return (
    <section className="section-full py-20 sm:py-24 relative overflow-hidden">
      {/* Ambient backdrop */}
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
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Reveal direction="up">
            <span className="text-xs uppercase tracking-[0.25em] text-[#D3D8E2] font-medium">
              Features
            </span>
          </Reveal>
          <Reveal direction="up" delay={0.05}>
            <h2 className="section-headline-shine mt-3 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
              Everything you need
            </h2>
          </Reveal>
          <Reveal direction="up" delay={0.1}>
            <p className="mt-5 text-base sm:text-lg text-[#A7ADBB]">
              Your AI receptionist that never sleeps, never takes a day off,
              and never misses an opportunity.
            </p>
          </Reveal>
        </div>

        {/* Bento grid */}
        <StaggerGroup
          stagger={0.12}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={staggerItem} className={`${f.span ?? ""}`}>
              <PerspectiveCard
                className="h-full rounded-2xl glass-card p-6 transition-all duration-300"
                maxTilt={6}
              >
                <div
                  className="relative grid place-items-center w-11 h-11 rounded-xl mb-5"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  {f.iconName ? (
                    <Icon icon={f.iconName} className="w-5 h-5 text-purple-300" />
                  ) : (
                    (() => {
                      const IconComp = f.icon as LucideIcon;
                      return <IconComp className="w-5 h-5 text-purple-300" />;
                    })()
                  )}
                </div>
                <h3 className="text-lg font-medium text-[#E8EBF1] mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-[#A7ADBB] leading-relaxed">
                  {f.text}
                </p>
                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </PerspectiveCard>
            </motion.div>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

"use client";

import {
  HeartPulse,
  Scissors,
  Scale,
  Building,
  Utensils,
  Car,
  Wrench,
  Dumbbell,
  Briefcase,
  ShoppingCart,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@iconify/react";

import { Reveal, StaggerGrid } from "@/components/Reveal";
import { PerspectiveCard } from "@/components/PerspectiveCard";

type Industry = {
  icon: LucideIcon | typeof Icon;
  iconName?: string;
  name: string;
  benefit: string;
};

const INDUSTRIES: Industry[] = [
  { icon: Icon, iconName: "lucide:tooth", name: "Dental Clinics", benefit: "Book appointments, send reminders, answer insurance questions 24/7" },
  { icon: HeartPulse, name: "Medical Practices", benefit: "Handle patient calls, triage requests, and schedule follow-ups automatically" },
  { icon: Scissors, name: "Salons & Spas", benefit: "Manage bookings, answer service questions, and reduce no-shows" },
  { icon: Scale, name: "Law Firms", benefit: "Screen potential clients, capture case details, and book consultations" },
  { icon: Building, name: "Real Estate", benefit: "Qualify leads, schedule showings, and follow up with potential buyers" },
  { icon: Utensils, name: "Restaurants", benefit: "Take reservations, answer menu questions, and manage call-in orders" },
  { icon: Car, name: "Automotive", benefit: "Schedule service appointments, provide estimates, and send reminders" },
  { icon: Wrench, name: "Home Services", benefit: "Dispatch technicians, quote jobs, and handle emergency calls" },
  { icon: Dumbbell, name: "Fitness Studios", benefit: "Book classes, manage memberships, and answer membership questions" },
  { icon: Briefcase, name: "Agencies", benefit: "Capture leads, qualify prospects, and schedule discovery calls" },
  { icon: ShoppingCart, name: "E-commerce", benefit: "Handle customer support, track orders, and process returns" },
  { icon: Globe, name: "Professional Services", benefit: "Manage client intake, automate follow-ups, and book consultations" },
];

function Industries() {
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
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <Reveal>
            <span className="text-xs uppercase tracking-[0.25em] text-[#D3D8E2] font-medium">
              Industries
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="section-headline-shine mt-3 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
              Built for every business
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 text-base sm:text-lg text-[#C3C9D6]">
              Your AI receptionist adapts to your industry out of the box. No
              custom training, no complex setup — just plug and play.
            </p>
          </Reveal>
        </div>

        {/* Industry grid */}
        <StaggerGrid
          items={INDUSTRIES}
          columns={4}
          className="grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
          amount={0.05}
          renderItem={(item) => (
            <PerspectiveCard
              maxTilt={5}
              scale={1.03}
              className="h-full rounded-[4.5rem] glass-card"
            >
              <div className="p-5 sm:p-6 h-full flex flex-col items-center text-center">
                <div className="flex size-10 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 transition-transform duration-300 group-hover:scale-105">
                  {"iconName" in item ? (
                    <Icon
                      icon={item.iconName!}
                      className="w-5 h-5 text-purple-300"
                    />
                  ) : (
                    (() => {
                      const LucideIconComp = item.icon as LucideIcon;
                      return (
                        <LucideIconComp className="w-5 h-5 text-purple-300" />
                      );
                    })()
                  )}
                </div>
                <p className="mt-3 text-sm font-medium text-[#D3D8E2]">
                  {item.name}
                </p>
                <p className="mt-1 text-xs text-[#C3C9D6] leading-relaxed">
                  {item.benefit}
                </p>
              </div>
            </PerspectiveCard>
          )}
        />
      </div>
    </section>
  );
}

export { Industries };

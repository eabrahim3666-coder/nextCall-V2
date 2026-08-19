"use client";

import {
  Calendar,
  MessageCircle,
  MessageSquare,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@iconify/react";

import { Reveal } from "@/components/Reveal";
import { PerspectiveCard } from "@/components/PerspectiveCard";

type Integration = {
  icon: LucideIcon | typeof Icon;
  iconName?: string;
  name: string;
  description: string;
};

const INTEGRATIONS: Integration[] = [
  { icon: Calendar, name: "Google Calendar", description: "Sync bookings" },
  { icon: MessageCircle, name: "WhatsApp", description: "Two-way chat" },
  {
    icon: Icon,
    iconName: "lucide:instagram",
    name: "Instagram",
    description: "DM automation",
  },
  { icon: MessageSquare, name: "Messenger", description: "Facebook DM" },
  {
    icon: Icon,
    iconName: "lucide:sms",
    name: "SMS",
    description: "Text messaging",
  },
  { icon: Star, name: "Google Reviews", description: "Auto replies" },
  { icon: Zap, name: "Zapier", description: "Call data via webhooks" },
];

function Integrations() {
  return (
    <section
      id="built-on"
      className="section-full relative overflow-hidden py-20 sm:py-24 flex flex-col justify-center"
    >
      {/* Ambient background — STATIC */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-5%] w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(190,195,205,0.16)_0%,transparent_70%)] blur-[100px] opacity-60" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(140,145,155,0.12)_0%,transparent_70%)] blur-[120px] opacity-60" />
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
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <Reveal>
            <span className="text-xs uppercase tracking-[0.25em] text-[#C3C9D6] font-medium">
              Integrations
            </span>
          </Reveal>
                    <Reveal delay={0.05}>
            <h2 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight text-transparent bg-clip-text bg-[linear-gradient(90deg,#0C0C0C_0%,#0C0C0C_35%,#4E5562_50%,#0C0C0C_65%,#0C0C0C_100%)] bg-[length:200%_100%] animate-[text-shine_7s_linear_infinite]">
              Works with your stack
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 text-base sm:text-lg text-[#A7ADBB]">
              Every service here is actively powering your calls, data, and
              automations in production.
            </p>
          </Reveal>
        </div>

        <div className="flex flex-wrap justify-center gap-4 sm:gap-5 max-w-5xl mx-auto">
          {INTEGRATIONS.map((item) => (
            <Reveal
              key={item.name}
              delay={0.05}
              className="w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.833rem)] lg:w-[calc(25%-0.9375rem)] h-full"
              amount={0.3}
            >
              <PerspectiveCard
                maxTilt={6}
                scale={1.03}
                className="h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_20px_40px_-20px_rgba(255,255,255,0.15)] hover:border-white/25"
              >
                <div className="flex flex-col items-center gap-3 h-full">
                <div className="flex size-12 items-center justify-center rounded-full bg-white/5 border border-white/10 transition-transform duration-300 group-hover:scale-105">
                  {"iconName" in item ? (
                    <Icon
                      icon={item.iconName!}
                      className="w-6 h-6 text-[#C3C9D6]"
                    />
                  ) : (
                    (() => {
                      const LucideIconComp = item.icon as LucideIcon;
                      return (
                        <LucideIconComp className="w-6 h-6 text-[#C3C9D6]" />
                      );
                    })()
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#C3C9D6] leading-tight">
                    {item.name}
                  </p>
                  <p className="text-xs text-[#A7ADBB] leading-tight mt-0.5">
                    {item.description}
                  </p>
                </div>
                </div>
              </PerspectiveCard>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.15} className="mt-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-[#A7ADBB] shadow-sm">
            <Zap className="w-4 h-4 text-[#C3C9D6]" />
            + 2,000 more tools via Zapier / Make / n8n webhooks
          </span>
        </Reveal>
      </div>
    </section>
  );
}

export { Integrations };

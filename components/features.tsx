"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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

const FEATURES_INTRO_CSS = `
/* ---- Card skin: warm-black gradient, borderless ---- */
.feat-box {
  background-image: linear-gradient(var(--ga, 135deg), #0a0604 0%, #000000 62%);
  border-radius: 16px;
  border: none;
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease, filter 0.35s ease;
}
.feat-box:hover, .feat-box:active {
  transform: translateY(-4px);
  filter: brightness(1.15);
  box-shadow: 0 18px 44px -16px rgba(255, 75, 0, 0.22), 0 10px 26px -14px rgba(0, 0, 0, 0.85);
}
@media (hover: none) {
  .feat-box:active {
    transform: translateY(-4px);
    filter: brightness(1.15);
    box-shadow: 0 18px 44px -16px rgba(255, 75, 0, 0.22), 0 10px 26px -14px rgba(0, 0, 0, 0.85);
  }
}
.feat-sheen-bar {
  position: absolute;
  top: -15%;
  bottom: -15%;
  left: 0;
  width: 42%;
  transform: translateX(-150%) skewX(-14deg);
  background: linear-gradient(100deg, rgba(255,75,0,0) 0%, rgba(255,75,0,0.05) 35%, rgba(255,75,0,0.13) 50%, rgba(255,75,0,0.05) 65%, rgba(255,75,0,0) 100%);
  will-change: transform;
}
@media (prefers-reduced-motion: no-preference) {
  .feat-section:not(.feat-play) :is(.feat-box, .feat-icon, .feat-title, .feat-desc, .feat-kicker, .feat-sub) {
    opacity: 0;
  }
  .feat-section:not(.feat-play) .feat-word {
    opacity: 0;
    transform: translateY(115%);
  }
  .feat-section:not(.feat-play) .feat-sheen {
    opacity: 0;
  }
  .feat-section:not(.feat-play) .feat-box {
    transition: none;
  }
  .feat-play .feat-kicker {
    animation: feat-kicker 1.1s cubic-bezier(0.22, 1, 0.36, 1) 100ms backwards;
  }
  .feat-play .feat-word {
    animation: feat-word 0.9s cubic-bezier(0.22, 1, 0.36, 1) var(--wd) backwards;
  }
  .feat-play .feat-sub {
    animation: feat-rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) 520ms backwards;
  }
  .feat-play .feat-grid {
    animation: feat-grid 1.9s cubic-bezier(0.22, 1, 0.36, 1) 420ms backwards;
  }
  .feat-play .feat-box {
    animation: feat-card 1.1s cubic-bezier(0.22, 1, 0.36, 1) var(--fd) backwards;
    will-change: transform, opacity, filter;
  }
  .feat-play .feat-icon {
    animation: feat-pop 0.65s cubic-bezier(0.22, 1, 0.36, 1) calc(var(--fd) + 620ms) backwards;
  }
  .feat-play .feat-title {
    animation: feat-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) calc(var(--fd) + 760ms) backwards;
  }
  .feat-play .feat-desc {
    animation: feat-rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) calc(var(--fd) + 880ms) backwards;
  }
  .feat-play .feat-sheen-bar {
    animation: feat-sheen-bar 1.25s cubic-bezier(0.22, 1, 0.36, 1) 2100ms backwards;
  }
}
@keyframes feat-kicker {
  from { opacity: 0; letter-spacing: 0.55em; transform: translateY(10px); }
  to { opacity: 1; letter-spacing: 0.3em; transform: translateY(0); }
}
@keyframes feat-word {
  from { transform: translateY(115%); }
  to { transform: translateY(0); }
}
@keyframes feat-rise {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes feat-grid {
  from { opacity: 0.5; transform: scale(1.045) translateY(20px); filter: blur(7px); }
  to { opacity: 1; transform: none; filter: blur(0); }
}
@keyframes feat-card {
  0% { opacity: 0; transform: translate(var(--fx), var(--fy)) rotate(var(--fr)) scale(var(--fs)); filter: blur(9px); }
  55% { opacity: 1; filter: blur(0); }
  100% { opacity: 1; transform: translate(0,0) rotate(0deg) scale(1); filter: blur(0); }
}
@keyframes feat-pop {
  from { opacity: 0; transform: scale(0.2) rotate(-8deg); }
  to { opacity: 1; transform: scale(1) rotate(0deg); }
}
@keyframes feat-sheen-bar {
  from { transform: translateX(-150%) skewX(-14deg); }
  to { transform: translateX(350%) skewX(-14deg); }
}
`;

interface Feature {
  icon: LucideIcon | typeof Icon;
  iconName?: string;
  title: string;
  text: string;
  span?: string;
  ga: string;
  fx: number;
  fy: number;
  fr: number;
  fs: number;
}

const features: Feature[] = [
  {
    icon: PhoneCall,
    title: "AI Answers Calls 24/7",
    text: "Never miss a call again. Your AI receptionist answers every inbound call with natural conversation, captures caller info, and routes intelligently.",
    span: "md:col-span-2",
    ga: "135deg",
    fx: -150,
    fy: -80,
    fr: -7,
    fs: 0.82,
  },
  {
    icon: CalendarCheck,
    title: "Books Appointments Automatically",
    text: "Syncs with your calendar and books appointments directly. No back-and-forth — the AI handles scheduling end-to-end.",
    ga: "205deg",
    fx: 160,
    fy: -90,
    fr: 6,
    fs: 0.8,
  },
  {
    icon: Star,
    title: "Replies to Reviews",
    text: "Automatically responds to Google and review platform feedback. Maintain your reputation without lifting a finger.",
    ga: "315deg",
    fx: -170,
    fy: 40,
    fr: -5,
    fs: 0.84,
  },
  {
    icon: Icon,
    iconName: "lucide:instagram",
    title: "Instagram & Facebook DM",
    text: "Turn DMs into leads. The AI answers Facebook & Instagram — answering questions, capturing leads, and booking appointments around the clock.",
    span: "md:col-span-2",
    ga: "110deg",
    fx: 70,
    fy: -130,
    fr: 5,
    fs: 0.84,
  },
  {
    icon: MessageSquare,
    title: "SMS & WhatsApp",
    text: "Two-way texting via SMS and WhatsApp. The AI carries on natural conversations, sends reminders, and follows up automatically.",
    ga: "225deg",
    fx: -160,
    fy: 70,
    fr: -6,
    fs: 0.83,
  },
  {
    icon: Mic2,
    title: "AI Voice Receptionist",
    text: "A natural, human-like voice that answers calls with your business info, tone, and branding. Callers can't tell it's AI.",
    ga: "160deg",
    fx: 20,
    fy: 140,
    fr: 4,
    fs: 0.84,
  },
  {
    icon: Database,
    title: "CRM Integration",
    text: "Every call, chat, and lead is logged to your CRM automatically. Full context, no data entry, never lose a lead.",
    ga: "250deg",
    fx: 170,
    fy: 80,
    fr: 6,
    fs: 0.83,
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    text: "Real-time dashboard with call volume, lead scores, conversion rates, and peak hours. Know exactly what's working.",
    span: "md:col-span-2",
    ga: "320deg",
    fx: -20,
    fy: 150,
    fr: -3,
    fs: 0.85,
  },
];

const TITLE_WORDS = ["Everything", "you", "need"] as const;
const CARD_DELAY_BASE = 600;
const CARD_STAGGER = 110;

export function Features() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPlaying(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`feat-section relative overflow-hidden py-20 sm:py-24 bg-[#060606] ${playing ? "feat-play" : ""}`}
    >
      <style dangerouslySetInnerHTML={{ __html: FEATURES_INTRO_CSS }} />
      <noscript
        dangerouslySetInnerHTML={{
          __html:
            "<style>.feat-section:not(.feat-play) :is(.feat-box,.feat-icon,.feat-title,.feat-desc,.feat-kicker,.feat-sub,.feat-word,.feat-sheen){opacity:1!important;transform:none!important}</style>",
        }}
      />
      {/* Ambient backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-5%] w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(11,6,3,0.35)_0%,transparent_70%)] blur-[56px] opacity-40" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(11,6,3,0.3)_0%,transparent_70%)] blur-[64px] opacity-40" />
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

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 w-full">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="feat-kicker flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D3D8E2]">
            <span aria-hidden className="h-px w-8 bg-white/15" />
            Features
            <span aria-hidden className="h-px w-8 bg-white/15" />
          </div>
          <h2 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight text-white">
            {TITLE_WORDS.map((word, i) => (
              <span key={word} className="-mb-2 inline-block overflow-hidden pb-2 align-bottom">
                <span
                  className="feat-word inline-block"
                  style={{ "--wd": `${180 + i * 110}ms` } as CSSProperties}
                >
                  {word}
                  {i < TITLE_WORDS.length - 1 ? "\u00A0" : ""}
                </span>
              </span>
            ))}
          </h2>
          <p className="feat-sub mt-5 text-base sm:text-lg text-[#A7ADBB]">
            Your AI receptionist that never sleeps, never takes a day off, and never misses an opportunity.
          </p>
        </div>

        {/* Bento grid */}
        <div className="feat-grid relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
          {features.map((f, i) => (
            <div key={f.title} className={`${f.span ?? ""}`} style={{ "--ga": f.ga } as CSSProperties}>
              <div
                className="feat-box group relative flex h-full flex-col p-6"
                style={
                  {
                    "--fd": `${CARD_DELAY_BASE + i * CARD_STAGGER}ms`,
                    "--fx": `${f.fx}px`,
                    "--fy": `${f.fy}px`,
                    "--fr": `${f.fr}deg`,
                    "--fs": f.fs,
                  } as CSSProperties
                }
              >
                <div
                  className="feat-icon relative grid place-items-center w-11 h-11 rounded-xl mb-5"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  {f.iconName ? (
                    <Icon icon={f.iconName} className="w-5 h-5 text-[#ff4b00]" />
                  ) : (
                    (() => {
                      const IconComp = f.icon as LucideIcon;
                      return <IconComp className="w-5 h-5 text-[#ff4b00]" />;
                    })()
                  )}
                </div>
                <h3 className="feat-title text-lg font-medium text-[#E8EBF1] mb-2">{f.title}</h3>
                <p className="feat-desc text-sm text-[#A7ADBB] leading-relaxed">{f.text}</p>
                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#ff4b00]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
          {/* Light sweep */}
          <div aria-hidden="true" className="feat-sheen pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
            <div className="feat-sheen-bar" />
          </div>
        </div>
      </div>
    </section>
  );
}

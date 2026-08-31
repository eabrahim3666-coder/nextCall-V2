"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";

const FOOTER_INTRO_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .footer-section:not(.footer-play) .footer-line {
    opacity: 0;
    transform: translateY(14px);
  }
  .footer-play .footer-line {
    animation: footer-line-rise 0.75s cubic-bezier(0.22, 1, 0.36, 1) var(--fd) backwards;
  }
}
@keyframes footer-line-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

function Footer() {
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
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <footer
      ref={sectionRef}
      className={`footer-section relative border-t border-white/5 bg-[#050507] overflow-hidden ${playing ? "footer-play" : ""}`}
    >
      <style dangerouslySetInnerHTML={{ __html: FOOTER_INTRO_CSS }} />
      <noscript
        dangerouslySetInnerHTML={{
          __html:
            "<style>.footer-section:not(.footer-play) .footer-line{opacity:1!important;transform:none!important}</style>",
        }}
      />
      {/* Footer background image */}
      <div
        className="absolute inset-0 pointer-events-none bg-no-repeat bg-cover bg-center"
        style={{
          backgroundImage: "url('/footer-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Overlay to keep text readable */}
      <div className="absolute inset-0 pointer-events-none bg-black/40" />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12">
          {/* Logo + description */}
          <div className="lg:col-span-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Next Call"
              className="footer-line h-8 w-auto"
              style={{ "--fd": "700ms" } as React.CSSProperties}
            />
            <p
              className="footer-line mt-4 max-w-xs text-sm text-zinc-400 leading-relaxed"
              style={{ "--fd": "760ms" } as React.CSSProperties}
            >
              AI-powered call &amp; chat receptionist. Never miss another lead.
            </p>
          </div>

          {/* Product */}
          <div className="lg:col-span-2">
            <h4
              className="footer-line text-xs font-medium uppercase tracking-[0.08em] text-zinc-500"
              style={{ "--fd": "820ms" } as React.CSSProperties}
            >
              Product
            </h4>
            <ul className="mt-5 space-y-3">
              <li className="footer-line" style={{ "--fd": "880ms" } as React.CSSProperties}>
                <a href="#features" className="text-sm text-zinc-400 transition-colors hover:text-white">
                  Features
                </a>
              </li>
              <li className="footer-line" style={{ "--fd": "940ms" } as React.CSSProperties}>
                <Link href="/dashboard/settings" className="text-sm text-zinc-400 transition-colors hover:text-white">
                  Settings
                </Link>
              </li>
              <li className="footer-line" style={{ "--fd": "1000ms" } as React.CSSProperties}>
                <a href="#built-on" className="text-sm text-zinc-400 transition-colors hover:text-white">
                  Integrations
                </a>
              </li>
              <li className="footer-line" style={{ "--fd": "1060ms" } as React.CSSProperties}>
                <Link href="/dashboard" className="text-sm text-zinc-400 transition-colors hover:text-white">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="lg:col-span-2">
            <h4
              className="footer-line text-xs font-medium uppercase tracking-[0.08em] text-zinc-500"
              style={{ "--fd": "1120ms" } as React.CSSProperties}
            >
              Company
            </h4>
            <ul className="mt-5 space-y-3">
              <li className="footer-line" style={{ "--fd": "1180ms" } as React.CSSProperties}>
                <a href="#how-it-works" className="text-sm text-zinc-400 transition-colors hover:text-white">
                  About
                </a>
              </li>
              <li className="footer-line" style={{ "--fd": "1240ms" } as React.CSSProperties}>
                <a href="#ask" className="text-sm text-zinc-400 transition-colors hover:text-white">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="lg:col-span-2">
            <h4
              className="footer-line text-xs font-medium uppercase tracking-[0.08em] text-zinc-500"
              style={{ "--fd": "1300ms" } as React.CSSProperties}
            >
              Legal
            </h4>
            <ul className="mt-5 space-y-3">
              <li className="footer-line" style={{ "--fd": "1360ms" } as React.CSSProperties}>
                <Link href="/privacy" className="text-sm text-zinc-400 transition-colors hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li className="footer-line" style={{ "--fd": "1420ms" } as React.CSSProperties}>
                <Link href="/terms" className="text-sm text-zinc-400 transition-colors hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li className="footer-line" style={{ "--fd": "1480ms" } as React.CSSProperties}>
                <Link href="/pricing-policy" className="text-sm text-zinc-400 transition-colors hover:text-white">
                  Pricing
                </Link>
              </li>
              <li className="footer-line" style={{ "--fd": "1540ms" } as React.CSSProperties}>
                <Link href="/terms#refund-policy" className="text-sm text-zinc-400 transition-colors hover:text-white">
                  Refund Policy
                </Link>
              </li>
              <li className="footer-line" style={{ "--fd": "1600ms" } as React.CSSProperties}>
                <Link href="/privacy#security" className="text-sm text-zinc-400 transition-colors hover:text-white">
                  Security
                </Link>
              </li>
              <li className="footer-line" style={{ "--fd": "1660ms" } as React.CSSProperties}>
                <Link href="/google-user-data" className="text-sm text-zinc-400 transition-colors hover:text-white">
                  Google User Data &amp; Limited Use
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 md:flex-row">
          <p className="footer-line text-xs text-zinc-500" style={{ "--fd": "1720ms" } as React.CSSProperties}>
            &copy; 2026 Next Call Chat. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="footer-line flex size-9 items-center justify-center rounded-lg border border-white/10 text-[#ff4b00] transition-all duration-200 hover:border-[#ff4b00]/40 hover:text-[#ff4b00]"
              style={{ "--fd": "1780ms" } as React.CSSProperties}
              aria-label="Twitter"
            >
              <Icon icon="lucide:twitter" width={16} />
            </a>
            <a
              href="#"
              className="footer-line flex size-9 items-center justify-center rounded-lg border border-white/10 text-[#ff4b00] transition-all duration-200 hover:border-[#ff4b00]/40 hover:text-[#ff4b00]"
              style={{ "--fd": "1840ms" } as React.CSSProperties}
              aria-label="GitHub"
            >
              <Icon icon="lucide:github" width={16} />
            </a>
            <a
              href="#"
              className="footer-line flex size-9 items-center justify-center rounded-lg border border-white/10 text-[#ff4b00] transition-all duration-200 hover:border-[#ff4b00]/40 hover:text-[#ff4b00]"
              style={{ "--fd": "1900ms" } as React.CSSProperties}
              aria-label="LinkedIn"
            >
              <Icon icon="lucide:linkedin" width={16} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export { Footer };

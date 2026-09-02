"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Sparkles, Rocket, Plug, MessageCircleQuestion, ArrowRight } from "lucide-react";
import { SignInButton, useUser } from "@clerk/nextjs";

const NAV_LINKS = [
  { href: "#features", label: "Features", icon: Sparkles },
  { href: "#how-it-works", label: "How It Works", icon: Rocket },
  { href: "#built-on", label: "Integrations", icon: Plug },
  { href: "#ask", label: "Ask Us", icon: MessageCircleQuestion },
] as const;

function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const { isSignedIn } = useUser();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    // Close the mobile menu when tapping outside the header.
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open, closeMenu]);

  return (
    <motion.header
      ref={headerRef}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-3 sm:top-4 left-0 right-0 z-50 flex justify-center px-4 sm:px-6 pointer-events-none transition-all duration-500"
    >
      <div
        className={`pointer-events-auto flex h-14 sm:h-16 w-full max-w-3xl items-center justify-between rounded-full border px-5 sm:px-8 backdrop-blur-xl transition-all duration-500 ${
          scrolled
            ? "bg-[#f8f8f8] border-black shadow-[0_12px_40px_-16px_rgba(0,0,0,0.18)]"
            : "bg-[#f8f8f8] border-black"
        }`}
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
          aria-label="Next Call Home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Next Call" className="h-7 w-auto sm:h-8" />
        </Link>

        {/* Desktop links */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-1"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => {
                // SceneStack renders desktop scenes inside transformed
                // containers, so native hash-jumps can't reach them. Ask the
                // scene stack to scroll instead (mobile/touch keeps native
                // behavior — its scenes are in normal document flow).
                if (window.matchMedia("(pointer: fine)").matches) {
                  e.preventDefault();
                  window.dispatchEvent(
                    new CustomEvent("nav-scroll", { detail: { hash: link.href } })
                  );
                }
              }}
              className="nav-link text-sm text-[#1e1e1e] hover:text-black transition-colors px-4 py-2"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="text-sm font-medium text-[#1e1e1e] hover:text-black transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <SignInButton forceRedirectUrl="/dashboard">
              <span className="inline-flex items-center justify-center rounded-full bg-[#ff4b00] px-5 py-2 text-sm font-semibold text-white hover:bg-[#e04400] transition-colors">
                Login
              </span>
            </SignInButton>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="md:hidden grid place-items-center w-9 h-9 rounded-md text-[#ff4b00]"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            ref={menuRef}
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden pointer-events-auto absolute left-1/2 top-full mt-3 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 overflow-hidden rounded-3xl border border-black/5 bg-white/90 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          >
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-[#ff4b00] via-[#ff8a3d] to-[#ff4b00]" />

            <div className="px-4 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((l) => {
                const Icon = l.icon;
                return (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={closeMenu}
                    className="group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px] font-medium text-[#1e1e1e] transition-all duration-200 hover:bg-[#fff5f0] hover:pl-5 active:scale-[0.98]"
                  >
                    <span className="grid place-items-center size-9 rounded-xl bg-[#1e1e1e]/5 text-[#ff4b00] transition-colors duration-200 group-hover:bg-[#ff4b00] group-hover:text-white">
                      <Icon className="size-4.5" />
                    </span>
                    {l.label}
                    <ArrowRight className="ml-auto size-4 text-zinc-300 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-[#ff4b00] group-hover:opacity-100 -translate-x-2" />
                  </a>
                );
              })}

              <div className="my-2 h-px w-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

              {isSignedIn ? (
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#1e1e1e] px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-black active:scale-[0.98]"
                >
                  Go to Dashboard
                  <ArrowRight className="size-4" />
                </Link>
              ) : (
                <SignInButton forceRedirectUrl="/dashboard">
                  <span className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff4b00] to-[#ff7a2e] px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_30px_-10px_rgba(255,75,0,0.6)] transition-all duration-200 hover:shadow-[0_16px_36px_-10px_rgba(255,75,0,0.8)] active:scale-[0.98]">
                    Login
                    <ArrowRight className="size-4" />
                  </span>
                </SignInButton>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

export { Navigation };
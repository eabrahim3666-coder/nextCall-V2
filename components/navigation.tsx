"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#built-on", label: "Integrations" },
  { href: "#ask", label: "Ask Us" },
] as const;

function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, closeMenu]);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-3 sm:top-4 left-0 right-0 z-50 flex justify-center px-4 sm:px-6 pointer-events-none transition-all duration-500"
    >
      <div
        className={`pointer-events-auto flex h-14 sm:h-16 w-full max-w-5xl items-center justify-between rounded-full border px-5 sm:px-8 backdrop-blur-xl transition-all duration-500 ${
          scrolled
            ? "bg-black/70 border-white/10 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.9)]"
            : "bg-black/40 border-white/10"
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
              className="nav-link text-sm text-[#C3C9D6] hover:text-white transition-colors px-4 py-2"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-[#C3C9D6] hover:text-white transition-colors"
          >
            Go to Dashboard
          </Link>
          <a
            href="#pricing"
            className="btn-silver text-sm font-medium px-4 py-2 rounded-full"
          >
            Start Free Trial
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="md:hidden grid place-items-center w-9 h-9 rounded-md text-white"
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden overflow-hidden bg-black/90 backdrop-blur-xl border-t border-white/5"
          >
            <div className="px-5 py-4 flex flex-col gap-3">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={closeMenu}
                  className="text-zinc-300 hover:text-white py-2"
                >
                  {l.label}
                </a>
              ))}
              <Link
                href="/dashboard"
                onClick={closeMenu}
                className="text-zinc-300 hover:text-white py-2"
              >
                Go to Dashboard
              </Link>
              <a
                href="#pricing"
                onClick={closeMenu}
                className="btn-gradient text-sm font-medium text-white px-4 py-2.5 rounded-full text-center inline-flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

export { Navigation };

"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { Icon } from "@iconify/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#built-on", label: "Built On" },
  { href: "#ask", label: "Ask Us" },
] as const

function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const openMenu = useCallback(() => {
    prevFocusRef.current = document.activeElement as HTMLElement
    setMenuOpen(true)
  }, [])

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    prevFocusRef.current?.focus()
    prevFocusRef.current = null
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu()
        return
      }
      if (e.key !== "Tab" || !menuRef.current) return

      const focusable = menuRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [menuOpen, closeMenu])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-ds-bg-card/80 backdrop-blur-xl border-b border-ds-border-primary shadow-ds-sm"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="mx-auto flex h-[72px] md:h-20 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
          aria-label="Next Call Home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Next Call"
            className={cn(
              "h-8 w-auto transition-opacity duration-300"
            )}
          />
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
              className={cn(
                "group relative px-4 py-2 text-ds-label font-medium transition-colors duration-200",
                scrolled
                  ? "text-ds-text-secondary hover:text-ds-accent-primary"
                  : "text-ds-text-inverse/70 hover:text-ds-text-inverse"
              )}
            >
              {link.label}
              <span
                className={cn(
                  "absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full transition-all duration-300 group-hover:w-[calc(100%-32px)]",
                  scrolled ? "bg-ds-accent-primary" : "bg-ds-text-inverse"
                )}
              />
            </a>
          ))}
        </nav>

        {/* Right section */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex items-center gap-2 rounded-full border-white/15 bg-white/[0.04] backdrop-blur-xl text-ds-text-inverse/80 hover:text-ds-text-inverse hover:bg-white/[0.08] hover:border-white/25"
            asChild
          >
            <Link href="/dashboard">
              Start Free Trial
              <Icon icon="lucide:arrow-right" width={14} />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex items-center gap-2 rounded-full border-white/15 bg-white/[0.04] backdrop-blur-xl text-ds-text-inverse/80 hover:text-ds-text-inverse hover:bg-white/[0.08] hover:border-white/25"
            asChild
          >
            <Link href="/dashboard">
              Go to Dashboard
              <Icon icon="lucide:arrow-right" width={14} />
            </Link>
          </Button>

          {/* Mobile toggle */}
          <button
            ref={toggleRef}
            type="button"
            onClick={menuOpen ? closeMenu : openMenu}
            className={cn(
              "md:hidden inline-flex items-center justify-center size-9 rounded-lg transition-colors duration-200",
              scrolled
                ? "text-ds-text-secondary hover:text-ds-text-primary hover:bg-ds-bg-muted"
                : "text-ds-text-inverse/70 hover:text-ds-text-inverse"
            )}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <Icon
              icon={menuOpen ? "lucide:x" : "lucide:menu"}
              width={20}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-ds-bg-overlay backdrop-blur-sm md:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile menu panel */}
      <div
        id="mobile-menu"
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full max-w-sm md:hidden",
          "bg-ds-bg-card border-l border-ds-border-primary",
          "shadow-ds-lg transition-transform duration-400 ease-ds-smooth",
          menuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-[72px] items-center justify-between px-6 border-b border-ds-border-primary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Next Call" className="h-7 w-auto" />
          <button
            type="button"
            onClick={closeMenu}
            className="inline-flex items-center justify-center size-9 rounded-lg text-ds-text-secondary hover:text-ds-text-primary hover:bg-ds-bg-muted transition-colors duration-200"
            aria-label="Close menu"
          >
            <Icon icon="lucide:x" width={20} />
          </button>
        </div>

        <nav aria-label="Mobile navigation" className="px-4 pt-6 pb-8">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="flex items-center px-4 py-3 text-ds-body font-medium text-ds-text-primary rounded-lg hover:bg-ds-bg-muted transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="mt-8 px-4">
            <Button
              variant="outline"
              size="xl"
              className="w-full rounded-full"
              asChild
            >
              <Link href="/dashboard" onClick={closeMenu}>
                Go to Dashboard
                <Icon icon="lucide:arrow-right" width={16} />
              </Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  )
}

export { Navigation }

"use client"

import { Icon } from "@iconify/react"
import Link from "next/link"

function Footer() {
  return (
    <footer className="border-t border-ds-border-primary bg-ds-bg-primary">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12">
          {/* Logo + description */}
          <div className="lg:col-span-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Next Call" className="h-8 w-auto" />
            <p className="mt-4 max-w-xs text-ds-small-body text-ds-text-secondary leading-relaxed">
              AI-powered call & chat receptionist. Never miss another lead.
            </p>
          </div>

          {/* Product */}
          <div className="lg:col-span-2">
            <h4 className="text-ds-caption font-medium uppercase tracking-[0.08em] text-ds-text-muted">
              Product
            </h4>
            <ul className="mt-5 space-y-3">
              <li>
                <a
                  href="#features"
                  className="text-ds-small-body text-ds-text-secondary transition-colors hover:text-ds-text-primary"
                >
                  Features
                </a>
              </li>
              <li>
                <Link
                  href="/dashboard/settings"
                  className="text-ds-small-body text-ds-text-secondary transition-colors hover:text-ds-text-primary"
                >
                  Settings
                </Link>
              </li>
              <li>
                <a
                  href="#built-on"
                  className="text-ds-small-body text-ds-text-secondary transition-colors hover:text-ds-text-primary"
                >
                  Integrations
                </a>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-ds-small-body text-ds-text-secondary transition-colors hover:text-ds-text-primary"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="lg:col-span-2">
            <h4 className="text-ds-caption font-medium uppercase tracking-[0.08em] text-ds-text-muted">
              Company
            </h4>
            <ul className="mt-5 space-y-3">
              <li>
                <a
                  href="#how-it-works"
                  className="text-ds-small-body text-ds-text-secondary transition-colors hover:text-ds-text-primary"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#ask"
                  className="text-ds-small-body text-ds-text-secondary transition-colors hover:text-ds-text-primary"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="lg:col-span-2">
            <h4 className="text-ds-caption font-medium uppercase tracking-[0.08em] text-ds-text-muted">
              Legal
            </h4>
            <ul className="mt-5 space-y-3">
              <li>
                <Link
                  href="/privacy"
                  className="text-ds-small-body text-ds-text-secondary transition-colors hover:text-ds-text-primary"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-ds-small-body text-ds-text-secondary transition-colors hover:text-ds-text-primary"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing-policy"
                  className="text-ds-small-body text-ds-text-secondary transition-colors hover:text-ds-text-primary"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/terms#refund-policy"
                  className="text-ds-small-body text-ds-text-secondary transition-colors hover:text-ds-text-primary"
                >
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy#security"
                  className="text-ds-small-body text-ds-text-secondary transition-colors hover:text-ds-text-primary"
                >
                  Security
                </Link>
              </li>
              <li>
                <Link
                  href="/google-user-data"
                  className="text-ds-small-body text-ds-text-secondary transition-colors hover:text-ds-text-primary"
                >
                  Google User Data & Limited Use
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-ds-border-primary pt-8 md:flex-row">
          <p className="text-ds-caption text-ds-text-muted">
            &copy; 2026 Next Call Chat. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="flex size-9 items-center justify-center rounded-lg border border-ds-border-primary text-ds-text-muted transition-all duration-200 hover:border-ds-border-hover hover:text-ds-text-primary"
              aria-label="Twitter"
            >
              <Icon icon="lucide:twitter" width={16} />
            </a>
            <a
              href="#"
              className="flex size-9 items-center justify-center rounded-lg border border-ds-border-primary text-ds-text-muted transition-all duration-200 hover:border-ds-border-hover hover:text-ds-text-primary"
              aria-label="GitHub"
            >
              <Icon icon="lucide:github" width={16} />
            </a>
            <a
              href="#"
              className="flex size-9 items-center justify-center rounded-lg border border-ds-border-primary text-ds-text-muted transition-all duration-200 hover:border-ds-border-hover hover:text-ds-text-primary"
              aria-label="LinkedIn"
            >
              <Icon icon="lucide:linkedin" width={16} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export { Footer }

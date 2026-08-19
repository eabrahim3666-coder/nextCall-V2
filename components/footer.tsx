"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";

function Footer() {
  return (
    <footer className="relative border-t border-white/5 bg-[#050507]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-[500px] h-[400px] glow-aurora opacity-20" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12">
          {/* Logo + description */}
          <div className="lg:col-span-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Next Call" className="h-8 w-auto" />
            <p className="mt-4 max-w-xs text-sm text-zinc-400 leading-relaxed">
              AI-powered call &amp; chat receptionist. Never miss another lead.
            </p>
          </div>

          {/* Product */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
              Product
            </h4>
            <ul className="mt-5 space-y-3">
              <li>
                <a
                  href="#features"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Features
                </a>
              </li>
              <li>
                <Link
                  href="/dashboard/settings"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Settings
                </Link>
              </li>
              <li>
                <a
                  href="#built-on"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Integrations
                </a>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
              Company
            </h4>
            <ul className="mt-5 space-y-3">
              <li>
                <a
                  href="#how-it-works"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#ask"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
              Legal
            </h4>
            <ul className="mt-5 space-y-3">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing-policy"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/terms#refund-policy"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy#security"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Security
                </Link>
              </li>
              <li>
                <Link
                  href="/google-user-data"
                  className="text-sm text-zinc-400 transition-colors hover:text-white"
                >
                  Google User Data &amp; Limited Use
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 md:flex-row">
          <p className="text-xs text-zinc-500">
            &copy; 2026 Next Call Chat. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-zinc-500 transition-all duration-200 hover:border-purple-400/40 hover:text-purple-300"
              aria-label="Twitter"
            >
              <Icon icon="lucide:twitter" width={16} />
            </a>
            <a
              href="#"
              className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-zinc-500 transition-all duration-200 hover:border-purple-400/40 hover:text-purple-300"
              aria-label="GitHub"
            >
              <Icon icon="lucide:github" width={16} />
            </a>
            <a
              href="#"
              className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-zinc-500 transition-all duration-200 hover:border-purple-400/40 hover:text-purple-300"
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
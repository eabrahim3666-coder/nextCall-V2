"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Settings,
  Building2,
  Brain,
  Mic,
  Phone,
  CreditCard,
  MessageSquare,
  Share2,
  Plug,
  ChevronDown,
} from "lucide-react";

export default function NavLinks({ planType = "standard", vertical = false }: { planType?: string; vertical?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus");
  const isSettingsActive = pathname.startsWith("/dashboard/settings");
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive);

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/docs", label: "Docs", icon: FileText },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  const settingsSubLinks = [
    { id: "business", label: "Business Info", href: "/dashboard/settings?focus=business", icon: Building2 },
    { id: "knowledge", label: "AI Knowledge", href: "/dashboard/settings?focus=knowledge", icon: Brain },
    { id: "greeting", label: "Greeting & Tone", href: "/dashboard/settings?focus=greeting", icon: Mic },
    { id: "routing", label: "Call Routing", href: "/dashboard/settings?focus=routing", icon: Phone },
    { id: "billing", label: "Billing & Plan", href: "/dashboard/settings?focus=billing", icon: CreditCard },
    { id: "sms", label: "Business SMS", href: "/dashboard/settings?focus=sms", icon: MessageSquare },
    { id: "referrals", label: "Referrals", href: "/dashboard/settings?focus=referrals", icon: Share2 },
    { id: "integrations", label: "Integrations", href: "/dashboard/settings?focus=integrations", icon: Plug },
  ];

  return (
    <div className={vertical ? "flex flex-col gap-1.5 text-sm font-medium" : "flex gap-1 text-sm font-medium"}>
      {links.map((link) => {
        const Icon = link.icon;
        // Settings with dropdown when vertical (left sidebar)
        if (vertical && link.href === "/dashboard/settings") {
          return (
            <div key={link.href} className="w-full">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`relative w-full text-left px-3 py-2.5 rounded-xl transition-all duration-300 ease-in-out flex items-center gap-2.5
                  ${isSettingsActive ? "text-white bg-white/10 border border-white/10 shadow-[0_0_20px_-10px_rgba(255,75,0,0.3)]" : "text-[#C3C9D6] hover:text-white hover:bg-white/5 border border-transparent"}`}
              >
                <span className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${isSettingsActive ? "bg-[#ff4b00]/20 text-[#ff4b00] border border-[#ff4b00]/30" : "bg-white/5 text-[#A7ADBB] group-hover:text-white"}`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="flex-1">{link.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#A7ADBB] transition-transform duration-200 ${settingsOpen ? "rotate-180 text-white" : ""}`} />
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-[#ff4b00] rounded-full transition-all duration-300 ease-in-out ${isSettingsActive ? "h-6 shadow-[0_0_10px_rgba(255,75,0,0.6)]" : "h-0"}`} />
              </button>
              <AnimatePresence initial={false}>
                {settingsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1.5 ml-3 pl-3 border-l border-white/5 flex flex-col gap-1 py-1">
                      {settingsSubLinks.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = isSettingsActive && (focus === sub.id || (!focus && sub.id === "business"));
                        return (
                          <Link
                            key={sub.id}
                            href={sub.href}
                            className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 ${isSubActive ? "text-white bg-[#ff4b00]/10 border border-[#ff4b00]/20 shadow-[0_0_15px_-5px_rgba(255,75,0,0.4)]" : "text-[#A7ADBB] hover:text-white hover:bg-white/5 border border-transparent"}`}
                          >
                            <SubIcon className={`w-3.5 h-3.5 shrink-0 transition-colors ${isSubActive ? "text-[#ff4b00]" : "text-[#8a8f9e] group-hover:text-white"}`} />
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        }

        const isActive = link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
        const LinkIcon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative px-3 py-2.5 rounded-xl transition-all duration-300 ease-in-out flex items-center gap-2.5
              ${vertical ? "w-full" : "px-2.5 sm:px-4 py-2 rounded-full"}
              ${isActive ? "text-white bg-white/10 border border-white/10 shadow-[0_0_20px_-10px_rgba(255,75,0,0.2)]" : "text-[#C3C9D6] hover:text-white hover:bg-white/5 border border-transparent"}`}
          >
            <span className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${isActive ? "bg-[#ff4b00]/20 text-[#ff4b00] border border-[#ff4b00]/30" : "bg-white/5 text-[#A7ADBB]"}`}>
              <LinkIcon className="w-3.5 h-3.5" />
            </span>
            {link.label}
            {vertical ? (
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-[#ff4b00] rounded-full transition-all duration-300 ease-in-out ${isActive ? "h-6 shadow-[0_0_10px_rgba(255,75,0,0.6)]" : "h-0"}`} />
            ) : (
              <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 bg-[#ff4b00] rounded-full transition-all duration-300 ease-in-out ${isActive ? "w-4/5" : "w-0"}`} />
            )}
          </Link>
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import NavLinks from "./NavLinks";
import SetupProgressSidebar from "./SetupProgressSidebar";
import type { SetupProgress } from "@/lib/setup-progress";

export default function MobileNav({ planType, setup }: { planType: string; setup?: SetupProgress | null }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden p-2 rounded-lg border border-white/10 bg-white/5 text-[#C3C9D6] hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>
      {open && (
        <div className="absolute top-[56px] left-0 right-0 z-40 bg-black border-b border-white/10 p-4 md:hidden max-h-[calc(100vh-56px)] overflow-y-auto">
          {/* Close only on real navigation (link taps). The Settings toggle is
              a button — a blanket close-on-click here used to slam the whole
              menu shut before the submenu could ever open. */}
          <div
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            <NavLinks vertical planType={planType} />
          </div>
          {/* Same setup widget as the desktop sidebar, so mobile users see
              their progression too. */}
          {setup && !setup.allDone && <SetupProgressSidebar setup={setup} />}
        </div>
      )}
    </>
  );
}

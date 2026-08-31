"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import NavLinks from "./NavLinks";

export default function MobileNav({ planType }: { planType: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden p-2 rounded-lg border border-white/10 bg-white/5 text-[#C3C9D6] hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Toggle menu"
      >
        {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>
      {open && (
        <div className="absolute top-[56px] left-0 right-0 z-40 bg-black border-b border-white/10 p-4 md:hidden">
          <div onClick={() => setOpen(false)}>
            <NavLinks vertical planType={planType} />
          </div>
        </div>
      )}
    </>
  );
}

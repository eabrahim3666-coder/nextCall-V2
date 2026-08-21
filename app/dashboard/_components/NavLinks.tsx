"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks({ planType = "standard" }: { planType?: string }) {
    const pathname = usePathname();

    const links = [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard/docs", label: "Docs" },
        { href: "/dashboard/settings", label: "Settings" },
    ];

    return (
        <div className="flex gap-1 text-sm font-medium">
            {links.map((link) => {
                // Exact match for Dashboard, startsWith for sub-pages like Docs/Settings
                const isActive = link.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(link.href);

                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`relative px-2.5 sm:px-4 py-2 rounded-full transition-all duration-300 ease-in-out 
              ${isActive
                                ? "text-white bg-white/10"
                                : "text-[#C3C9D6] hover:text-white hover:bg-white/5"
                            }`
                        }
                    >
                        {link.label}
                        {/* Animated Underline */}
                        <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 bg-white rounded-full transition-all duration-300 ease-in-out ${isActive ? "w-4/5" : "w-0"}`} />
                    </Link>
                );
            })}
        </div>
    );
}

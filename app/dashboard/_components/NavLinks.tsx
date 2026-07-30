"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/docs", label: "Docs" },
    { href: "/dashboard/simulate-review", label: "Simulate New Review" },
    { href: "/dashboard/settings", label: "Settings" },
];

export default function NavLinks() {
    const pathname = usePathname();

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
                        className={`relative px-4 py-2 rounded-lg transition-all duration-300 ease-in-out 
              ${isActive
                                ? "text-blue-600 bg-blue-50 font-semibold"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                            }`
                        }
                    >
                        {link.label}
                        {/* Animated Underline */}
                        <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 bg-blue-600 rounded-full transition-all duration-300 ease-in-out ${isActive ? "w-4/5" : "w-0"}`} />
                    </Link>
                );
            })}
        </div>
    );
}
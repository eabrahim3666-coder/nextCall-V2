"use client";

import { useEffect } from "react";

export default function TawkWidget({ propertyId, widgetId }: { propertyId: string; widgetId: string }) {
    useEffect(() => {
        // Prevent duplicates
        if (document.getElementById("tawk-script")) return;

        const script = document.createElement("script");
        script.id = "tawk-script";
        script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
        script.async = true;
        script.charset = "UTF-8";
        script.setAttribute("crossorigin", "*");
        document.head.appendChild(script);

        const hideBranding = () => {
            try {
                document.querySelectorAll<HTMLElement>(".tawk-text-center, .tawk-branding, [class*='poweredBy'], [class*='branding']")
                    .forEach((el) => {
                        el.innerHTML = "";
                        el.style.minHeight = "10px";
                        el.style.backgroundColor = "";
                    });
                document.querySelectorAll<HTMLAnchorElement>('a[href*="tawk.to"], a[href*="utm_source=tawk-messenger"]')
                    .forEach((a) => {
                        const text = (a.textContent || "").toLowerCase();
                        if (text.includes("powered by") || text.includes("add free chat")) {
                            a.innerHTML = "";
                            if (a.parentElement) {
                                a.parentElement.innerHTML = "";
                                a.parentElement.style.backgroundColor = "";
                            }
                        }
                    });
            } catch {
                // ignore
            }
        };

        hideBranding();
        const interval = setInterval(hideBranding, 3000);
        let observer: MutationObserver | null = null;
        try {
            observer = new MutationObserver(hideBranding);
            observer.observe(document.body, { childList: true, subtree: true });
        } catch {
            // ignore
        }
        [1000, 3000, 6000, 10000].forEach((ms) => setTimeout(hideBranding, ms));

        return () => {
            clearInterval(interval);
            observer?.disconnect();
            const existing = document.getElementById("tawk-script");
            if (existing) existing.remove();
            const widget = document.getElementById("tawk-bubble");
            if (widget) widget.remove();
        };
    }, [propertyId, widgetId]);

    return null;
}
"use client";

import { useLayoutEffect } from "react";

export default function DisableLenis() {
  useLayoutEffect(() => {
    // If the landing page mounted Lenis, make sure it doesn't leave behind
    // scroll state that breaks sticky/layout on the dashboard.
    document.documentElement.classList.remove("lenis");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    document.documentElement.style.transform = "";
    document.body.style.transform = "";

    const prev = window.history.scrollRestoration;
    // Prevent Next from restoring an old scroll position after hydration.
    window.history.scrollRestoration = "manual";

    const resetScroll = () => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event("scroll"));
    };

    resetScroll();
    // rAF is important: Next/React can apply scroll restoration after hydration.
    requestAnimationFrame(() => {
      resetScroll();
      requestAnimationFrame(resetScroll);
    });

    return () => {
      window.history.scrollRestoration = prev;
    };
  }, []);

  return null;
}

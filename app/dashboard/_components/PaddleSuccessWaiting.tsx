"use client";

import { useEffect } from "react";

export default function PaddleSuccessWaiting() {
    useEffect(() => {
        const pollStatus = async () => {
            try {
                const res = await fetch("/api/business/status");
                const data = await res.json();

                if (data.status === "active") {
                    clearInterval(interval);
                    window.location.replace("/dashboard");
                }
            } catch {
                // Keep polling silently on transient failures.
            }
        };

        const interval = setInterval(pollStatus, 3000);
        pollStatus();

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">Preparing your AI...</h2>
            <p className="text-sm text-neutral-400 max-w-sm">We are finalizing your subscription. Please wait a moment...</p>
        </div>
    );
}

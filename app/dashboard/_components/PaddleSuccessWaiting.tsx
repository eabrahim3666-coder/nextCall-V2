"use client";

import { useEffect, useState } from "react";

export default function PaddleSuccessWaiting() {
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        let attempts = 0;

        const pollStatus = async () => {
            try {
                const res = await fetch("/api/business/status");
                const data = await res.json();

                if (data.status === "active") {
                    clearInterval(interval);
                    window.location.replace("/dashboard");
                    return;
                }
            } catch {
                // Keep polling silently on transient failures.
            }

            attempts += 1;
            if (attempts >= 40) {
                clearInterval(interval);
                setTimedOut(true);
            }
        };

        const interval = setInterval(pollStatus, 3000);
        pollStatus();

        return () => {
            clearInterval(interval);
        };
    }, []);

    if (timedOut) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
                <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">Payment received</h2>
                <p className="text-sm text-neutral-400 max-w-sm mb-6">
                    Your subscription is still being confirmed. Refresh once, or return to billing and try again.
                </p>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="bg-white text-black text-sm font-medium px-6 py-3 rounded-full hover:bg-neutral-200"
                    >
                        Check Again
                    </button>
                    <a
                        href="/dashboard/settings"
                        className="border border-white/10 text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-white/5"
                    >
                        Billing Settings
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">Preparing your AI...</h2>
            <p className="text-sm text-neutral-400 max-w-sm">We are finalizing your subscription. Please wait a moment...</p>
        </div>
    );
}

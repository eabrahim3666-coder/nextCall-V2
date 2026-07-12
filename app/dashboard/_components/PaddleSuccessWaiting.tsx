"use client";

import { useEffect } from "react";

export default function PaddleSuccessWaiting({ transactionId }: { transactionId: string | null }) {
    useEffect(() => {
        // Try to verify + activate the business while showing the spinner
        if (transactionId) {
            fetch(`/api/business/status?transaction_id=${encodeURIComponent(transactionId)}`, { cache: "no-store" })
                .catch(() => {});
        }

        // After 3 seconds, go to dashboard regardless
        const timer = setTimeout(() => {
            window.location.replace("/dashboard");
        }, 3000);

        return () => clearTimeout(timer);
    }, [transactionId]);

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">Preparing your AI...</h2>
            <p className="text-sm text-neutral-400 max-w-sm">We are finalizing your subscription. Please wait a moment...</p>
        </div>
    );
}

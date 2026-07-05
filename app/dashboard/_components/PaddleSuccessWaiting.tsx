"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaddleSuccessWaiting() {
    const router = useRouter();

    useEffect(() => {
        const interval = setInterval(() => {
            // Delete the cookie so it doesn't loop forever after activation
            document.cookie = "paddle_redirect=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            router.refresh();
        }, 2000);

        return () => clearInterval(interval);
    }, [router]);

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">Preparing your AI...</h2>
            <p className="text-sm text-neutral-400 max-w-sm">We are finalizing your subscription. Please wait a moment...</p>
        </div>
    );
}
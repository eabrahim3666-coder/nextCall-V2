"use client";

import { useState, useEffect } from "react";

export default function MinutesCounter({
    used,
    limit,
    planType,
    paddleCustomerId,
}: {
    used: number;
    limit: number;
    planType: string;
    paddleCustomerId: string | null;
}) {
    const [open, setOpen] = useState(false);
    const [minutes, setMinutes] = useState(50);
    const [loading, setLoading] = useState(false);
    const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    const low = percent > 80;

    useEffect(() => {
        function close(e: MouseEvent) {
            const target = e.target as HTMLElement;
            if (!target.closest("[data-minutes-widget]")) setOpen(false);
        }
        document.addEventListener("click", close);
        return () => document.removeEventListener("click", close);
    }, []);

    const handleBuy = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/checkout/paddle-minutes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ minutes }),
            });
            const data = await res.json();
            if (!res.ok) { alert(data.error || "Error"); return; }
            const Paddle = (window as unknown as { Paddle?: { Checkout: { open: (config: Record<string, unknown>) => void } } }).Paddle;
            if (Paddle) {
                Paddle.Checkout.open({
                    transactionId: data.transactionId,
                    settings: { successUrl: `${window.location.origin}/dashboard/settings?focus=billing` },
                });
            } else {
                alert("Payment loading. Try again.");
            }
        } catch { alert("Checkout failed."); } finally { setLoading(false); setOpen(false); }
    };

    return (
        <div className="relative" data-minutes-widget>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${low ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-white/[0.05] border-white/[0.08] text-neutral-400 hover:text-white"}`}
            >
                <span>{used}</span>
                <span className="text-neutral-600">/</span>
                <span>{limit}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${low ? "bg-rose-400 animate-pulse" : "bg-neutral-600"}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#0c0c0c] border border-white/[0.08] rounded-2xl p-5 shadow-2xl z-50">
                    <p className="text-sm font-semibold text-white mb-1">Minutes</p>
                    <p className="text-xs text-neutral-500 mb-4">
                        {used} of {limit} min used ({percent}%)
                    </p>
                    <div className="w-full bg-white/[0.05] rounded-full h-2 mb-4">
                        <div
                            className={`h-2 rounded-full transition-all ${low ? "bg-rose-500" : "bg-indigo-500"}`}
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    {paddleCustomerId && (
                        <>
                            <p className="text-xs font-medium text-white mb-2">Buy more minutes</p>
                            <div className="flex items-center gap-2">
                                <select
                                    value={minutes}
                                    onChange={(e) => setMinutes(Number(e.target.value))}
                                    className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                                >
                                    {Array.from(
                                        { length: (planType === "premium" ? 500 : 200) / 50 },
                                        (_, i) => (i + 1) * 50
                                    ).map(n => (
                                        <option key={n} value={n} className="bg-[#0a0a0a]">
                                            {n} min — ${(planType === "premium" ? n * 0.3 : n * 0.4).toFixed(0)}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={handleBuy}
                                    disabled={loading}
                                    className="bg-indigo-500 text-white text-xs font-medium px-4 py-1.5 rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-30"
                                >
                                    {loading ? "..." : "Buy"}
                                </button>
                            </div>
                            <a href="/dashboard/settings?focus=billing" className="block mt-3 text-[10px] text-neutral-600 hover:text-white transition-colors">
                                Manage in Settings →
                            </a>
                        </>
                    )}
                    {!paddleCustomerId && (
                        <p className="text-[10px] text-amber-400">Subscribe to a plan to buy minutes.</p>
                    )}
                </div>
            )}
        </div>
    );
}

"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";

type PaddleInstance = {
    Initialize: (config: { token?: string }) => void;
    Checkout: {
        open: (config: {
            transactionId?: string;
            items?: { priceId: string; quantity: number }[];
            customData?: Record<string, unknown>;
            settings: { successUrl: string };
        }) => void;
    };
};

const getPaddle = (): PaddleInstance | null => {
    return (window as unknown as { Paddle?: PaddleInstance }).Paddle ?? null;
};

const PADDLE_TRANSACTION_STORAGE_KEY = "nextcall_pending_paddle_transaction_id";

export default function Paywall({ refCode, allowTrial = true }: { refCode?: string; allowTrial?: boolean }) {
    const { user } = useUser();
    const [loading, setLoading] = useState<"trial" | "standard" | "premium" | null>(null);

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
        script.async = true;
        script.onload = () => {
            const Paddle = getPaddle();
            if (Paddle) {
                Paddle.Initialize({ token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN });
                console.log("Paddle initialized:", Paddle);
            }
        };
        document.body.appendChild(script);
    }, []);

    const handleCheckout = async (plan: "trial" | "standard" | "premium") => {
        setLoading(plan);
        const Paddle = getPaddle();

        if (!Paddle) {
            alert("Payment system is still loading. Please wait a moment and try again.");
            setLoading(null);
            return;
        }

        try {
            // Create the transaction server-side so the authenticated Clerk ID
            // is always attached to Paddle webhook custom_data.
            const response = await fetch("/api/checkout/paddle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    plan,
                    business_name: user?.firstName || "New Business",
                    ref: refCode || undefined,
                }),
            });
            const data = await response.json();

            if (!response.ok || !data.transactionId) {
                throw new Error(data.error || "Unable to create checkout");
            }

            sessionStorage.setItem(PADDLE_TRANSACTION_STORAGE_KEY, data.transactionId);

            Paddle.Checkout.open({
                transactionId: data.transactionId,
                settings: {
                    successUrl: `${window.location.origin}/dashboard?paddle=success&transaction_id=${encodeURIComponent(data.transactionId)}`,
                },
            });
        } catch (error) {
            console.error("Paddle checkout error:", error);
            alert("Unable to start checkout. Please try again.");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="w-full max-w-4xl">
                <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
                        Activate <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Your AI</span>
                    </h2>
                    <p className="text-sm text-neutral-400 mt-3">Your AI is configured and ready. Choose a plan to bring it to life.</p>
                </div>

                <div className={`grid gap-6 ${allowTrial ? "md:grid-cols-3" : "md:grid-cols-2 max-w-3xl mx-auto"}`}>
                    {/* Free Trial */}
                    {allowTrial && (
                    <div className="relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
                        <div className="mb-5">
                            <h3 className="text-lg font-semibold text-white">Free Trial</h3>
                            <p className="text-xs text-neutral-500 mt-1">Test the waters</p>
                        </div>

                        <div className="mb-6">
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-4xl font-semibold text-white">$0</span>
                                <span className="text-sm text-neutral-500">/3 days</span>
                            </div>
                            <p className="text-[10px] text-neutral-600 mt-1">50 minutes included, no commitment</p>
                        </div>

                        <div className="space-y-2.5 mb-8 text-left inline-block">
                            {[
                                "AI answers calls 24/7",
                                "1 phone number",
                                "Basic call dashboard",
                                "Appointment booking + Google Calendar sync",
                                "50 minutes included",
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                    <span className="text-emerald-400 text-xs mt-0.5 flex-shrink-0">+</span>
                                    <span className="text-xs text-neutral-300">{item}</span>
                                </div>
                            ))}

                            {[
                                "No follow-up emails",
                                "No Zapier integrations",
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-2.5 opacity-50">
                                    <span className="text-neutral-500 text-xs mt-0.5 flex-shrink-0">−</span>
                                    <span className="text-xs text-neutral-500 line-through">{item}</span>
                                </div>
                            ))}
                        </div>

                        <div>
                            <button
                                onClick={() => handleCheckout("trial")}
                                disabled={loading !== null}
                                className="w-full bg-white/[0.05] border border-white/[0.1] text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-white/[0.1] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {loading === "trial" ? "Starting Trial..." : "Start 3-Day Trial"}
                            </button>
                        </div>
                    </div>
                    )}

                    {/* Standard Plan */}
                    <div className="relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
                        <div className="mb-5">
                            <h3 className="text-lg font-semibold text-white">Standard</h3>
                            <p className="text-xs text-neutral-500 mt-1">For small businesses</p>
                        </div>

                        <div className="mb-6">
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-4xl font-semibold text-white">$299</span>
                                <span className="text-sm text-neutral-500">/mo</span>
                            </div>
                            <p className="text-[10px] text-neutral-600 mt-1">200 minutes + $0.50/min overage</p>
                        </div>

                        <div className="space-y-2.5 mb-8 text-left inline-block">
                            {[
                                "Everything in Trial, plus:",
                                "Follow-up emails",
                                "Google Calendar sync",
                                "Appointment reminders",
                                "Custom greeting & tone",
                                "Emergency call routing",
                                "Email support",
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                    <span className={`${i === 0 ? "text-indigo-400" : "text-emerald-400"} text-xs mt-0.5 flex-shrink-0`}>+</span>
                                    <span className={`text-xs ${i === 0 ? "text-indigo-300 font-medium" : "text-neutral-300"}`}>{item}</span>
                                </div>
                            ))}
                        </div>

                        <div>
                            <button
                                onClick={() => handleCheckout("standard")}
                                disabled={loading !== null}
                                className="w-full bg-white/[0.05] border border-white/[0.1] text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-white/[0.1] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {loading === "standard" ? "Redirecting..." : "Get Standard"}
                            </button>
                        </div>
                    </div>

                    {/* Premium Plan */}
                    <div className="relative p-8 rounded-2xl bg-white/[0.03] border border-indigo-500/30 overflow-hidden text-center">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] pointer-events-none" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-center gap-3 mb-5">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Premium</h3>
                                    <p className="text-xs text-neutral-500 mt-1">For growing teams</p>
                                </div>
                                <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">Popular</span>
                            </div>

                            <div className="mb-6">
                                <div className="flex items-baseline justify-center gap-1">
                                    <span className="text-4xl font-semibold text-white">$399</span>
                                    <span className="text-sm text-neutral-500">/mo</span>
                                </div>
                                <p className="text-[10px] text-neutral-600 mt-1">500 minutes + $0.40/min overage</p>
                            </div>

                            <div className="space-y-2.5 mb-8 text-left inline-block">
                                {[
                                    "Everything in Standard, plus:",
                                    "3 phone numbers",
                                    "Priority call routing",
                                    "Advanced analytics",
                                    "Zapier / Webhooks",
                                    "Lead value tracking",
                                    "Priority support chat",
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-2.5">
                                        <span className={`${i === 0 ? "text-indigo-400" : "text-emerald-400"} text-xs mt-0.5 flex-shrink-0`}>+</span>
                                        <span className={`text-xs ${i === 0 ? "text-indigo-300 font-medium" : "text-neutral-300"}`}>{item}</span>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <button
                                    onClick={() => handleCheckout("premium")}
                                    disabled={loading !== null}
                                    className="w-full bg-white text-black text-sm font-medium px-6 py-3 rounded-full hover:bg-neutral-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    {loading === "premium" ? "Redirecting..." : "Get Premium →"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

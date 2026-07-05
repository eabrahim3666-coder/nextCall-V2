"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export default function Paywall() {
    const { user } = useUser();
    const [loading, setLoading] = useState<"trial" | "standard" | "premium" | null>(null);

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
        script.async = true;
        script.onload = () => {
            const Paddle = (window as any).Paddle;
            if (Paddle) {
                Paddle.Initialize({ token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN });
                console.log("Paddle initialized:", Paddle);
            }
        };
        document.body.appendChild(script);
    }, []);

    const handleCheckout = (plan: "trial" | "standard" | "premium") => {
        setLoading(plan);
        const Paddle = (window as any).Paddle;

        if (!Paddle) {
            alert("Payment system is still loading. Please wait a moment and try again.");
            setLoading(null);
            return;
        }

        const priceIdMap = {
            trial: process.env.NEXT_PUBLIC_PADDLE_TRIAL_PRICE_ID,
            standard: process.env.NEXT_PUBLIC_PADDLE_STANDARD_PRICE_ID,
            premium: process.env.NEXT_PUBLIC_PADDLE_PREMIUM_PRICE_ID
        };

        const priceId = priceIdMap[plan];

        if (!priceId) {
            alert("Pricing configuration missing. Check Vercel env vars.");
            setLoading(null);
            return;
        }

        Paddle.Checkout.open({
            items: [{ priceId: priceId, quantity: 1 }],
            customData: {
                clerk_user_id: user?.id,
                business_name: user?.firstName || "New Business",
                plan: plan
            },
            settings: {
                successUrl: `${window.location.origin}/dashboard?paddle=success`
            }
        });

        setLoading(null);
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

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Free Trial */}
                    <div className="relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl text-center">
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
                                "50 minutes included",
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                    <span className="text-emerald-400 text-xs mt-0.5 flex-shrink-0">+</span>
                                    <span className="text-xs text-neutral-300">{item}</span>
                                </div>
                            ))}

                            {[
                                "No follow-up emails",
                                "No Google Calendar sync",
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

                    {/* Standard Plan */}
                    <div className="relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl text-center">
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
                    <div className="relative p-8 rounded-2xl bg-white/[0.03] border border-indigo-500/30 backdrop-blur-xl overflow-hidden text-center">
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
"use client";

import { useState } from "react";

export default function SupportPage() {
    const [copied, setCopied] = useState("");

    const copyEmail = async (email: string) => {
        try {
            await navigator.clipboard.writeText(email);
            setCopied(email);
            setTimeout(() => setCopied(""), 2000);
        } catch { }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Support Center</h1>
                <p className="mt-1 text-sm text-neutral-400">Need help? We're here for you.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Card 1: Documentation */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
                    <h2 className="text-lg font-semibold text-white mb-2">Documentation</h2>
                    <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                        Before reaching out, check our comprehensive Setup Guide and Rules. Most common questions about AI training and testing are answered there.
                    </p>
                    <a href="/dashboard/docs" className="inline-block text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2">
                        View Documentation →
                    </a>
                </div>

                {/* Card 2: Email Support */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
                    <h2 className="text-lg font-semibold text-white mb-2">Email Support</h2>
                    <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                        For account issues, billing inquiries, or technical bugs, email our support team directly. We respond within 24 hours on business days.
                    </p>
                    <div className="flex items-center gap-3">
                        <a href="mailto:support@nextcall.com?subject=Support%20Request" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2">
                            support@nextcall.com
                        </a>
                        <button
                            type="button"
                            onClick={() => copyEmail("support@nextcall.com")}
                            className="text-[10px] text-neutral-500 hover:text-white transition-colors"
                        >
                            {copied === "support@nextcall.com" ? "Copied!" : "Copy"}
                        </button>
                    </div>
                </div>

                {/* Card 3: System Status */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
                    <h2 className="text-lg font-semibold text-white mb-2">System Status</h2>
                    <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                        If your AI status pill is red, or calls aren't connecting, check our real-time status page for any ongoing outages with Twilio, OpenAI, or our servers.
                    </p>
                    <span className="inline-block text-sm font-medium text-emerald-400">
                        ● All Systems Operational
                    </span>
                </div>

                {/* Card 4: Feature Requests */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
                    <h2 className="text-lg font-semibold text-white mb-2">Feature Requests</h2>
                    <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                        Want nextCall to do more? We build features based on user demand. Let us know what integrations or AI capabilities would help your business grow.
                    </p>
                    <div className="flex items-center gap-3">
                        <a href="mailto:feedback@nextcall.com?subject=Feature%20Request" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2">
                            Send Feedback →
                        </a>
                        <button
                            type="button"
                            onClick={() => copyEmail("feedback@nextcall.com")}
                            className="text-[10px] text-neutral-500 hover:text-white transition-colors"
                        >
                            {copied === "feedback@nextcall.com" ? "Copied!" : "Copy"}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
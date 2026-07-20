"use client";

import { useState } from "react";

export default function SupportPage() {
    const [copied, setCopied] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ title: "", description: "" });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formError, setFormError] = useState("");

    const copyEmail = async (email: string) => {
        try {
            await navigator.clipboard.writeText(email);
            setCopied(email);
            setTimeout(() => setCopied(""), 2000);
        } catch { }
    };

    const handleFeatureSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.description.trim()) {
            setFormError("Please fill in all fields");
            return;
        }
        setSubmitting(true);
        setFormError("");
        try {
            const res = await fetch("/api/feature-request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setSubmitted(true);
                setFormData({ title: "", description: "" });
                setTimeout(() => { setSubmitted(false); setShowForm(false); }, 3000);
            } else {
                const err = await res.json();
                setFormError(err.error || "Failed to submit");
            }
        } catch {
            setFormError("Network error");
        } finally {
            setSubmitting(false);
        }
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
                        <a href="mailto:support@getnextcall.com?subject=Support%20Request" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2">
                            support@getnextcall.com
                        </a>
                        <button
                            type="button"
                            onClick={() => copyEmail("support@getnextcall.com")}
                            className="text-[10px] text-neutral-500 hover:text-white transition-colors"
                        >
                            {copied === "support@getnextcall.com" ? "Copied!" : "Copy"}
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
                    {!showForm && !submitted && (
                        <>
                            <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                                Want nextCall to do more? We build features based on user demand. Let us know what integrations or AI capabilities would help your business grow.
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowForm(true)}
                                className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
                            >
                                Submit a Feature Request →
                            </button>
                        </>
                    )}
                    {submitted && (
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-sm font-medium text-emerald-400">Thanks for your feedback!</p>
                            <p className="text-xs text-neutral-400 mt-1">We review every request and prioritize based on demand.</p>
                        </div>
                    )}
                    {showForm && !submitted && (
                        <form onSubmit={handleFeatureSubmit} className="space-y-4">
                            <p className="text-xs text-neutral-400">Tell us what you'd like to see added to nextCall.</p>
                            <div>
                                <input
                                    type="text"
                                    placeholder="Feature title"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50"
                                />
                            </div>
                            <div>
                                <textarea
                                    rows={3}
                                    placeholder="Describe the feature and how it would help your business..."
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 resize-none"
                                />
                            </div>
                            {formError && <p className="text-xs text-rose-400">{formError}</p>}
                            <div className="flex items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-white text-black text-xs font-medium px-5 py-2 rounded-full hover:bg-neutral-200 transition-colors disabled:opacity-30"
                                >
                                    {submitting ? "Submitting..." : "Submit"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); setFormError(""); }}
                                    className="text-xs text-neutral-500 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>

            </div>
        </div>
    );
}
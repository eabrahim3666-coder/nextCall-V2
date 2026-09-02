"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, ExternalLink } from "lucide-react";
import SmsComplianceTab from "./SmsComplianceTab";

// US IANA timezones (the product's primary market) — used for calendar
// events and appointment reminder formatting.
const US_TIMEZONES = [
    { value: "America/New_York", label: "Eastern Time (New York, Miami, Atlanta)" },
    { value: "America/Chicago", label: "Central Time (Chicago, Dallas, Houston)" },
    { value: "America/Denver", label: "Mountain Time (Denver, Phoenix*, Salt Lake)" },
    { value: "America/Phoenix", label: "Arizona Time (no DST)" },
    { value: "America/Los_Angeles", label: "Pacific Time (LA, SF, Seattle)" },
    { value: "America/Anchorage", label: "Alaska Time" },
    { value: "Pacific/Honolulu", label: "Hawaii Time" },
] as const;

type RoutingRules = {
    forward_emergency: boolean;
    notify_hot_lead: boolean;
    sms_missed_call: boolean;
    email_followup: boolean;
    daily_summary: boolean;
    appointment_reminders: boolean;
    review_followup: boolean;
};

type FaqPair = { question: string; answer: string };

type BusinessData = {
    business_name: string;
    business_type: string;
    service_area: string;
    business_timezone: string;
    owner_phone: string;
    hours: string;
    services: string;
    exclusions: string;
    pricing_rules: string;
    notes: string;
    faq: FaqPair[];
    greeting_tone: string;
    greeting_text: string;
    ai_name: string;
    emergency_definition: string;
    routing_rules: RoutingRules;
    knowledge_base_text: string;
    // Referral fields

    referral_code: string;
    bonus_minutes: number;

    // Billing fields
    plan: string;
    minutes_limit: number;
    total_minutes_used: number;
    paddle_customer_id: string | null;
    avg_job_value: number;
    // Integrations
    google_refresh_token: string | null;
    google_account_email: string | null;
    zapier_webhook_url: string | null;
    review_link: string;
    meta_page_access_token: string | null;
    meta_page_id: string | null;
    meta_page_name: string | null;
    meta_page_picture: string | null;
    meta_ig_business_id: string | null;
    meta_ig_business_name: string | null;
};

const TABS = [
    { id: "business", label: "Business Info" },
    { id: "knowledge", label: "AI Knowledge" },
    { id: "greeting", label: "Greeting & Tone" },
    { id: "routing", label: "Call Routing" },
    { id: "billing", label: "Billing & Plan" },
    { id: "sms", label: "Business SMS" },
    { id: "referrals", label: "Referrals" },
    { id: "integrations", label: "Integrations" },
];

// ... (Keep all existing helper functions: generateGreeting, TONE_OPTIONS, etc. exactly as they were) ...

function generateGreeting(tone: string, businessName: string, aiName: string): string {
    const name = businessName || "your business";
    const ai = aiName || "Sam";
    switch (tone) {
        case "friendly": return `Hi there! Thanks for calling ${name}, this is ${ai}. How can I help you today?`;
        case "professional": return `Thank you for calling ${name}. This is ${ai}. How may I assist you?`;
        case "casual": return `Hey! You've reached ${name}, I'm ${ai}. What can I do for you?`;
        default: return `Hello, thanks for calling ${name}, this is ${ai}. How can I help?`;
    }
}

const TONE_OPTIONS = [
    { id: "friendly", label: "Friendly", desc: "Warm, casual, and approachable" },
    { id: "professional", label: "Professional", desc: "Polite, efficient, and formal" },
    { id: "casual", label: "Casual", desc: "Relaxed, laid-back, and conversational" },
];

export default function SettingsForm({ initialData }: { initialData: BusinessData; userId?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get("focus") || "business");
    const [data, setData] = useState<BusinessData>(initialData);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(searchParams.get("meta_error") || "");
    const [portalLoading, setPortalLoading] = useState(false);
    const [minutesLoading, setMinutesLoading] = useState(false);
    const [minutesToBuy, setMinutesToBuy] = useState(50);
    const [disconnecting, setDisconnecting] = useState("");
    const [copiedReferral, setCopiedReferral] = useState(false);
    const [needsReferralCode] = useState(
        data.referral_code === "N/A" && Boolean(data.paddle_customer_id)
    );
    const [referralCode, setReferralCode] = useState(
        needsReferralCode ? "N/A" : data.referral_code
    );
    const [generatingCode, setGeneratingCode] = useState(needsReferralCode);
    // Build the referral link AFTER mount so SSR and first client render
    // match (window.location.origin during render caused a hydration
    // mismatch on the readOnly input below).
    const [origin, setOrigin] = useState("");
    useEffect(() => { setOrigin(window.location.origin); }, []);
    const referralLink = origin ? `${origin}/?ref=${referralCode}` : '';

    const handleCopyReferral = () => {
        navigator.clipboard.writeText(referralLink);
        setCopiedReferral(true);
        setTimeout(() => setCopiedReferral(false), 2000);
    };

    useEffect(() => {
        if (!needsReferralCode) return;
        let cancelled = false;
        fetch("/api/business/referral-code", { method: "POST" })
            .then(res => res.json())
            .then(json => { if (!cancelled) setReferralCode(json.referral_code || "N/A"); })
            .catch(() => { if (!cancelled) setReferralCode("N/A"); })
            .finally(() => { if (!cancelled) setGeneratingCode(false); });
        return () => { cancelled = true; };
    }, [needsReferralCode]);

    const metaSuccess = searchParams.get("meta_success") === "true";
    const googleConnected = searchParams.get("connected") === "1";
    const googleFailed = searchParams.get("connected") === "0";
    const [googleDisconnected, setGoogleDisconnected] = useState(false);

    const plan = String(data.plan || "standard").toLowerCase();
    const isTrial = plan === "trial";
    const isPremium = plan === "premium";
    const hiddenTabs = isTrial ? ["knowledge", "greeting"] : [];
    const currentTab = hiddenTabs.includes(activeTab) ? "business" : activeTab;

    useEffect(() => {
        const focus = searchParams.get("focus");
        if (focus && TABS.some((t) => t.id === focus) && !hiddenTabs.includes(focus)) {
            setActiveTab(focus);
        }
    }, [searchParams]);

    useEffect(() => {
        if (searchParams.get("meta_error") || searchParams.get("meta_success") || searchParams.get("connected")) {
            const url = new URL(window.location.href);
            url.searchParams.delete("meta_error");
            url.searchParams.delete("meta_success");
            url.searchParams.delete("connected");
            url.searchParams.delete("focus");
            window.history.replaceState({}, "", url.toString());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateField = (key: string, value: string | number | boolean) => {
        setData((prev) => ({ ...prev, [key]: value }));
        setError("");
    };

    const updateRouting = (key: keyof RoutingRules, value: boolean) => {
        setData((prev) => ({
            ...prev,
            routing_rules: { ...prev.routing_rules, [key]: value },
        }));
    };

    const addFaq = () => {
        setData((prev) => ({
            ...prev,
            faq: [...prev.faq, { question: "", answer: "" }],
        }));
    };

    const removeFaq = (index: number) => {
        setData((prev) => ({
            ...prev,
            faq: prev.faq.filter((_, i) => i !== index),
        }));
    };

    const updateFaq = (index: number, field: "question" | "answer", value: string) => {
        setData((prev) => ({
            ...prev,
            faq: prev.faq.map((pair, i) => (i === index ? { ...pair, [field]: value } : pair)),
        }));
    };

    const handleToneChange = (tone: string) => {
        const newGreeting = generateGreeting(tone, data.business_name, data.ai_name);
        setData((prev) => ({
            ...prev,
            greeting_tone: tone,
            greeting_text: newGreeting,
        }));
    };

    const compileKnowledgeBase = (): string => {
        let text = "";
        if (data.business_name) text += `Business Name: ${data.business_name}\n`;
        if (data.business_type) text += `Business Type: ${data.business_type}\n`;
        if (data.service_area) text += `Service Area: ${data.service_area}\n`;
        if (data.hours) text += `\nBUSINESS HOURS:\n${data.hours}\n`;
        if (data.services) text += `\nSERVICES WE OFFER:\n${data.services}\n`;
        if (data.exclusions) text += `\nWE DO NOT:\n${data.exclusions}\n`;
        if (data.pricing_rules) text += `\nPRICING RULES:\n${data.pricing_rules}\n`;

        if (data.faq.length > 0 && data.faq.some((f) => f.question && f.answer)) {
            text += `\nFREQUENTLY ASKED QUESTIONS:\n`;
            data.faq.forEach((f) => {
                if (f.question && f.answer) {
                    text += `Q: ${f.question}\nA: ${f.answer}\n\n`;
                }
            });
        }

        if (data.notes) text += `\nSPECIAL INSTRUCTIONS:\n${data.notes}\n`;
        if (data.greeting_tone) text += `\nTONE: ${data.greeting_tone}\n`;
        if (data.ai_name) text += `AI NAME: ${data.ai_name}\n`;
        if (data.greeting_text) text += `GREETING: ${data.greeting_text}\n`;

        return text.trim();
    };

    const handleBillingPortal = async () => {
        setPortalLoading(true);
        try {
            const res = await fetch("/api/billing/portal", { method: "POST" });
            const data = await res.json();
            if (data.url) {
                window.open(data.url, "_blank");
            } else {
                alert("Failed to load billing portal. Please try again.");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred.");
        } finally {
            setPortalLoading(false);
        }
    };

    const handleBuyMinutes = async () => {
        setMinutesLoading(true);
        try {
            const res = await fetch("/api/checkout/paddle-minutes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ minutes: minutesToBuy }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Unable to create checkout");
                return;
            }
            const Paddle = (window as unknown as { Paddle?: { Checkout: { open: (config: Record<string, unknown>) => void } } }).Paddle;
            if (Paddle) {
                Paddle.Checkout.open({
                    transactionId: data.transactionId,
                    settings: { successUrl: `${window.location.origin}/dashboard/settings?focus=billing` },
                });
            } else {
                alert("Payment system loading. Try again.");
            }
        } catch {
            alert("Failed to start checkout.");
        } finally {
            setMinutesLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const compiledKnowledge = compileKnowledgeBase();

            const res = await fetch("/api/business/update-settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    knowledge_base_text: compiledKnowledge,
                }),
            });

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    router.push("/dashboard");
                }, 2000);
            } else {
                const errData = await res.json();
                setError(errData.error || "Failed to save");
            }
        } catch {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <span className="text-5xl">✓</span>
                <h2 className="text-2xl font-semibold text-white">Settings Saved!</h2>
                <p className="text-sm text-[#A7ADBB]">Your AI has been updated. Redirecting...</p>
            </div>
        );
    }

    const metaErrorBanner = searchParams.get("meta_error") ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">
            Meta connection failed: {decodeURIComponent(searchParams.get("meta_error")!)}
        </div>
    ) : null;

    const metaSuccessBanner = metaSuccess ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">
            Facebook & Instagram connected successfully!
        </div>
    ) : null;

    const googleConnectedBanner = googleConnected ? (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="mt-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </span>
            <div>
                <p className="text-sm font-medium text-emerald-300">Google Account connected successfully!</p>
                <p className="text-xs text-emerald-400/70 mt-0.5">Appointments booked by your AI will now appear in your Google Calendar.</p>
            </div>
        </div>
    ) : null;

    const googleFailedBanner = googleFailed ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">
            Google connection failed. Please try again.
        </div>
    ) : null;

    const googleDisconnectedBanner = googleDisconnected ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
            Google account disconnected. Appointments will no longer sync to Google Calendar.
        </div>
    ) : null;

    const inputClass = "w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all";
    const labelClass = "block text-[10px] uppercase tracking-wider text-[#A7ADBB] mb-1.5";

    // Calculate minute usage for billing tab
    const minutesUsed = data.total_minutes_used || 0;
    const minutesLimit = data.minutes_limit || 200;
    const minutesPercent = Math.min(100, Math.round((minutesUsed / minutesLimit) * 100));

    return (
        <div className="space-y-6">
            {metaErrorBanner}
            {metaSuccessBanner}
            {googleConnectedBanner}
            {googleFailedBanner}
            {googleDisconnectedBanner}
            {isTrial && (
                <div className="p-4 rounded-xl bg-[#ff4b00]/5 border border-[#ff4b00]/20 text-xs text-neutral-300 leading-relaxed">
                    You&apos;re on the <span className="font-medium text-[#ff4b00]">Free Trial</span> — only trial features are shown.
                    Upgrade to <span className="font-medium text-white">Standard</span> to unlock AI knowledge base, follow-up emails, daily summaries and more.{" "}
                    <a href="/dashboard" className="text-[#ff4b00] font-medium hover:text-[#ff4b00]">Choose a plan →</a>
                </div>
            )}
            {/* Tab bar — hidden, now handled by left sidebar dropdown */}
            <div className="hidden">
                {TABS.filter((tab) => !hiddenTabs.includes(tab.id)).map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap px-3 ${currentTab === tab.id ? "bg-white/[0.08] text-white" : "text-[#A7ADBB] hover:text-neutral-300"}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {currentTab === "sms" ? (
                <SmsComplianceTab />
            ) : (
            <form onSubmit={handleSubmit} className="space-y-6">

            {/* TAB 1: Business Info */}
            {currentTab === "business" && (
                // ... EXACTLY THE SAME AS YOUR CURRENT CODE ...
                <div className="space-y-6">
                    <div className="bg-black border border-white/5 rounded-2xl p-8">
                        <h2 className="text-lg font-semibold text-white mb-1">Business Identity</h2>
                        <p className="text-xs text-[#A7ADBB] mb-6">How the AI introduces your business.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div><label className={labelClass}>Business Name</label><input type="text" value={data.business_name} onChange={(e) => updateField("business_name", e.target.value)} placeholder="e.g. Mike's Plumbing" className={inputClass} /></div>
                            <div><label className={labelClass}>Business Type</label><input type="text" value={data.business_type} onChange={(e) => updateField("business_type", e.target.value)} placeholder="e.g. Plumbing, Dental, HVAC" className={inputClass} /></div>
                            <div><label className={labelClass}>Service Area</label><input type="text" value={data.service_area} onChange={(e) => updateField("service_area", e.target.value)} placeholder="e.g. Dallas, TX — 20 mile radius" className={inputClass} /></div>
                            <div>
                                <label className={labelClass}>Timezone</label>
                                <select
                                    value={data.business_timezone || "America/New_York"}
                                    onChange={(e) => updateField("business_timezone", e.target.value)}
                                    className={inputClass}
                                >
                                    {US_TIMEZONES.map((tz) => (
                                        <option key={tz.value} value={tz.value} className="bg-black text-white">{tz.label}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-neutral-600 mt-1">Used for calendar events and appointment reminders</p>
                            </div>
                            <div><label className={labelClass}>Owner Phone (Emergencies)</label><input type="tel" value={data.owner_phone} onChange={(e) => updateField("owner_phone", e.target.value)} placeholder="+1 555 123 4567" className={inputClass} /></div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: AI Knowledge */}
            {currentTab === "knowledge" && (
                // ... EXACTLY THE SAME AS YOUR CURRENT CODE ...
                <div className="space-y-5">
                    <div className="bg-black border border-white/5 rounded-2xl p-8">
                        <h2 className="text-lg font-semibold text-white mb-1">AI Knowledge Base</h2>
                        <p className="text-xs text-[#A7ADBB] mb-6">Teach your AI what it needs to know. Fill out each section and it compiles automatically.</p>
                        <div className="space-y-6">
                            <div><label className={labelClass}>Business Hours</label><input type="text" value={data.hours} onChange={(e) => updateField("hours", e.target.value)} placeholder="e.g. Mon-Fri 8am-6pm, Sat 9am-2pm, Closed Sunday" className={inputClass} /><p className="text-[10px] text-neutral-600 mt-1">Be specific about after-hours handling</p></div>
                            <div><label className={labelClass}>Services You Offer</label><textarea value={data.services} onChange={(e) => updateField("services", e.target.value)} rows={4} placeholder="List each service on a new line. e.g.&#10;Emergency leak repair — we can dispatch within 2 hours&#10;Water heater installation — need make/model for estimate&#10;Drain cleaning — standard and hydro-jetting available" className={`${inputClass} resize-none`} /></div>
                            <div><label className={labelClass}>What You DO NOT Do</label><textarea value={data.exclusions} onChange={(e) => updateField("exclusions", e.target.value)} rows={3} placeholder="e.g.&#10;We do NOT work on gas lines&#10;We do NOT repair hot tubs&#10;We do NOT offer financing" className={`${inputClass} resize-none`} /><p className="text-[10px] text-neutral-600 mt-1">AI will politely decline these and redirect</p></div>
                            <div><label className={labelClass}>Pricing & Quoting Rules</label><textarea value={data.pricing_rules} onChange={(e) => updateField("pricing_rules", e.target.value)} rows={3} placeholder="e.g.&#10;$89 diagnostic fee, waived if you proceed with repair&#10;Do NOT give exact quotes for large jobs over the phone&#10;Seniors get 10% off — mention automatically" className={`${inputClass} resize-none`} /></div>
                            <div>
                                <div className="flex items-center justify-between mb-3"><label className={labelClass}>Frequently Asked Questions</label><button type="button" onClick={addFaq} className="text-xs text-[#ff4b00] hover:text-[#ff4b00] transition-colors">+ Add Question</button></div>
                                {data.faq.length === 0 && (<div className="p-4 border border-dashed border-white/5 rounded-xl text-center"><p className="text-xs text-neutral-600">No FAQ added yet. Click "+ Add Question" to start.</p></div>)}
                                <div className="space-y-3">
                                    {data.faq.map((pair, i) => (
                                        <div key={i} className="p-4 rounded-xl bg-black border border-white/5 space-y-3">
                                            <div className="flex items-center justify-between"><span className="text-[10px] text-[#A7ADBB] uppercase tracking-wider">Q&A #{i + 1}</span><button type="button" onClick={() => removeFaq(i)} className="text-xs text-rose-400 hover:text-rose-300 transition-colors">Remove</button></div>
                                            <input type="text" value={pair.question} onChange={(e) => updateFaq(i, "question", e.target.value)} placeholder="Question: e.g. Do you offer free estimates?" className={inputClass} />
                                            <input type="text" value={pair.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)} placeholder="Answer: e.g. Yes! We offer free estimates for all standard services." className={inputClass} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div><label className={labelClass}>Special Instructions</label><textarea value={data.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} placeholder="Anything else the AI should know? e.g.&#10;Always offer free estimates&#10;If caller mentions competitor, mention our 5-year warranty&#10;Collect callback number for every caller" className={`${inputClass} resize-none`} /></div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: Greeting & Tone */}
            {currentTab === "greeting" && (
                // ... EXACTLY THE SAME AS YOUR CURRENT CODE ...
                <div className="space-y-5">
                    <div className="bg-black border border-white/5 rounded-2xl p-8">
                        <h2 className="text-lg font-semibold text-white mb-1">Greeting & Tone</h2>
                        <p className="text-xs text-[#A7ADBB] mb-6">Control how your AI sounds when it picks up the phone.</p>
                        <div className="mb-6"><label className={labelClass}>AI Name</label><input type="text" value={data.ai_name} onChange={(e) => { updateField("ai_name", e.target.value); if (data.greeting_tone) { const newGreeting = generateGreeting(data.greeting_tone, data.business_name, e.target.value); updateField("greeting_text", newGreeting); } }} placeholder="e.g. Sam, Alex, Jamie" className={inputClass} /><p className="text-[10px] text-neutral-600 mt-1">The name your AI uses to introduce itself</p></div>
                        <div className="mb-6">
                            <label className={labelClass}>Conversation Tone</label>
                            <div className="grid grid-cols-3 gap-3">
                                {TONE_OPTIONS.map((tone) => (
                                    <button key={tone.id} type="button" onClick={() => handleToneChange(tone.id)} className={`p-4 rounded-xl border text-left transition-all ${data.greeting_tone === tone.id ? "bg-[#ff4b00]/20 border-indigo-500/40" : "bg-black border-white/5 hover:border-white/20"}`}>
                                        <span className={`text-sm font-medium ${data.greeting_tone === tone.id ? "text-[#ff4b00]" : "text-[#A7ADBB]"}`}>{tone.label}</span>
                                        <p className="text-[10px] text-[#A7ADBB] mt-1">{tone.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div><label className={labelClass}>Custom Greeting</label><textarea value={data.greeting_text} onChange={(e) => updateField("greeting_text", e.target.value)} rows={3} placeholder="Your AI will say this when it picks up the phone..." className={`${inputClass} resize-none`} /><p className="text-[10px] text-neutral-600 mt-1">Auto-generated based on your tone. Edit to customize.</p></div>
                        {data.greeting_text && (<div className="mt-5 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20"><p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2">Preview</p><p className="text-sm text-neutral-300 italic">&ldquo;{data.greeting_text}&rdquo;</p></div>)}
                    </div>
                </div>
            )}

            {/* TAB 4: Call Routing */}
            {currentTab === "routing" && (
                // ... EXACTLY THE SAME AS YOUR CURRENT CODE ...
                <div className="space-y-5">
                    <div className="bg-black border border-white/5 rounded-2xl p-8">
                        <h2 className="text-lg font-semibold text-white mb-1">Call Routing Rules</h2>
                        <p className="text-xs text-[#A7ADBB] mb-6">Control what happens after each call. Toggle rules on/off.</p>

                        {/* Emergency Definition Input */}
                        <div className="mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                            <label className="block text-[10px] uppercase tracking-wider text-amber-400 mb-1.5">What defines an emergency for your business?</label>
                            <input
                                type="text"
                                value={data.emergency_definition}
                                onChange={(e) => updateField("emergency_definition", e.target.value)}
                                placeholder="e.g. Burst pipes, gas leaks, sewage backup, or severe flooding"
                                className="w-full bg-black border border-white/5 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/50 transition-all"
                            />
                            <p className="text-[10px] text-[#A7ADBB] mt-1.5">If a caller mentions these keywords, the AI will instantly transfer the call to your phone.</p>
                        </div>
                        <p className="text-xs text-[#A7ADBB] mb-6">Control what happens after each call. Toggle rules on/off.</p>
                        <div className="space-y-4">
                            {[{ key: "forward_emergency" as keyof RoutingRules, title: "Forward emergency calls to my cell", desc: "When caller says words like 'emergency', 'burst pipe', 'flooding' — AI forwards to your phone", paidOnly: false, premiumOnly: false }, { key: "notify_hot_lead" as keyof RoutingRules, title: "Notify me about hot leads", desc: "Get an in-app notification when AI detects a high-intent lead ready to buy", paidOnly: true, premiumOnly: true }, { key: "sms_missed_call" as keyof RoutingRules, title: "SMS customer if we miss their call", desc: "Auto-send: 'Sorry we missed you! Call us back or reply here.' — Costs ~$0.008 per SMS", paidOnly: true, premiumOnly: true }, { key: "email_followup" as keyof RoutingRules, title: "Send follow-up email after every call", desc: "Customer gets a branded confirmation email with their request details", paidOnly: true, premiumOnly: false }, { key: "daily_summary" as keyof RoutingRules, title: "Daily summary email", desc: "Every morning you get an email with: calls, leads, appointments, and revenue captured", paidOnly: true, premiumOnly: false }, { key: "appointment_reminders" as keyof RoutingRules, title: "Appointment reminders", desc: isTrial ? "Email reminder 24 hours before the appointment" : "SMS 1 hour before + email 24 hours before the appointment", paidOnly: false, premiumOnly: false }, { key: "review_followup" as keyof RoutingRules, title: "Auto review follow-up", desc: "If you forget to mark a job done, we ask the customer for a review 24 hours after their appointment", paidOnly: false, premiumOnly: false }].filter(rule => (!rule.paidOnly || !isTrial) && (!rule.premiumOnly || isPremium)).map((rule) => (
                                <div key={rule.key} className="flex items-start justify-between gap-4 p-4 rounded-xl bg-black border border-white/[0.04]">
                                    <div className="flex-1"><p className="text-sm font-medium text-white">{rule.title}</p><p className="text-xs text-[#A7ADBB] mt-1 leading-relaxed">{rule.desc}</p></div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={data.routing_rules[rule.key]}
                                        onClick={() => updateRouting(rule.key, !data.routing_rules[rule.key])}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full p-[2px] transition-all duration-200 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4b00]/40 ${data.routing_rules[rule.key] ? "bg-[#ff4b00] shadow-[0_0_12px_rgba(255,75,0,0.35)]" : "bg-white/10 border border-white/10"}`}
                                    >
                                        <span
                                            className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${data.routing_rules[rule.key] ? "translate-x-5" : "translate-x-0"}`}
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: Billing & Plan */}
            {currentTab === "billing" && (
                <div className="space-y-5">
                    <div className="bg-black border border-white/5 rounded-2xl p-8">
                        <h2 className="text-lg font-semibold text-white mb-1">Plan & Billing</h2>
                        <p className="text-xs text-[#A7ADBB] mb-6">Manage your subscription, minutes, and invoices.</p>

                        {/* Current Plan Card */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-xl bg-[#ff4b00]/10 border border-[#ff4b00]/20 mb-6">
                            <div>
                                <p className="text-xs font-semibold text-[#ff4b00] uppercase tracking-wider">Current Plan</p>
                                <p className="text-xl font-bold text-white capitalize mt-1">{data.plan} Plan</p>
                            </div>
                            {data.paddle_customer_id && (
                                <button
                                    type="button"
                                    onClick={handleBillingPortal}
                                    disabled={portalLoading}
                                    className="flex items-center gap-2 bg-white text-black text-sm font-medium px-6 py-2.5 rounded-full hover:bg-neutral-200 transition-colors disabled:opacity-30"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    {portalLoading ? "Loading..." : "Manage Billing & Invoices"}
                                    <ExternalLink className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Minute Usage */}
                        <div className="mb-6">
                            <div className="flex justify-between items-end mb-2">
                                <p className="text-sm font-semibold text-white">Minute Usage</p>
                                <p className="text-xs text-[#A7ADBB]">{minutesUsed} / {minutesLimit} min used</p>
                            </div>
                            <div className="w-full bg-black rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full transition-all duration-500 ${minutesPercent > 80 ? 'bg-red-500' : minutesPercent > 50 ? 'bg-amber-500' : 'bg-[#ff4b00]'}`}
                                    style={{ width: `${minutesPercent}%` }}
                                />
                            </div>
                            {minutesPercent > 80 && (
                                <p className="mt-2 text-xs text-amber-400">You're approaching your limit. Consider upgrading your plan to avoid overages.</p>
                            )}
                        </div>

                        {/* Buy Additional Minutes */}
                        {!isTrial && (
                        <div className="mb-6 p-5 rounded-xl bg-black border border-[#ff4b00]/20">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-semibold text-white">Buy Additional Minutes</p>
                                <span className="text-[10px] text-[#ff4b00] bg-[#ff4b00]/10 px-2 py-0.5 rounded-full">{data.plan === "premium" ? "$0.30/min" : "$0.40/min"}</span>
                            </div>
                            <p className="text-xs text-[#A7ADBB] mb-4">Add minutes to your plan. Save vs overage rates — minimum 50, up to your plan limit.</p>
                            <div className="flex items-center gap-3">
                                <select
                                    value={minutesToBuy}
                                    onChange={(e) => setMinutesToBuy(Number(e.target.value))}
                                    className="bg-black border border-white/5 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                >
                                    {Array.from(
                                        { length: (data.plan === "premium" ? 500 : 200) / 50 },
                                        (_, i) => (i + 1) * 50
                                    ).map(n => (
                                        <option key={n} value={n} className="bg-[#0a0a0a]">{n} min — ${(data.plan === "premium" ? n * 0.3 : n * 0.4).toFixed(0)}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={handleBuyMinutes}
                                    disabled={minutesLoading || !data.paddle_customer_id}
                                    className="bg-[#ff4b00] text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-indigo-600 transition-colors disabled:opacity-30"
                                >
                                    {minutesLoading ? "Opening..." : "Purchase"}
                                </button>
                            </div>
                            {!data.paddle_customer_id && (
                                <p className="mt-2 text-[10px] text-amber-400">Subscribe to a plan first to purchase additional minutes.</p>
                            )}
                        </div>
                        )}

                        {/* Average Job Value — feeds PremiumAnalytics revenue calculation */}
                        {isPremium && (
                        <div className="mb-6 p-5 rounded-xl bg-black border border-white/5">
                            <label className="block text-[10px] uppercase tracking-wider text-[#A7ADBB] mb-1.5">Average Job Value ($)</label>
                            <input
                                type="number"
                                min={0}
                                value={data.avg_job_value || ""}
                                onChange={(e) => updateField("avg_job_value", Number(e.target.value))}
                                placeholder="e.g. 350"
                                className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                            />
                            <p className="text-[10px] text-neutral-600 mt-1.5">Used to calculate estimated revenue in your analytics dashboard. Enter your typical job or service value.</p>
                        </div>
                        )}

                        {/* Invoices Notice */}
                        <div className="p-4 rounded-xl bg-black border border-white/5">
                            <p className="text-xs text-[#A7ADBB] leading-relaxed">
                                <span className="font-semibold text-neutral-300">Need a receipt?</span> Click "Manage Billing & Invoices" above to access the secure Paddle customer portal — update your card, download invoices, or cancel your subscription.
                            </p>
                        </div>

                        {!data.paddle_customer_id && (
                            <div className="mt-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                <p className="text-xs text-amber-400">No active billing account found. If you believe this is an error, please contact support.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 6: Referrals */}
            {currentTab === "referrals" && (
                <div className="space-y-5">
                    <div className="bg-black border border-white/5 rounded-2xl p-8">
                        <h2 className="text-lg font-semibold text-white mb-1">Refer a Business, Earn 50 Minutes</h2>
                        <p className="text-xs text-[#A7ADBB] mb-6">Share your unique link with other businesses. When they subscribe, you earn bonus minutes — no limits per referrer.</p>

                        {data.bonus_minutes > 0 && (
                            <div className="mb-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                                <span className="text-sm font-medium text-emerald-400">You currently have {data.bonus_minutes} bonus minutes earned from referrals!</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            {generatingCode ? (
                                <div className="p-4 rounded-xl bg-black border border-white/5">
                                    <p className="text-xs text-[#A7ADBB]">Generating your unique referral link...</p>
                                </div>
                            ) : referralCode === "N/A" ? (
                                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                    <p className="text-xs text-amber-400">Subscribe to a plan first to get your referral link.</p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-wider text-[#A7ADBB] mb-1.5">Your Unique Referral Link</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={referralLink}
                                                className="flex-1 bg-black border border-white/5 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCopyReferral}
                                                className="bg-white text-black text-sm font-medium px-6 py-3 rounded-xl hover:bg-neutral-200 transition-colors flex-shink-0"
                                            >
                                                {copiedReferral ? "Copied!" : "Copy"}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="p-4 rounded-xl bg-black border border-white/5">
                                <p className="text-xs text-[#A7ADBB] leading-relaxed">
                                    <span className="font-semibold text-neutral-300">How it works:</span>
                                    <br />1. Share your link with a business owner.
                                    <br />2. They click it and sign up for a free trial.
                                    <br />3. If they subscribe to <strong className="text-white">Standard</strong> — you get <strong className="text-emerald-400">+40 minutes</strong>.
                                    <br />4. If they subscribe to <strong className="text-white">Premium</strong> — you get <strong className="text-emerald-400">+70 minutes</strong>.
                                    <br />5. Free trials do not earn any bonus. No limits per referrer!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* TAB 7: Integrations */}
            {currentTab === "integrations" && (
                <div className="space-y-5">
                    <div className="bg-black border border-white/5 rounded-2xl p-8">
                        <h2 className="text-lg font-semibold text-white mb-1">Integrations</h2>
                        <p className="text-xs text-[#A7ADBB] mb-6">Connect your favorite tools to automate your workflow.</p>

                        <div className="space-y-4">
                            {/* Unified Google Account Card — all plans (calendar sync needed for AI booking) */}
                            <div className="p-5 rounded-xl bg-black border border-white/5 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                        <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M18.316 5.684L24 2.763v4.481l-5.684 2.921V5.684zM0 2.763l5.684 2.921v4.481L0 7.244V2.763zm6.316 0l5.684 2.921v4.481L6.316 7.244V2.763zm12.632 0l-5.684 2.921v4.481l5.684-2.921V2.763zM12 8.763l5.684 2.921v4.481L12 13.244V8.763zm-6.316 0L12 11.684v4.481L5.684 13.244V8.763zM0 8.763l5.684 2.921v4.481L0 13.244V8.763zm18.316 0L24 11.684v4.481l-5.684-2.921V8.763zM0 14.763l5.684 2.921V22.2L0 19.279v-4.516zm6.316 0L12 17.684V22.2l-5.684-2.921v-4.516zm12.632 0L24 17.684V22.2l-5.684-2.921v-4.516zm-6.316 0L12 17.684V22.2l5.684-2.921v-4.516z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Google Account</p>
                                        <p className="text-xs text-[#A7ADBB] mt-0.5">Connect your account to enable AI Appointment Booking (Calendar) and Google Reviews Auto-Reply.</p>
                                    </div>
                                </div>

                                {data.google_refresh_token ? (
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                            <span className="text-xs font-medium text-emerald-400">Connected</span>
                                        </div>
                                        {data.google_account_email && (
                                            <span className="text-[10px] text-[#A7ADBB]">{data.google_account_email}</span>
                                        )}
                                        <button
                                            type="button"
                                            disabled={disconnecting === "google"}
                                            onClick={async () => {
                                                setDisconnecting("google");
                                                try {
                                                    const res = await fetch('/api/integrations/google-calendar/disconnect', { method: 'POST' });
                                                    if (res.ok) {
                                                        setData(prev => ({
                                                            ...prev,
                                                            google_refresh_token: null,
                                                            google_account_email: null,
                                                            review_link: "",
                                                        }));
                                                        setGoogleDisconnected(true);
                                                    }
                                                } catch { } finally {
                                                    setDisconnecting("");
                                                }
                                            }}
                                            className="text-[10px] text-rose-400/60 hover:text-rose-400 transition-colors"
                                        >
                                            {disconnecting === "google" ? "Disconnecting..." : "Disconnect"}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => window.location.href = '/api/integrations/google-calendar/auth'}
                                        className="bg-white text-black text-xs font-medium px-5 py-2.5 rounded-full hover:bg-neutral-200 transition-colors"
                                    >
                                        Connect Google Account
                                    </button>
                                )}

                                </div>
                                {data.google_refresh_token && (
                                    <div className="w-full pt-4 border-t border-white/5">
                                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">Google Review Link</label>
                                        <input
                                            type="url"
                                            value={data.review_link}
                                            onChange={(e) => setData({ ...data, review_link: e.target.value })}
                                            placeholder="https://g.page/r/xxxx/review"
                                            className="w-full bg-black border border-white/5 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#ff4b00]/50 transition-all"
                                        />
                                        <p className="text-[10px] text-[#A7ADBB] mt-1.5 leading-relaxed">
                                            Used in your review-request emails & SMS. Get it from Google Business Profile → Profile → "Share review form".
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Zapier / Webhooks Card — Premium only */}
                            {isPremium && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-xl bg-black border border-white/5 gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                        <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Webhooks (Zapier / Make / n8n)</p>
                                        <p className="text-xs text-[#A7ADBB]">Send call data to 5,000+ apps. Premium only.</p>
                                    </div>
                                </div>

                                <div className="flex-1 sm:max-w-xs">
                                    <input
                                        type="url"
                                        value={data.zapier_webhook_url || ''}
                                        onChange={(e) => updateField("zapier_webhook_url", e.target.value)}
                                        placeholder="https://hooks.zapier.com/..."
                                        className="w-full bg-black border border-white/5 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500/50"
                                    />
                                </div>
                            </div>
                            )}

                            {/* Social Channels Card — Premium only */}
                            {isPremium && (
                            <div className="flex items-center justify-between p-5 rounded-xl bg-black border border-white/5 gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                        <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0022 12.06C22 6.53 17.5 2.04 12 2.04Z" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Facebook & Instagram</p>
                                        <p className="text-xs text-[#A7ADBB]">Auto-reply to DMs and Messages</p>
                                    </div>
                                </div>

                                {data.meta_page_access_token ? (
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-white">{data.meta_page_name || 'Connected'}</p>
                                                {data.meta_ig_business_name && (
                                                    <p className="text-[10px] text-[#A7ADBB]">IG: {data.meta_ig_business_name}</p>
                                                )}
                                            </div>
                                            {data.meta_page_picture && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={data.meta_page_picture} alt="" className="w-8 h-8 rounded-full object-cover border border-white/5" />
                                            )}
                                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                                <span className="text-xs font-medium text-emerald-400">Connected</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={disconnecting === "meta"}
                                            onClick={async () => {
                                                setDisconnecting("meta");
                                                try {
                                                    const res = await fetch('/api/integrations/meta/disconnect', { method: 'POST' });
                                                    if (res.ok) {
                                                        setData(prev => ({
                                                            ...prev,
                                                            meta_page_access_token: null,
                                                            meta_page_id: null,
                                                            meta_page_name: null,
                                                            meta_page_picture: null,
                                                            meta_ig_business_id: null,
                                                            meta_ig_business_name: null,
                                                        }));
                                                    }
                                                } catch { } finally {
                                                    setDisconnecting("");
                                                }
                                            }}
                                            className="text-[10px] text-rose-400/60 hover:text-rose-400 transition-colors"
                                        >
                                            {disconnecting === "meta" ? "Disconnecting..." : "Disconnect"}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => window.location.href = '/api/integrations/meta/auth'}
                                        className="bg-white text-black text-xs font-medium px-5 py-2.5 rounded-full hover:bg-neutral-200 transition-colors"
                                    >
                                        Connect
                                    </button>
                                )}
                            </div>
                            )}

                        </div>
                    </div>
                </div>
            )}




            {/* Error */}
            {error && <p className="text-xs text-rose-400">{error}</p>}




            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="text-sm text-[#A7ADBB] hover:text-white transition-colors px-6 py-3"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-white text-black text-sm font-medium px-8 py-3 rounded-full hover:bg-neutral-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    {loading ? "Saving..." : "Save Settings"}
                </button>
            </div>
        </form>
            )}
        </div>
    );
}
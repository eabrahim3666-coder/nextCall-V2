"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, MessageSquareText, Loader2, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";

type ComplianceView = {
    status: "none" | "pending" | "approved" | "rejected" | "error";
    twilio_status: string | null;
    tollfree_number: string | null;
    rejection_reasons: string[];
    rejection_reason: string | null;
    edit_allowed: boolean | null;
    edit_expiration: string | null;
    submitted_at: string | null;
    submission_count: number;
};

type Prefill = {
    businessName: string;
    businessType: string;
    doingBusinessAs: string;
    serviceArea: string;
    ownerPhone: string;
    notificationEmail: string;
    contactEmail: string;
    contactFirstName: string;
    contactLastName: string;
    country: string;
    tollfreeNumber: string | null;
    suggestedUseCaseSummary: string;
    suggestedSampleMessage: string;
};

type FormState = {
    businessName: string;
    doingBusinessAs: string;
    businessWebsite: string;
    businessType: string;
    registrationNumber: string;
    registrationAuthority: string;
    registrationCountry: string;
    streetAddress: string;
    city: string;
    stateProvinceRegion: string;
    postalCode: string;
    country: string;
    contactFirstName: string;
    contactLastName: string;
    contactEmail: string;
    contactPhone: string;
    notificationEmail: string;
    useCaseCategories: string[];
    useCaseSummary: string;
    productionMessageSample: string;
    optInType: string;
    optInImageUrls: string;
    messageVolume: string;
    privacyPolicyUrl: string;
    termsAndConditionsUrl: string;
    additionalInformation: string;
    editReason: string;
};

const emptyForm: FormState = {
    businessName: "", doingBusinessAs: "", businessWebsite: "", businessType: "",
    registrationNumber: "", registrationAuthority: "", registrationCountry: "",
    streetAddress: "", city: "", stateProvinceRegion: "", postalCode: "", country: "US",
    contactFirstName: "", contactLastName: "", contactEmail: "", contactPhone: "",
    notificationEmail: "", useCaseCategories: ["CUSTOMER_CARE", "ACCOUNT_NOTIFICATIONS"],
    useCaseSummary: "", productionMessageSample: "", optInType: "VERBAL", optInImageUrls: "",
    messageVolume: "100", privacyPolicyUrl: "", termsAndConditionsUrl: "",
    additionalInformation: "", editReason: "",
};

const BUSINESS_TYPES = [
    { value: "PRIVATE_PROFIT", label: "For-profit company", desc: "Most small businesses" },
    { value: "SOLE_PROPRIETOR", label: "Sole proprietor / freelancer", desc: "You run it yourself — no registration number needed" },
    { value: "PUBLIC_PROFIT", label: "Publicly traded company", desc: "Listed on a stock exchange" },
    { value: "NON_PROFIT", label: "Non-profit", desc: "501(c)(3) or similar" },
    { value: "GOVERNMENT", label: "Government entity", desc: "Public agency or office" },
];

const REGISTRATION_AUTHORITIES = [
    { value: "EIN", label: "EIN (US Employer ID)" },
    { value: "CRN", label: "CRN (Company Registration Number)" },
    { value: "VAT", label: "VAT Number" },
    { value: "OTHER", label: "Other / local registration" },
];

const USE_CASES = [
    { value: "CUSTOMER_CARE", label: "Customer conversations", desc: "Your AI receptionist replies when customers text your number" },
    { value: "ACCOUNT_NOTIFICATIONS", label: "Appointment reminders", desc: "Booking confirmations and reminders (reply 1/2/3)" },
    { value: "DELIVERY_NOTIFICATIONS", label: "Job or service updates", desc: "Progress updates, dispatch notices, completion alerts" },
    { value: "MARKETING", label: "Promotions & offers", desc: "Coupons, sales, and marketing messages" },
    { value: "EVENTS", label: "Event announcements", desc: "Events, classes, and webinar notices" },
    { value: "SECURITY_ALERT", label: "Security alerts", desc: "Protecting customer accounts or premises" },
    { value: "TWO_FACTOR_AUTHENTICATION", label: "Security codes (2FA)", desc: "One-time verification codes" },
    { value: "FRAUD_ALERT_MESSAGING", label: "Fraud alerts", desc: "Alerting customers about suspicious activity" },
];

const OPT_IN_TYPES = [
    { value: "VERBAL", label: "They agree over the phone", desc: "A customer tells your AI it's OK to text them" },
    { value: "VIA_TEXT", label: "They text in first", desc: "The customer texts you, or replies to a reminder prompt" },
    { value: "WEB_FORM", label: "They check a box online", desc: "Opt-in consent on your website or booking page" },
    { value: "PAPER_FORM", label: "They sign a paper / tablet form", desc: "In-person consent" },
];

const MESSAGE_VOLUMES = [
    { value: "10", label: "Under 100 texts / month" },
    { value: "100", label: "100 – 500 texts / month" },
    { value: "500", label: "500 – 1,000 texts / month" },
    { value: "1000", label: "1,000 – 5,000 texts / month" },
    { value: "5000", label: "5,000+ texts / month" },
];

const inputClass = "w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all";
const labelClass = "block text-[10px] uppercase tracking-wider text-[#A7ADBB] mb-1.5";
const cardClass = "bg-black border border-white/5 rounded-2xl p-8";

function Section({ step, title, children, defaultOpen = false }: { step: string; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className={cardClass}>
            <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 text-left">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#ff4b00]/20 border border-[#ff4b00]/30 text-[10px] font-bold text-[#ff4b00] flex-shrink-0">{step}</span>
                <span className="text-sm font-semibold text-white flex-1">{title}</span>
                <span className={`text-[#A7ADBB] text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
            </button>
            {open && <div className="mt-6 space-y-5">{children}</div>}
        </div>
    );
}

export default function SmsComplianceTab() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [compliance, setCompliance] = useState<ComplianceView | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<string[]>([]);
    const [notice, setNotice] = useState("");
    const [showForm, setShowForm] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/sms/compliance");
            const json = await res.json();
            setCompliance(json.compliance || null);
            if (json.prefill) {
                setForm((prev) => ({
                    ...prev,
                    businessName: prev.businessName || json.prefill.businessName || "",
                    doingBusinessAs: prev.doingBusinessAs || json.prefill.businessName || "",
                    contactFirstName: prev.contactFirstName || json.prefill.contactFirstName || "",
                    contactLastName: prev.contactLastName || json.prefill.contactLastName || "",
                    contactEmail: prev.contactEmail || json.prefill.notificationEmail || "",
                    notificationEmail: prev.notificationEmail || json.prefill.notificationEmail || "",
                    contactPhone: prev.contactPhone || json.prefill.ownerPhone || "",
                    country: prev.country || json.prefill.country || "US",
                    useCaseSummary: prev.useCaseSummary || json.prefill.suggestedUseCaseSummary || "",
                    productionMessageSample: prev.productionMessageSample || json.prefill.suggestedSampleMessage || "",
                }));
            }
        } catch {
            setError("Could not load your SMS verification status. Please refresh.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const refresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const update = (key: keyof FormState, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setError("");
        setFieldErrors([]);
    };

    const toggleCategory = (value: string) => {
        setForm((prev) => {
            const has = prev.useCaseCategories.includes(value);
            const next = has
                ? prev.useCaseCategories.filter((c) => c !== value)
                : [...prev.useCaseCategories, value];
            return { ...prev, useCaseCategories: next };
        });
    };

    const submit = async () => {
        setSubmitting(true);
        setError("");
        setFieldErrors([]);
        setNotice("");
        try {
            const res = await fetch("/api/sms/compliance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    optInImageUrls: form.optInImageUrls ? [form.optInImageUrls] : [],
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                if (json.fields && Array.isArray(json.fields)) {
                    setFieldErrors(json.fields.map((f: { message: string }) => f.message));
                }
                setError(json.error || "Something went wrong. Please try again.");
                return;
            }
            setNotice(json.message || "Submitted!");
            await load();
            setShowForm(false);
        } catch {
            setError("Network error — please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 text-[#ff4b00] animate-spin" />
            </div>
        );
    }

    const status = compliance?.status || "none";

    const warning = (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/[0.07] border border-amber-500/20">
            <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div>
                <p className="text-xs font-semibold text-amber-300">No messages will be sent until your registration is approved</p>
                <p className="text-[11px] text-amber-200/60 mt-1 leading-relaxed">
                    Until your Toll-Free Verification application is approved, US carriers block all outbound texts — appointment
                    reminders, missed-call follow-ups, review requests and AI text replies will not go out. Calls, inbound texts and
                    your AI phone line keep working normally. Approval typically takes 2–3 business days.
                </p>
            </div>
        </div>
    );

    // ------------- Status views -------------
    if (status === "approved") {
        return (
            <div className={`${cardClass} space-y-4`}>
                <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Business SMS is verified & active</h2>
                        <p className="text-xs text-[#A7ADBB] mt-1 leading-relaxed">
                            Your toll-free number <span className="text-emerald-400 font-medium">{compliance?.tollfree_number || "—"}</span> passed
                            Twilio&apos;s Toll-Free Verification. Appointment reminders, missed-call follow-ups, review requests and
                            AI text replies are all live.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                    <button type="button" onClick={refresh} disabled={refreshing} className="flex items-center gap-2 text-xs text-[#A7ADBB] hover:text-white transition-colors">
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Check status
                    </button>
                </div>
            </div>
        );
    }

    if (status === "pending") {
        return (
            <div className="space-y-5">
                {warning}
            <div className={`${cardClass} space-y-4`}>
                <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#ff4b00]/10 border border-[#ff4b00]/20 flex-shrink-0">
                        <Clock className="w-6 h-6 text-[#ff4b00]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Verification in progress</h2>
                        <p className="text-xs text-[#A7ADBB] mt-1 leading-relaxed">
                            We&apos;ve submitted your toll-free number <span className="text-[#ff4b00] font-medium">{compliance?.tollfree_number || "—"}</span> to Twilio
                            for Toll-Free SMS verification. Twilio typically reviews in 2–3 business days — you&apos;ll also get an email at
                            your notification address. Your status auto-updates here.
                        </p>
                    </div>
                </div>
                <button type="button" onClick={refresh} disabled={refreshing} className="flex items-center gap-2 text-xs text-[#ff4b00] hover:text-indigo-200 transition-colors">
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh status
                </button>
            </div>
            </div>
        );
    }

    if (status === "rejected") {
        const reasons = compliance?.rejection_reasons?.length ? compliance.rejection_reasons : (compliance?.rejection_reason ? [compliance.rejection_reason] : []);
        const editable = compliance?.edit_allowed !== false;
        const expired = compliance?.edit_expiration && new Date(compliance.edit_expiration).getTime() < Date.now();
        return (
            <div className="space-y-5">
                {warning}
                <div className="p-6 rounded-2xl bg-rose-500/[0.06] border border-rose-500/20">
                    <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex-shrink-0">
                            <XCircle className="w-6 h-6 text-rose-400" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-white">Verification needs your attention</h2>
                            <p className="text-xs text-[#A7ADBB] mt-1 leading-relaxed">
                                Twilio couldn&apos;t approve SMS on <span className="text-rose-300 font-medium">{compliance?.tollfree_number || "your number"}</span>.
                                {editable && !expired ? " Fix the issues below and we'll resubmit — no need to re-enter everything." : " We can start a fresh application."}
                            </p>
                            {reasons.length > 0 && (
                                <ul className="mt-3 space-y-1.5">
                                    {reasons.map((reason, i) => (
                                        <li key={i} className="text-xs text-rose-300/90 flex items-start gap-2">
                                            <span className="mt-0.5">•</span>
                                            <span>{reason}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {editable && expired && <p className="mt-2 text-[11px] text-amber-400">The edit window expired — submitting again starts a fresh review.</p>}
                        </div>
                    </div>
                </div>
                {!showForm && (
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setShowForm(true)} className="bg-white text-black text-sm font-medium px-6 py-2.5 rounded-full hover:bg-neutral-200 transition-colors">
                            {editable && !expired ? "Fix & resubmit" : "Start a new application"}
                        </button>
                    </div>
                )}
                {showForm && <ComplianceForm form={form} update={update} toggleCategory={toggleCategory} submitting={submitting} onSubmit={submit} error={error} fieldErrors={fieldErrors} editing />}
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="space-y-5">
                {warning}
                <div className={`${cardClass} space-y-4`}>
                <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex-shrink-0">
                        <ShieldCheck className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Business SMS — almost there</h2>
                        <p className="text-xs text-[#A7ADBB] mt-1 leading-relaxed">
                            Something went wrong while submitting your verification. Please try again in a few minutes — your details are saved.
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={() => setShowForm(true)} className="bg-white text-black text-sm font-medium px-6 py-2.5 rounded-full hover:bg-neutral-200 transition-colors">Try again</button>
                </div>
                {showForm && <ComplianceForm form={form} update={update} toggleCategory={toggleCategory} submitting={submitting} onSubmit={submit} error={error} fieldErrors={fieldErrors} />}
            </div>
            </div>
        );
    }

    // ------------- Default: not started -------------
    if (!showForm) {
        return (
            <div className="space-y-5">
                {warning}
                <div className={`${cardClass} space-y-5`}>
                <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#ff4b00]/10 border border-[#ff4b00]/20 flex-shrink-0">
                        <MessageSquareText className="w-6 h-6 text-[#ff4b00]" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-white">Enable Business SMS</h2>
                        <p className="text-xs text-[#A7ADBB] mt-1 leading-relaxed">
                            Unlock texting from your business number: appointment reminders, missed-call follow-ups, review requests
                            and AI text replies. US regulators require a one-time verification of your business before texts can go out —
                            we handle the whole process for you, you just answer a few questions.
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { t: "1. Tell us about your business", d: "Name, website and how customers can reach you" },
                        { t: "2. Show how you text", d: "What you send, how customers agree, a sample message" },
                        { t: "3. We submit to Twilio", d: "Auto-submitted. Approved in ~2–3 business days" },
                    ].map((s) => (
                        <div key={s.t} className="p-4 rounded-xl bg-black border border-white/5">
                            <p className="text-xs font-semibold text-white">{s.t}</p>
                            <p className="text-[11px] text-[#A7ADBB] mt-1 leading-relaxed">{s.d}</p>
                        </div>
                    ))}
                </div>
                <div className="pt-1">
                    <button type="button" onClick={() => setShowForm(true)} className="bg-white text-black text-sm font-medium px-8 py-3 rounded-full hover:bg-neutral-200 transition-colors">
                        Get started
                    </button>
                </div>
            </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {warning}
            <ComplianceForm form={form} update={update} toggleCategory={toggleCategory} submitting={submitting} onSubmit={submit} error={error} fieldErrors={fieldErrors} />
        </div>
    );
}

function ComplianceForm({ form, update, toggleCategory, submitting, onSubmit, error, fieldErrors, editing }: {
    form: FormState;
    update: (key: keyof FormState, value: string) => void;
    toggleCategory: (value: string) => void;
    submitting: boolean;
    onSubmit: () => void;
    error: string;
    fieldErrors: string[];
    editing?: boolean;
}) {
    const soleProprietor = form.businessType === "SOLE_PROPRIETOR";
    return (
        <div className="space-y-5">
            {editing && (
                <div>
                    <label className={labelClass}>What changed? (required for resubmission)</label>
                    <textarea value={form.editReason} onChange={(e) => update("editReason", e.target.value)} rows={2} placeholder="e.g. Updated our website and fixed the opt-in screenshot" className={inputClass} />
                </div>
            )}

            <Section step="1" title="About your business" defaultOpen>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className={labelClass}>Legal business name *</label><input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} className={inputClass} /></div>
                    <div><label className={labelClass}>Doing business as (optional)</label><input value={form.doingBusinessAs} onChange={(e) => update("doingBusinessAs", e.target.value)} className={inputClass} /></div>
                    <div><label className={labelClass}>Business website *</label><input value={form.businessWebsite} onChange={(e) => update("businessWebsite", e.target.value)} placeholder="https://yourbusiness.com" className={inputClass} /></div>
                    <div>
                        <label className={labelClass}>Business type *</label>
                        <select value={form.businessType} onChange={(e) => update("businessType", e.target.value)} className={inputClass}>
                            <option value="">Select…</option>
                            {BUSINESS_TYPES.map((o) => <option key={o.value} value={o.value} className="bg-[#0a0a0a]">{o.label}</option>)}
                        </select>
                        {form.businessType && <p className="text-[10px] text-neutral-600 mt-1.5">{BUSINESS_TYPES.find((b) => b.value === form.businessType)?.desc}</p>}
                    </div>
                    {!soleProprietor && (
                        <>
                            <div>
                                <label className={labelClass}>Registration number (EIN) *</label>
                                <input value={form.registrationNumber} onChange={(e) => update("registrationNumber", e.target.value)} placeholder="e.g. 12-3456789" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Registration authority *</label>
                                <select value={form.registrationAuthority} onChange={(e) => update("registrationAuthority", e.target.value)} className={inputClass}>
                                    <option value="">Select…</option>
                                    {REGISTRATION_AUTHORITIES.map((o) => <option key={o.value} value={o.value} className="bg-[#0a0a0a]">{o.label}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2"><label className={labelClass}>Registration country *</label><input value={form.registrationCountry} onChange={(e) => update("registrationCountry", e.target.value)} placeholder="US" className={inputClass} /></div>
                        </>
                    )}
                    <div><label className={labelClass}>Street address *</label><input value={form.streetAddress} onChange={(e) => update("streetAddress", e.target.value)} placeholder="123 Main St" className={inputClass} /></div>
                    <div><label className={labelClass}>City *</label><input value={form.city} onChange={(e) => update("city", e.target.value)} className={inputClass} /></div>
                    <div><label className={labelClass}>State / Province *</label><input value={form.stateProvinceRegion} onChange={(e) => update("stateProvinceRegion", e.target.value)} placeholder="TX" className={inputClass} /></div>
                    <div><label className={labelClass}>ZIP / Postal code *</label><input value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} className={inputClass} /></div>
                    <div><label className={labelClass}>Country *</label><input value={form.country} onChange={(e) => update("country", e.target.value.toUpperCase())} placeholder="US" className={inputClass} /></div>
                </div>
            </Section>

            <Section step="2" title="Who we contact about this verification">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className={labelClass}>Contact first name *</label><input value={form.contactFirstName} onChange={(e) => update("contactFirstName", e.target.value)} className={inputClass} /></div>
                    <div><label className={labelClass}>Contact last name *</label><input value={form.contactLastName} onChange={(e) => update("contactLastName", e.target.value)} className={inputClass} /></div>
                    <div><label className={labelClass}>Contact email *</label><input type="email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} className={inputClass} /></div>
                    <div><label className={labelClass}>Contact phone *</label><input value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} placeholder="+12125550123" className={inputClass} /></div>
                    <div className="md:col-span-2"><label className={labelClass}>Notification email — Twilio sends the result here *</label><input type="email" value={form.notificationEmail} onChange={(e) => update("notificationEmail", e.target.value)} className={inputClass} /></div>
                </div>
            </Section>

            <Section step="3" title="How you text customers" defaultOpen>
                <div>
                    <label className={labelClass}>Ways you use texting *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {USE_CASES.map((u) => {
                            const active = form.useCaseCategories.includes(u.value);
                            return (
                                <button key={u.value} type="button" onClick={() => toggleCategory(u.value)} className={`p-4 rounded-xl border text-left transition-all ${active ? "bg-[#ff4b00]/15 border-indigo-500/40" : "bg-black border-white/5 hover:border-white/20"}`}>
                                    <span className={`text-sm font-medium ${active ? "text-[#ff4b00]" : "text-neutral-300"}`}>{u.label}</span>
                                    <p className="text-[10px] text-[#A7ADBB] mt-1 leading-relaxed">{u.desc}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div><label className={labelClass}>Explain what you text customers *</label><textarea value={form.useCaseSummary} onChange={(e) => update("useCaseSummary", e.target.value)} rows={4} className={inputClass} /></div>
                <div><label className={labelClass}>Example of a real message you send *</label><textarea value={form.productionMessageSample} onChange={(e) => update("productionMessageSample", e.target.value)} rows={3} className={inputClass} /></div>
                <div>
                    <label className={labelClass}>How do customers agree to receive texts? *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {OPT_IN_TYPES.map((o) => {
                            const active = form.optInType === o.value;
                            return (
                                <button key={o.value} type="button" onClick={() => update("optInType", o.value)} className={`p-4 rounded-xl border text-left transition-all ${active ? "bg-[#ff4b00]/15 border-indigo-500/40" : "bg-black border-white/5 hover:border-white/20"}`}>
                                    <span className={`text-sm font-medium ${active ? "text-[#ff4b00]" : "text-neutral-300"}`}>{o.label}</span>
                                    <p className="text-[10px] text-[#A7ADBB] mt-1">{o.desc}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div>
                    <label className={labelClass}>Link to proof of opt-in (screenshot / image) *</label>
                    <input value={form.optInImageUrls} onChange={(e) => update("optInImageUrls", e.target.value)} placeholder="https://drive.google.com/…" className={inputClass} />
                    <p className="text-[10px] text-neutral-600 mt-1.5">Upload a screenshot showing how customers opt in (e.g. your booking page checkbox or a text reply), share it publicly (Google Drive works), and paste the link. If you have multiple flows, combine them into one PDF.</p>
                </div>
                <div>
                    <label className={labelClass}>Monthly text volume *</label>
                    <select value={form.messageVolume} onChange={(e) => update("messageVolume", e.target.value)} className={inputClass}>
                        {MESSAGE_VOLUMES.map((o) => <option key={o.value} value={o.value} className="bg-[#0a0a0a]">{o.label}</option>)}
                    </select>
                </div>
            </Section>

            <Section step="4" title="Privacy links (required for approval)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className={labelClass}>Privacy Policy URL *</label><input value={form.privacyPolicyUrl} onChange={(e) => update("privacyPolicyUrl", e.target.value)} placeholder="https://yourbusiness.com/privacy" className={inputClass} /></div>
                    <div><label className={labelClass}>Terms & Conditions URL *</label><input value={form.termsAndConditionsUrl} onChange={(e) => update("termsAndConditionsUrl", e.target.value)} placeholder="https://yourbusiness.com/terms" className={inputClass} /></div>
                </div>
                <p className="text-[10px] text-amber-400/80 leading-relaxed">Carriers require public Privacy Policy and Terms &amp; Conditions pages. If your site runs off a booking platform (e.g. Squarespace, GoDaddy), paste the page URLs here — no need to host code yourself.</p>
                <div><label className={labelClass}>Anything else reviewers should know? (optional)</label><textarea value={form.additionalInformation} onChange={(e) => update("additionalInformation", e.target.value)} rows={3} placeholder="e.g. We only text customers who ask us to, each message includes opt-out instructions" className={inputClass} /></div>
            </Section>

            {(error || fieldErrors.length > 0) && (
                <div className="p-4 rounded-xl bg-rose-500/[0.06] border border-rose-500/20">
                    {error && <p className="text-xs text-rose-300">{error}</p>}
                    {fieldErrors.length > 0 && (
                        <ul className="mt-2 space-y-1">
                            {fieldErrors.map((msg, i) => <li key={i} className="text-[11px] text-rose-300/80">• {msg}</li>)}
                        </ul>
                    )}
                </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { if (typeof window !== "undefined") window.location.reload(); }} className="text-sm text-[#A7ADBB] hover:text-white transition-colors px-6 py-3">Cancel</button>
                <button type="button" onClick={onSubmit} disabled={submitting} className="bg-white text-black text-sm font-medium px-8 py-3 rounded-full hover:bg-neutral-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    {submitting ? "Submitting…" : editing ? "Resubmit for review" : "Submit for verification"}
                </button>
            </div>
        </div>
    );
}
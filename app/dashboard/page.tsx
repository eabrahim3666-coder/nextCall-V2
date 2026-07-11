import PremiumAnalytics from "./_components/PremiumAnalytics";
import { auth } from "@clerk/nextjs/server";
import { callsCollection } from "@/lib/astra";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardCards from "./_components/DashboardCards";
import DashboardCharts from "./_components/DashboardCharts";
import { findBusinessByUserId } from "@/lib/business";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
    const { userId } = await auth();
    if (!userId) redirect("/");

    const business = await findBusinessByUserId(userId);

    const calls = await callsCollection
        .find({ business_id: userId })
        .sort({ created_at: -1 })
        .limit(50)
        .toArray();

    const formattedCalls = calls.map(call => ({
        call_id: call.call_id,
        customer_phone: call.customer_phone || "Unknown",
        customer_name: call.customer_name || null,
        customer_email: call.customer_email || null,
        summary: call.summary || "No summary",
        call_duration: call.call_duration || 0,
        created_at: call.created_at || new Date().toISOString(),
        is_flagged: call.is_flagged || false,
        sentiment: call.sentiment || "Neutral",
        lead_quality: call.lead_quality || "warm",
        appointment_booked: call.appointment_booked || false,
        is_emergency: call.is_emergency || false,
        call_source: call.call_source || "unknown",
    }));

    const businessName = business?.business_name || "Owner";

    const activeNumbers = Array.isArray(business?.twilio_numbers)
        ? business.twilio_numbers.map((num: string) => ({ number: num, label: "Main Line" }))
        : (business?.twilio_number ? [{ number: business.twilio_number, label: "Main Line" }] : []);

    const recentCalls = formattedCalls.slice(0, 5);

    const isAIActive = business?.status === "active";
    const minutesUsed = business?.total_minutes_used || 0;
    const minutesLimit = business?.minutes_limit || 200;
    const minutesRemaining = Math.max(0, minutesLimit - minutesUsed);
    const minutesPercent = minutesLimit > 0 ? Math.min(100, Math.round((minutesUsed / minutesLimit) * 100)) : 0;

    const volumeData: { name: string; calls: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const dateString = `${year}-${month}-${day}`;

        const callsOnDay = formattedCalls.filter(call => {
            const callDateObj = new Date(call.created_at);
            if (isNaN(callDateObj.getTime())) return false;

            const callYear = callDateObj.getFullYear();
            const callMonth = String(callDateObj.getMonth() + 1).padStart(2, "0");
            const callDay = String(callDateObj.getDate()).padStart(2, "0");
            const callDateString = `${callYear}-${callMonth}-${callDay}`;

            return callDateString === dateString;
        }).length;

        volumeData.push({ name: dayName, calls: callsOnDay });
    }

    const sentimentCounts = { Positive: 0, Neutral: 0, Negative: 0 };
    formattedCalls.forEach(call => {
        if (call.sentiment === "Positive") sentimentCounts.Positive++;
        else if (call.sentiment === "Negative") sentimentCounts.Negative++;
        else sentimentCounts.Neutral++;
    });

    const sentimentData = [
        { name: "Positive", value: sentimentCounts.Positive },
        { name: "Neutral", value: sentimentCounts.Neutral },
        { name: "Negative", value: sentimentCounts.Negative },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        Welcome back, {businessName}
                    </h1>
                    <p className="mt-1 text-sm text-neutral-400">
                        {isAIActive
                            ? "Your AI receptionist is online and managing your calls."
                            : "Set up your AI receptionist to start capturing leads."}
                    </p>
                </div>
                {isAIActive && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-sm font-medium text-emerald-400">AI Active</span>
                    </div>
                )}
            </div>

            {isAIActive && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Minutes Usage</p>
                                <p className="text-xs text-neutral-500">{minutesUsed} of {minutesLimit} minutes used this month</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-white">{minutesRemaining}</p>
                            <p className="text-xs text-neutral-500">minutes remaining</p>
                        </div>
                    </div>
                    <div className="w-full bg-white/[0.05] rounded-full h-2.5">
                        <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${minutesPercent > 80 ? "bg-red-500" : minutesPercent > 50 ? "bg-amber-500" : "bg-indigo-500"}`}
                            style={{ width: `${minutesPercent}%` }}
                        />
                    </div>
                    {minutesPercent > 80 && (
                        <p className="mt-2 text-xs text-red-400 font-medium">⚠ You&apos;re running low on minutes. Consider upgrading your plan.</p>
                    )}
                </div>
            )}

            <DashboardCards
                calls={formattedCalls}
                totalCalls={business?.total_calls_processed || 0}
                minutesUsed={minutesUsed}
                activeNumbers={activeNumbers}
            />

            {isAIActive && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link
                        href="/dashboard/settings?focus=step1"
                        className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-indigo-500/30 hover:bg-white/[0.05] transition-all group"
                    >
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
                            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Edit AI</p>
                            <p className="text-xs text-neutral-500">Update knowledge</p>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/calls"
                        className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-emerald-500/30 hover:bg-white/[0.05] transition-all group"
                    >
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Call Log</p>
                            <p className="text-xs text-neutral-500">View all calls</p>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/settings"
                        className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-amber-500/30 hover:bg-white/[0.05] transition-all group"
                    >
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Settings</p>
                            <p className="text-xs text-neutral-500">Configure</p>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/docs"
                        className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-purple-500/30 hover:bg-white/[0.05] transition-all group"
                    >
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Docs</p>
                            <p className="text-xs text-neutral-500">Guides & help</p>
                        </div>
                    </Link>
                </div>
            )}

            {isAIActive && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h2 className="text-base font-bold text-white">Recent Activity</h2>
                                    <p className="text-xs text-neutral-500">Latest calls handled by your AI</p>
                                </div>
                                {recentCalls.length > 0 && (
                                    <Link href="/dashboard/calls" className="text-xs font-medium text-indigo-400 hover:text-indigo-300">View all →</Link>
                                )}
                            </div>

                            {recentCalls.length === 0 ? (
                                <div className="text-center py-10 border border-dashed border-white/[0.1] rounded-xl">
                                    <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-white/[0.05] mb-3">
                                        <svg className="w-6 h-6 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    </div>
                                    <p className="text-sm text-neutral-400">No recent calls yet</p>
                                    <p className="text-xs text-neutral-600 mt-1">Your AI is ready and waiting for calls!</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/[0.06]">
                                    {recentCalls.map((call) => (
                                        <div key={call.call_id + "-" + call.created_at} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${call.sentiment === "Positive" ? "bg-emerald-500/10" : call.sentiment === "Negative" ? "bg-rose-500/10" : "bg-white/[0.05]"}`}>
                                                    <svg className={`w-4 h-4 ${call.sentiment === "Positive" ? "text-emerald-400" : call.sentiment === "Negative" ? "text-rose-400" : "text-neutral-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-white truncate">{call.customer_phone}</p>
                                                    <p className="text-xs text-neutral-500 truncate">{call.summary}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                                                <span className={`h-2 w-2 rounded-full ${call.sentiment === "Positive" ? "bg-emerald-400" : call.sentiment === "Negative" ? "bg-rose-400" : "bg-neutral-600"}`} />
                                                <span className="text-xs text-neutral-600 whitespace-nowrap">
                                                    {isNaN(new Date(call.created_at).getTime())
                                                        ? "--:--"
                                                        : new Date(call.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            {activeNumbers.length > 0 && (
                                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
                                    <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Your AI Numbers</h3>
                                    <div className="space-y-4">
                                        {activeNumbers.map((numObj, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">{numObj.number}</p>
                                                    <p className="text-xs text-emerald-400">Active</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-2xl p-6">
                                <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">💡 Pro Tip</h3>
                                <p className="text-sm text-neutral-300 leading-relaxed">
                                    Forward your business number to your nextCall AI number so every missed call becomes a captured lead.
                                </p>
                                <Link href="/dashboard/docs" className="inline-block text-xs font-medium text-indigo-400 mt-3 hover:text-indigo-300">
                                    Learn how →
                                </Link>
                            </div>
                        </div>
                    </div>

                    {business?.plan_type === "premium" || business?.plan === "premium" ? (
                        <PremiumAnalytics
                            calls={formattedCalls}
                            businessType={business?.business_type || "General"}
                            avgJobValue={business?.avg_job_value || 0}
                        />
                    ) : (
                        <DashboardCharts volumeData={volumeData} sentimentData={sentimentData} />
                    )}
                </>
            )}
        </div>
    );
}

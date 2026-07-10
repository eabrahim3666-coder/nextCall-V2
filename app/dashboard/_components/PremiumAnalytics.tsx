"use client";

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { useMemo } from "react";

type Call = {
    call_id: string;
    customer_phone: string;
    summary: string;
    call_duration: number;
    created_at: string;
    sentiment?: string;
    lead_quality?: string;
    appointment_booked?: boolean;
    is_emergency?: boolean;
    is_flagged?: boolean;
    call_source?: string; // NEW
};

type Props = {
    calls: Call[];
    businessName: string;
    businessType: string;
    avgJobValue?: number; // User-defined actual value from Settings; falls back to type-based estimate
};

const CHART_STYLES = {
    stroke: "#818cf8",
    fill: "#818cf8",
    gradientStart: "rgba(129,140,248,0.3)",
    gradientEnd: "rgba(129,140,248,0)",
    grid: "rgba(255,255,255,0.04)",
    axisText: "#525252",
};

// Average job value by business type (for revenue estimation)
const AVG_JOB_VALUE: Record<string, number> = {
    Plumbing: 350, Electrical: 325, HVAC: 450, "HVAC & Plumbing": 450, Roofing: 600,
    Landscaping: 200, Cleaning: 150, Painting: 400, Dentist: 250,
    "Real Estate": 5000, "Auto Repair": 300, "Salon & Spa": 80,
    Restaurant: 50, "General Contractor": 500, default: 300,
};

export default function PremiumAnalytics({ calls, businessName, businessType, avgJobValue: userJobValue }: Props) {
    // Use user-defined value if set (> 0), otherwise fall back to business-type estimate
    const avgJobValue = (userJobValue && userJobValue > 0)
        ? userJobValue
        : (AVG_JOB_VALUE[businessType] || AVG_JOB_VALUE.default);

    const metrics = useMemo(() => {
        if (!calls || calls.length === 0) {
            return {
                leadValue: 0, aiPerformance: 0, conversionRate: 0, totalRevenue: 0,
                capturedLeads: 0, appointments: 0, emergencies: 0,
                funnelData: [], weeklyTrend: [], heatmapData: [], sentimentBreakdown: [],
                peakHour: "N/A", bestDay: "N/A",
            };
        }

        const totalCalls = calls.length;
        const capturedLeads = calls.filter(c => c.lead_quality === "hot" || c.lead_quality === "warm" || c.summary).length;
        const appointments = calls.filter(c => c.appointment_booked).length;
        const emergencies = calls.filter(c => c.is_emergency).length;
        const aiPerformance = totalCalls > 0 ? Math.round(((totalCalls - emergencies) / totalCalls) * 100) : 100;
        const conversionRate = totalCalls > 0 ? Math.round((appointments / totalCalls) * 100) : 0;
        const totalRevenue = appointments * avgJobValue;
        const leadValue = capturedLeads > 0 ? Math.round(totalRevenue / capturedLeads) : 0;

        // Funnel data
        const funnelData = [
            { name: "Calls", value: totalCalls, color: "#818cf8" },
            { name: "Leads", value: capturedLeads, color: "#a78bfa" },
            { name: "Appointments", value: appointments, color: "#34d399" },
            { name: "Revenue", value: appointments, color: "#f59e0b" },
        ];

        // Weekly trend (last 8 weeks)
        const weeklyTrend = [];
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            const weekLabel = `W${8 - i}`;
            const weekCalls = calls.filter(c => {
                const d = new Date(c.created_at);
                return d >= weekStart && d < weekEnd;
            }).length;
            const weekAppts = calls.filter(c => {
                const d = new Date(c.created_at);
                return d >= weekStart && d < weekEnd && c.appointment_booked;
            }).length;
            weeklyTrend.push({ name: weekLabel, calls: weekCalls, appointments: weekAppts });
        }

        // Peak hours heatmap
        const hourBuckets: Record<number, number> = {};
        for (let h = 6; h <= 21; h++) hourBuckets[h] = 0;
        calls.forEach(c => {
            const hour = new Date(c.created_at).getHours();
            if (hour >= 6 && hour <= 21) hourBuckets[hour] = (hourBuckets[hour] || 0) + 1;
        });
        const maxHourCount = Math.max(...Object.values(hourBuckets), 1);
        const peakHour = Object.entries(hourBuckets).sort(([, a], [, b]) => b - a)[0]?.[0] || "9";
        const peakHourFormatted = `${peakHour}:00`;

        // Best day
        const dayBuckets: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        calls.forEach(c => {
            const dayName = dayNames[new Date(c.created_at).getDay()];
            dayBuckets[dayName] = (dayBuckets[dayName] || 0) + 1;
        });
        const bestDay = Object.entries(dayBuckets).sort(([, a], [, b]) => b - a)[0]?.[0] || "Mon";

        // Sentiment breakdown
        const pos = calls.filter(c => c.sentiment === "Positive").length;
        const neu = calls.filter(c => c.sentiment === "Neutral").length;
        const neg = calls.filter(c => c.sentiment === "Negative").length;
        const sentimentBreakdown = [
            { name: "Positive", value: pos, color: "#34d399" },
            { name: "Neutral", value: neu, color: "#94a3b8" },
            { name: "Negative", value: neg, color: "#f87171" },
        ];

        // Heatmap data for display
        const heatmapData = Object.entries(hourBuckets).map(([hour, count]) => ({
            hour: `${hour}:00`,
            calls: count,
            intensity: Math.round((count / maxHourCount) * 100),
        }));

        return {
            leadValue, aiPerformance, conversionRate, totalRevenue,
            capturedLeads, appointments, emergencies,
            funnelData, weeklyTrend, heatmapData, sentimentBreakdown,
            peakHour: peakHourFormatted, bestDay,
        };
    }, [calls, avgJobValue]);

    const hasData = calls && calls.length > 0;

    // Call Source tracking
    const sourceData = useMemo(() => {
        if (!calls || calls.length === 0) return [];

        const sourceCounts: Record<string, { calls: number; appointments: number; leads: number }> = {};

        calls.forEach(c => {
            const source = c.call_source || "Unknown";
            if (!sourceCounts[source]) {
                sourceCounts[source] = { calls: 0, appointments: 0, leads: 0 };
            }
            sourceCounts[source].calls++;
            if (c.appointment_booked) sourceCounts[source].appointments++;
            if (c.lead_quality === "hot" || c.lead_quality === "warm") sourceCounts[source].leads++;
        });

        // Convert phone numbers to friendly names
        return Object.entries(sourceCounts)
            .map(([source, data]) => ({
                source: formatSource(source),
                rawSource: source,
                ...data,
                conversionRate: data.calls > 0 ? Math.round((data.appointments / data.calls) * 100) : 0,
            }))
            .sort((a, b) => b.calls - a.calls);
    }, [calls]);

    function formatSource(phoneNumber: string): string {
        if (phoneNumber === "Unknown") return "Unknown";
        // Format: +15551234567 → (555) 123-4567
        const cleaned = phoneNumber.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
        }
        return phoneNumber;
    }

    return (
        <div className="space-y-6">
            {/* Premium badge */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white tracking-tight">Advanced Analytics</h2>
                <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">Premium</span>
            </div>

            {/* Row 1: Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Revenue Captured</p>
                    <p className="text-2xl font-semibold text-white">${metrics.totalRevenue.toLocaleString()}</p>
                    <p className="text-[10px] text-emerald-400 mt-1">+{metrics.appointments} appointments</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Lead Value</p>
                    <p className="text-2xl font-semibold text-white">${metrics.leadValue}</p>
                    <p className="text-[10px] text-indigo-400 mt-1">avg per captured lead</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">AI Performance</p>
                    <p className="text-2xl font-semibold text-white">{metrics.aiPerformance}%</p>
                    <p className="text-[10px] text-purple-400 mt-1">handled without human</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Conversion</p>
                    <p className="text-2xl font-semibold text-white">{metrics.conversionRate}%</p>
                    <p className="text-[10px] text-amber-400 mt-1">call to appointment</p>
                </div>
            </div>

            {/* Row 2: Conversion Funnel */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white mb-6">Conversion Funnel</h3>
                <div className="flex items-end gap-3 h-40">
                    {metrics.funnelData.map((step, i) => {
                        const maxVal = metrics.funnelData[0]?.value || 1;
                        const height = Math.max((step.value / maxVal) * 100, 8);
                        return (
                            <div key={step.name} className="flex-1 flex flex-col items-center justify-end h-full">
                                <span className="text-xs font-semibold text-white mb-2">{step.value}</span>
                                <div
                                    className="w-full rounded-t-lg transition-all duration-700"
                                    style={{
                                        height: `${height}%`,
                                        background: `linear-gradient(to top, ${step.color}20, ${step.color}60)`,
                                        border: `1px solid ${step.color}40`,
                                    }}
                                />
                                <span className="text-[10px] text-neutral-500 mt-2">{step.name}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
                    <p className="text-xs text-neutral-400">
                        Estimated <span className="text-emerald-400 font-semibold">${metrics.totalRevenue.toLocaleString()}</span> in revenue from {metrics.appointments} booked appointments
                        {avgJobValue ? ` (avg $${avgJobValue}/job)` : ''}
                    </p>
                </div>
            </div>

            {/* Row 3: Weekly Trends */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white mb-6">Weekly Trend</h3>
                {!hasData ? (
                    <div className="h-48 flex items-center justify-center">
                        <p className="text-xs text-neutral-600">Chart appears with call data</p>
                    </div>
                ) : (
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={metrics.weeklyTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#525252' }} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#525252' }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                                    itemStyle={{ color: '#a3a3a3', fontSize: '12px' }}
                                />
                                <Line type="monotone" dataKey="calls" stroke="#818cf8" strokeWidth={2} dot={{ fill: '#818cf8', r: 3 }} name="Calls" />
                                <Line type="monotone" dataKey="appointments" stroke="#34d399" strokeWidth={2} dot={{ fill: '#34d399', r: 3 }} name="Appointments" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Row 4: Peak Hours + Sentiment */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Peak Hours Heatmap */}
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-semibold text-white">Peak Hours</h3>
                        <div className="flex items-center gap-4 text-[10px] text-neutral-500">
                            <span>Busiest: <span className="text-white font-medium">{metrics.peakHour}</span></span>
                            <span>Best day: <span className="text-white font-medium">{metrics.bestDay}</span></span>
                        </div>
                    </div>

                    {!hasData ? (
                        <div className="h-32 flex items-center justify-center">
                            <p className="text-xs text-neutral-600">Heatmap appears with call data</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {metrics.heatmapData.map((h) => (
                                <div key={h.hour} className="flex items-center gap-3">
                                    <span className="text-[10px] text-neutral-600 w-10 text-right">{h.hour}</span>
                                    <div className="flex-1 h-5 rounded bg-white/[0.03] overflow-hidden">
                                        <div
                                            className="h-full rounded transition-all duration-500"
                                            style={{
                                                width: `${Math.max(h.intensity, 2)}%`,
                                                background: h.intensity > 70
                                                    ? "linear-gradient(to right, rgba(129,140,248,0.3), rgba(129,140,248,0.7))"
                                                    : h.intensity > 40
                                                        ? "linear-gradient(to right, rgba(129,140,248,0.15), rgba(129,140,248,0.4))"
                                                        : "linear-gradient(to right, rgba(129,140,248,0.05), rgba(129,140,248,0.15)",
                                            }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-neutral-600 w-4">{h.calls}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sentiment + Lead Quality */}
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white mb-6">Lead Quality Breakdown</h3>

                    {!hasData ? (
                        <div className="h-48 flex items-center justify-center">
                            <p className="text-xs text-neutral-600">Chart appears with call data</p>
                        </div>
                    ) : (
                        <>
                            <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={metrics.sentimentBreakdown}
                                            cx="50%" cy="50%"
                                            innerRadius={50} outerRadius={70}
                                            paddingAngle={3}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {metrics.sentimentBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mt-4">
                                {metrics.sentimentBreakdown.map((s) => (
                                    <div key={s.name} className="text-center p-2 rounded-lg bg-white/[0.02]">
                                        <span className="block h-1 rounded-full mb-2" style={{ background: s.color }} />
                                        <p className="text-xs font-medium text-white">{s.value}</p>
                                        <p className="text-[9px] text-neutral-600">{s.name}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Call Source Tracking */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white mb-6">Call Sources</h3>
                <p className="text-xs text-neutral-500 mb-6">See which phone numbers drive the most calls and appointments. Assign each number to a marketing channel.</p>

                {!hasData ? (
                    <div className="h-32 flex items-center justify-center">
                        <p className="text-xs text-neutral-600">Source data appears with incoming calls</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sourceData.map((s, i) => {
                            const maxCalls = sourceData[0]?.calls || 1;
                            const barWidth = (s.calls / maxCalls) * 100;
                            return (
                                <div key={s.rawSource} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${i === 0 ? "bg-indigo-500/20 text-indigo-300" : "bg-neutral-500/20 text-neutral-400"}`}>
                                                #{i + 1}
                                            </span>
                                            <span className="text-xs font-medium text-white">{s.source}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] text-neutral-500">
                                            <span>{s.calls} calls</span>
                                            <span>{s.appointments} appts</span>
                                            <span className={s.conversionRate > 0 ? "text-emerald-400" : ""}>{s.conversionRate}% conv</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-white/[0.05] rounded-full h-2">
                                        <div
                                            className="h-2 rounded-full transition-all duration-700 bg-gradient-to-r from-indigo-500/60 to-indigo-400"
                                            style={{ width: `${barWidth}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Tip */}
                <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-[10px] text-neutral-500 leading-relaxed">
                        Put a different number on each marketing channel (website, Google Ads, yard signs, truck wraps). Now you know exactly which ones produce calls and appointments.
                    </p>
                </div>
            </div>

            {/* Row 5: AI Performance Details */}
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white mb-6">AI Performance Score</h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
                        <p className="text-xl font-semibold text-emerald-400">{metrics.aiPerformance}%</p>
                        <p className="text-[10px] text-neutral-500 mt-1">Self-Handled</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
                        <p className="text-xl font-semibold text-rose-400">{metrics.emergencies}</p>
                        <p className="text-[10px] text-neutral-500 mt-1">Emergencies</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
                        <p className="text-xl font-semibold text-amber-400">{metrics.capturedLeads}</p>
                        <p className="text-[10px] text-neutral-500 mt-1">Leads Captured</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
                        <p className="text-xl font-semibold text-indigo-400">{metrics.conversionRate}%</p>
                        <p className="text-[10px] text-neutral-500 mt-1">Conversion</p>
                    </div>
                </div>

                {/* Performance bar */}
                <div className="mt-4">
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1.5">
                        <span>AI Autonomy</span>
                        <span>{metrics.aiPerformance}%</span>
                    </div>
                    <div className="w-full bg-white/[0.05] rounded-full h-2">
                        <div
                            className="h-2 rounded-full transition-all duration-700 bg-gradient-to-r from-indigo-500 to-purple-500"
                            style={{ width: `${metrics.aiPerformance}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-neutral-600 mt-1.5">
                        {metrics.aiPerformance >= 90
                            ? "Excellent — AI handles almost everything independently"
                            : metrics.aiPerformance >= 70
                                ? "Good — AI handles most calls, emergencies are forwarded"
                                : "Needs tuning — review your knowledge base settings"}
                    </p>
                </div>
            </div>
        </div>
    );
}
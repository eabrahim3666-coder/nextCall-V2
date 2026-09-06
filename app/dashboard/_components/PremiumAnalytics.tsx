"use client";

import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { useMemo, useRef, ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Filter, TrendingUp, Clock, Target, Radio, Gauge, ArrowUpRight } from "lucide-react";
import CinematicChartCard from "./CinematicChartCard";
import AnimatedNumber from "./AnimatedNumber";

/**
 * Eyecatching section header for analytics rows: glowing icon chip, title
 * with an orange accent underline, and an optional right-side stat (e.g. the
 * funnel's conversion %) — replaces the old plain white h3s.
 */
function SectionHeader({ icon: Icon, title, stat, statLabel }: {
    icon: typeof Filter;
    title: string;
    stat?: ReactNode;
    statLabel?: string;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-6">
            <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#ff4b00]/10 border border-[#ff4b00]/20 shadow-[0_0_16px_-4px_rgba(255,75,0,0.4)] shrink-0">
                    <Icon className="text-[#ff4b00]" style={{ width: 18, height: 18 }} />
                </div>
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white tracking-wide truncate">{title}</h3>
                    <div className="mt-1 h-[2px] w-10 rounded-full bg-gradient-to-r from-[#ff4b00] to-transparent" />
                </div>
            </div>
            {stat !== undefined && (
                <div className="text-right ml-auto shrink-0">
                    <p className="text-xl font-bold text-white flex items-center gap-1 justify-end">
                        <ArrowUpRight className="w-4 h-4 text-[#ff4b00] shrink-0" />
                        {stat}
                    </p>
                    {statLabel && <p className="text-[10px] text-[#A7ADBB] whitespace-nowrap">{statLabel}</p>}
                </div>
            )}
        </div>
    );
}

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
    businessType: string;
    avgJobValue?: number; // User-defined actual value from Settings; falls back to type-based estimate
};

// Average job value by business type (for revenue estimation)
const AVG_JOB_VALUE: Record<string, number> = {
    Plumbing: 350, Electrical: 325, HVAC: 450, "HVAC & Plumbing": 450, Roofing: 600,
    Landscaping: 200, Cleaning: 150, Painting: 400, Dentist: 250,
    "Real Estate": 5000, "Auto Repair": 300, "Salon & Spa": 80,
    Restaurant: 50, "General Contractor": 500, default: 300,
};

export default function PremiumAnalytics({ calls, businessType, avgJobValue: userJobValue }: Props) {
    // Use user-defined value if set (> 0), otherwise fall back to business-type estimate
    const avgJobValue = (userJobValue && userJobValue > 0)
        ? userJobValue
        : (AVG_JOB_VALUE[businessType] || AVG_JOB_VALUE.default);

    const reduceMotion = useReducedMotion();

    // Charts mount on scroll-arrival so recharts' draw-in plays at the right
    // moment; fixed-height containers prevent any layout shift meanwhile.
    const trendRef = useRef<HTMLDivElement>(null);
    const trendInView = useInView(trendRef, { once: true, amount: 0.3 });
    const sentimentRef = useRef<HTMLDivElement>(null);
    const sentimentInView = useInView(sentimentRef, { once: true, amount: 0.3 });

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
            { name: "Calls", value: totalCalls, color: "#ff4b00" },
            { name: "Leads", value: capturedLeads, color: "#ff6a2a" },
            { name: "Appointments", value: appointments, color: "#ff8a4d" },
            { name: "Revenue", value: appointments, color: "#ffb07a" },
        ];

        // Weekly trend (last 8 weeks)
        const weeklyTrend: Array<{ name: string; calls: number; appointments: number }> = [];
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
            { name: "Positive", value: pos, color: "#ff8a4d" },
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
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#ff4b00] bg-[#ff4b00]/10 border border-[#ff4b00]/20 px-3 py-1 rounded-full">Premium</span>
            </div>

            {/* Row 1: Key Metrics */}
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Revenue Captured", value: metrics.totalRevenue, format: (n: number) => `$${n.toLocaleString()}`, sub: `+${metrics.appointments} appointments`, subClass: "text-emerald-400" },
                    { label: "Lead Value", value: metrics.leadValue, format: (n: number) => `$${n}`, sub: "avg per captured lead", subClass: "text-[#ff4b00]" },
                    { label: "AI Performance", value: metrics.aiPerformance, format: (n: number) => `${n}%`, sub: "handled without human", subClass: "text-[#ff4b00]" },
                    { label: "Conversion", value: metrics.conversionRate, format: (n: number) => `${n}%`, sub: "call to appointment", subClass: "text-amber-400" },
                ].map((tile, i) => (
                    <CinematicChartCard key={tile.label} delay={i * 0.08}>
                        <div className="p-5">
                            <p className="text-[10px] uppercase tracking-wider text-[#A7ADBB] mb-2">{tile.label}</p>
                            <p className="text-2xl font-semibold text-white">
                                <AnimatedNumber value={tile.value} format={tile.format} />
                            </p>
                            <p className={`text-[10px] ${tile.subClass} mt-1`}>{tile.sub}</p>
                        </div>
                    </CinematicChartCard>
                ))}
            </div>

            {/* Row 2: Conversion Funnel */}
            <CinematicChartCard delay={0.1}>
                <div className="p-6">
                    <SectionHeader
                        icon={Filter}
                        title="Conversion Funnel"
                        stat={<AnimatedNumber value={metrics.conversionRate} format={(n) => `${n}%`} />}
                        statLabel="call → appointment"
                    />
                    {/* Centered funnel stack: label and count live INSIDE each bar,
                        so the trapezoids align perfectly down the middle. */}
                    <div className="relative max-w-md mx-auto space-y-1.5 py-1">
                        {/* Soft glow backdrop behind the stack */}
                        <div className="absolute inset-x-6 top-2 bottom-2 rounded-3xl bg-[#ff4b00]/[0.04] blur-xl pointer-events-none" />
                        {metrics.funnelData.map((step, i) => {
                            const maxVal = metrics.funnelData[0]?.value || 1;
                            const widthPct = Math.max((step.value / maxVal) * 100, 30);
                            const dropoff = i > 0
                                ? Math.round((1 - step.value / (metrics.funnelData[i - 1]?.value || maxVal)) * 100)
                                : null;
                            return (
                                <motion.div
                                    key={step.name}
                                    className="relative mx-auto flex items-center justify-between px-4 sm:px-5 gap-2"
                                    style={{
                                        width: `${widthPct}%`,
                                        height: 44,
                                        background: `linear-gradient(180deg, ${step.color}55, ${step.color}25)`,
                                        borderTop: `1px solid ${step.color}60`,
                                        borderBottom: `1px solid ${step.color}30`,
                                        clipPath: "polygon(0 0, 100% 0, calc(100% - 14px) 100%, 14px 100%)",
                                        filter: `drop-shadow(0 0 12px ${step.color}18)`,
                                    }}
                                    initial={{ scaleX: 0, opacity: 0 }}
                                    animate={{ scaleX: 1, opacity: 1 }}
                                    transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 0.12 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    <span className="text-[11px] font-semibold text-white/90 truncate">{step.name}</span>
                                    <span className="flex items-center gap-2 shrink-0">
                                        {dropoff !== null && dropoff > 0 && (
                                            <span className="text-[9px] text-rose-300/90 bg-rose-500/10 border border-rose-400/20 px-1.5 py-0.5 rounded-full">−{dropoff}%</span>
                                        )}
                                        <span className="text-lg font-bold text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.7)]">{step.value}</span>
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                    <div className="mt-4 p-3 rounded-xl bg-black border border-white/[0.04] text-center">
                        <p className="text-xs text-[#A7ADBB]">
                            Estimated <span className="text-emerald-400 font-semibold">${metrics.totalRevenue.toLocaleString()}</span> in revenue from {metrics.appointments} booked appointments
                            {avgJobValue ? ` (avg $${avgJobValue}/job)` : ''}
                        </p>
                    </div>
                </div>
            </CinematicChartCard>

            {/* Row 3: Weekly Trends */}
            <CinematicChartCard delay={0.15}>
                <div className="p-6">
                    <SectionHeader
                        icon={TrendingUp}
                        title="Weekly Trend"
                        stat={<AnimatedNumber value={metrics.appointments} />}
                        statLabel="total appointments"
                    />
                    {!hasData ? (
                        <div className="h-48 flex items-center justify-center">
                            <p className="text-xs text-neutral-600">Chart appears with call data</p>
                        </div>
                    ) : (
                        <div ref={trendRef} className="h-64">
                            {trendInView && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={metrics.weeklyTrend}>
                                        <defs>
                                            <linearGradient id="trendCalls" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ff4b00" stopOpacity={0.35} />
                                                <stop offset="95%" stopColor="#ff4b00" stopOpacity={0.02} />
                                            </linearGradient>
                                            <linearGradient id="trendAppts" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ff8a4d" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#ff8a4d" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,75,0,0.06)" />
                                        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#525252' }} />
                                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#525252' }} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,75,0,0.25)', borderRadius: '12px', boxShadow: '0 0 30px rgba(255,75,0,0.12)' }}
                                            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                                            itemStyle={{ color: '#a3a3a3', fontSize: '12px' }}
                                        />
                                        <Area type="monotone" dataKey="calls" stroke="#ff4b00" strokeWidth={3} fill="url(#trendCalls)" dot={{ fill: '#ff4b00', r: 4, strokeWidth: 2, stroke: '#0a0a0a' }} activeDot={{ r: 6, fill: '#ff4b00', stroke: '#0a0a0a', strokeWidth: 2 }} name="Calls" style={{ filter: 'drop-shadow(0 0 6px rgba(255,75,0,0.4))' }} />
                                        <Area type="monotone" dataKey="appointments" stroke="#ff8a4d" strokeWidth={3} fill="url(#trendAppts)" dot={{ fill: '#ff8a4d', r: 4, strokeWidth: 2, stroke: '#0a0a0a' }} activeDot={{ r: 6, fill: '#ff8a4d', stroke: '#0a0a0a', strokeWidth: 2 }} name="Appointments" style={{ filter: 'drop-shadow(0 0 6px rgba(255,138,77,0.35))' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    )}
                </div>
            </CinematicChartCard>

            {/* Row 4: Peak Hours + Sentiment */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Peak Hours Heatmap */}
                <CinematicChartCard delay={0.2}>
                    <div className="p-6">
                        <SectionHeader
                            icon={Clock}
                            title="Peak Hours"
                            stat={metrics.peakHour}
                            statLabel={`busiest · best day ${metrics.bestDay}`}
                        />

                        {!hasData ? (
                            <div className="h-32 flex items-center justify-center">
                                <p className="text-xs text-neutral-600">Heatmap appears with call data</p>
                            </div>
                        ) : (
                            <div>
                                {/* Tile grid: 6 columns of hours (6-21), glow scales with intensity */}
                                <div className="grid grid-cols-3 min-[420px]:grid-cols-6 gap-1.5">
                                    {metrics.heatmapData.map((h, i) => {
                                        const hot = h.intensity > 70;
                                        const warm = h.intensity > 40;
                                        return (
                                            <motion.div
                                                key={h.hour}
                                                className="relative rounded-lg flex flex-col items-center justify-center py-2.5 border"
                                                style={{
                                                    background: hot
                                                        ? "linear-gradient(160deg, rgba(255,75,0,0.45), rgba(255,75,0,0.2))"
                                                        : warm
                                                            ? "linear-gradient(160deg, rgba(255,75,0,0.25), rgba(255,75,0,0.1))"
                                                            : "linear-gradient(160deg, rgba(255,75,0,0.08), rgba(255,75,0,0.03))",
                                                    borderColor: hot ? "rgba(255,75,0,0.5)" : "rgba(255,75,0,0.15)",
                                                    boxShadow: hot ? "0 0 16px rgba(255,75,0,0.35)" : undefined,
                                                }}
                                                initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.7 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: reduceMotion ? 0 : 0.1 + i * 0.035, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                                title={`${h.hour} — ${h.calls} calls`}
                                            >
                                                <span className={`text-[10px] font-semibold ${hot ? "text-white" : warm ? "text-white/80" : "text-[#A7ADBB]"}`}>{h.hour}</span>
                                                <span className={`text-[9px] ${hot ? "text-[#ffb07a]" : "text-neutral-600"}`}>{h.calls}</span>
                                                {hot && (
                                                    <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-[#ff4b00] animate-pulse" />
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                                {/* Intensity legend */}
                                <div className="flex items-center gap-1.5 mt-3 justify-end">
                                    <span className="text-[9px] text-neutral-600">quiet</span>
                                    {[0.08, 0.25, 0.45].map((op) => (
                                        <span key={op} className="w-3 h-3 rounded-sm border border-[#ff4b00]/20" style={{ background: `rgba(255,75,0,${op})` }} />
                                    ))}
                                    <span className="text-[9px] text-neutral-600">busy</span>
                                </div>
                            </div>
                        )}
                    </div>
                </CinematicChartCard>

                {/* Sentiment + Lead Quality */}
                <CinematicChartCard delay={0.28}>
                    <div className="p-6">
                        <SectionHeader
                            icon={Target}
                            title="Lead Quality Breakdown"
                            stat={<AnimatedNumber value={metrics.capturedLeads} />}
                            statLabel="leads captured"
                        />

                        {!hasData ? (
                            <div className="h-48 flex items-center justify-center">
                                <p className="text-xs text-neutral-600">Chart appears with call data</p>
                            </div>
                        ) : (
                            <>
                                <div ref={sentimentRef} className="h-44 relative">
                                    {sentimentInView && (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={metrics.sentimentBreakdown}
                                                    cx="50%" cy="50%"
                                                    innerRadius={55} outerRadius={80}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                    stroke="#0a0a0a"
                                                    strokeWidth={3}
                                                    style={{ filter: 'drop-shadow(0 0 10px rgba(255,138,77,0.25))' }}
                                                >
                                                    {metrics.sentimentBreakdown.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,75,0,0.25)', borderRadius: '8px', boxShadow: '0 0 30px rgba(255,75,0,0.12)' }} itemStyle={{ color: '#94a3b8', fontSize: '12px' }} labelStyle={{ color: '#fff', fontWeight: 'bold' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                    {/* Center overlay: total leads */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <AnimatedNumber value={metrics.capturedLeads} className="text-2xl font-bold text-white" />
                                        <p className="text-[9px] text-[#A7ADBB] uppercase tracking-widest">total leads</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mt-4">
                                    {metrics.sentimentBreakdown.map((s, i) => {
                                        const totalLeads = metrics.sentimentBreakdown.reduce((sum, e) => sum + e.value, 0) || 1;
                                        const pct = Math.round((s.value / totalLeads) * 100);
                                        return (
                                            <motion.div
                                                key={s.name}
                                                className="p-2 rounded-lg bg-black border border-white/[0.04] overflow-hidden"
                                                initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: reduceMotion ? 0 : 0.3 + i * 0.08, duration: 0.4 }}
                                            >
                                                <div className="h-1 rounded-full mb-2 bg-white/5 overflow-hidden">
                                                    <motion.div
                                                        className="h-full rounded-full"
                                                        style={{ background: s.color, boxShadow: `0 0 6px ${s.color}60` }}
                                                        initial={{ width: "0%" }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ duration: reduceMotion ? 0 : 0.7, delay: reduceMotion ? 0 : 0.35 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                                                    />
                                                </div>
                                                <p className="text-xs font-medium text-white">{s.value} <span className="text-[9px] text-neutral-600">({pct}%)</span></p>
                                                <p className="text-[9px] text-neutral-600">{s.name}</p>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </CinematicChartCard>
            </div>

            {/* Call Source Tracking */}
            <CinematicChartCard delay={0.33}>
                <div className="p-6">
                    <SectionHeader
                        icon={Radio}
                        title="Call Sources"
                        stat={<AnimatedNumber value={sourceData.length} />}
                        statLabel="tracked numbers"
                    />
                    <p className="text-xs text-[#A7ADBB] mb-6 -mt-2">See which phone numbers drive the most calls and appointments. Assign each number to a marketing channel.</p>

                    {!hasData ? (
                        <div className="h-32 flex items-center justify-center">
                            <p className="text-xs text-neutral-600">Source data appears with incoming calls</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sourceData.map((s, i) => {
                                const maxCalls = sourceData[0]?.calls || 1;
                                const barWidth = (s.calls / maxCalls) * 100;
                                const apptWidth = s.calls > 0 ? (s.appointments / s.calls) * 100 : 0;
                                return (
                                    <motion.div
                                        key={s.rawSource}
                                        className="relative p-4 rounded-xl bg-black border overflow-hidden"
                                        style={{ borderColor: i === 0 ? "rgba(255,75,0,0.35)" : "rgba(255,255,255,0.04)" }}
                                        initial={{ opacity: 0, x: reduceMotion ? 0 : -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: reduceMotion ? 0 : 0.15 + i * 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                                    >
                                        {/* Rank glow wash for the leader */}
                                        {i === 0 && (
                                            <div className="absolute inset-0 bg-gradient-to-r from-[#ff4b00]/10 to-transparent pointer-events-none" />
                                        )}
                                        <div className="relative flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${i === 0 ? "bg-[#ff4b00]/20 text-[#ff4b00]" : "bg-neutral-500/20 text-[#A7ADBB]"}`}>
                                                    #{i + 1}
                                                </span>
                                                <span className="text-xs font-medium text-white">{s.source}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#A7ADBB] ml-auto">
                                                <span>{s.calls} calls</span>
                                                <span>{s.appointments} appts</span>
                                                <span className={s.conversionRate > 0 ? "text-emerald-400" : ""}>{s.conversionRate}% conv</span>
                                            </div>
                                        </div>
                                        {/* Calls track (gradient sweep) */}
                                        <div className="relative w-full bg-black rounded-full h-2.5 border border-white/5 overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full bg-gradient-to-r from-[#ff4b00] via-[#ff6a2a] to-[#ff8a4d]"
                                                style={{ boxShadow: i === 0 ? "0 0 14px rgba(255,75,0,0.5)" : "0 0 8px rgba(255,75,0,0.2)" }}
                                                initial={{ width: "0%" }}
                                                animate={{ width: `${barWidth}%` }}
                                                transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.25 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
                                            />
                                            {/* Appointment fill inside the same track (emerald overlay) */}
                                            <motion.div
                                                className="absolute top-0 left-0 h-full bg-emerald-500/70 rounded-full"
                                                style={{ boxShadow: "0 0 8px rgba(16,185,129,0.4)" }}
                                                initial={{ width: "0%" }}
                                                animate={{ width: `${(barWidth / 100) * apptWidth}%` }}
                                                transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.5 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
                                            />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {/* Tip */}
                    <div className="mt-4 p-3 rounded-xl bg-black border border-white/[0.04]">
                        <p className="text-[10px] text-[#A7ADBB] leading-relaxed">
                            Put a different number on each marketing channel (website, Google Ads, yard signs, truck wraps). Now you know exactly which ones produce calls and appointments.
                        </p>
                    </div>
                </div>
            </CinematicChartCard>

            {/* Row 5: AI Performance Details */}
            <CinematicChartCard delay={0.38}>
                <div className="p-6">
                    <SectionHeader
                        icon={Gauge}
                        title="AI Performance Score"
                        stat={<AnimatedNumber value={metrics.aiPerformance} format={(n) => `${n}%`} />}
                        statLabel="self-handled"
                    />

                    {/* Gauge: semicircle speedometer with animated needle arc.
                        viewBox is padded on all sides — the arc's topmost point
                        plus the 10px stroke and glow would otherwise clip. */}
                    <div className="flex justify-center mb-2">
                        <div className="relative w-full max-w-56 h-32">
                            <svg viewBox="0 0 248 136" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
                                <defs>
                                    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#ff8a4d" />
                                        <stop offset="100%" stopColor="#ff4b00" />
                                    </linearGradient>
                                </defs>
                                {/* Track: 180° arc from left to right */}
                                <path d="M 26 122 A 98 98 0 0 1 222 122" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} strokeLinecap="round" />
                                {/* Filled arc — sweep animated from 0 */}
                                <motion.path
                                    d="M 26 122 A 98 98 0 0 1 222 122"
                                    fill="none"
                                    stroke="url(#gaugeGrad)"
                                    strokeWidth={10}
                                    strokeLinecap="round"
                                    style={{ filter: "drop-shadow(0 0 8px rgba(255,75,0,0.5))" }}
                                    initial={{ strokeDasharray: "308 308", strokeDashoffset: reduceMotion ? 0 : 308 }}
                                    animate={{ strokeDashoffset: 308 - (308 * metrics.aiPerformance) / 100 }}
                                    transition={{ duration: reduceMotion ? 0 : 1.2, delay: reduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                                />
                                {/* Tick marks at 0 / 50 / 100 */}
                                {[0, 50, 100].map((mark) => {
                                    const angle = (Math.PI * mark) / 100;
                                    const x1 = 124 + Math.sin(angle) * 84;
                                    const y1 = 122 - Math.cos(angle) * 84;
                                    const x2 = 124 + Math.sin(angle) * 74;
                                    const y2 = 122 - Math.cos(angle) * 74;
                                    return <line key={mark} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth={2} />;
                                })}
                            </svg>
                            {/* Center readout */}
                            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
                                <AnimatedNumber value={metrics.aiPerformance} format={(n) => `${n}%`} className="text-3xl font-bold text-white" />
                                <p className="text-[9px] text-[#A7ADBB] uppercase tracking-widest">autonomy</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { value: metrics.aiPerformance, suffix: "%", color: "text-emerald-400", label: "Self-Handled" },
                            { value: metrics.emergencies, suffix: "", color: "text-rose-400", label: "Emergencies" },
                            { value: metrics.capturedLeads, suffix: "", color: "text-amber-400", label: "Leads Captured" },
                            { value: metrics.conversionRate, suffix: "%", color: "text-[#ff4b00]", label: "Conversion" },
                        ].map((tile, i) => (
                            <motion.div
                                key={tile.label}
                                className="p-4 rounded-xl bg-black border border-white/[0.04] text-center"
                                initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: reduceMotion ? 0 : 0.15 + i * 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <p className={`text-xl font-semibold ${tile.color}`}>
                                    <AnimatedNumber value={tile.value} format={(n) => `${n}${tile.suffix}`} />
                                </p>
                                <p className="text-[10px] text-[#A7ADBB] mt-1">{tile.label}</p>
                            </motion.div>
                        ))}
                    </div>

                    <p className="text-[10px] text-neutral-600 mt-4 text-center">
                        {metrics.aiPerformance >= 90
                            ? "Excellent — AI handles almost everything independently"
                        : metrics.aiPerformance >= 70
                            ? "Good — AI handles most calls, emergencies are forwarded"
                            : "Needs tuning — review your knowledge base settings"}
                    </p>
                </div>
            </CinematicChartCard>
        </div>
    );
}
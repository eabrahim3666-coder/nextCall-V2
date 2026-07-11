"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type VolumeData = { name: string; calls: number };
type SentimentData = { name: string; value: number };

const COLORS = ["#22d3ee", "#94a3b8", "#f87171"];

const defaultVolumeData = [
    { name: "Mon", calls: 4 }, { name: "Tue", calls: 12 }, { name: "Wed", calls: 7 },
    { name: "Thu", calls: 15 }, { name: "Fri", calls: 9 }, { name: "Sat", calls: 2 }, { name: "Sun", calls: 5 },
];

const defaultSentimentData = [
    { name: "Positive", value: 65 }, { name: "Neutral", value: 25 }, { name: "Negative", value: 10 },
];

type TooltipProps = {
    active?: boolean;
    payload?: { value: number }[];
    label?: string;
};

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#0a0a0a] border border-white/[0.1] px-4 py-3 shadow-xl rounded-lg">
                <p className="text-xs text-neutral-400 mb-1">{label}</p>
                <p className="text-sm font-bold text-white">{payload[0].value} <span className="text-cyan-400 text-xs font-medium">CALLS</span></p>
            </div>
        );
    }
    return null;
};

export default function DashboardCharts({ volumeData, sentimentData }: { volumeData: VolumeData[], sentimentData: SentimentData[] }) {
    const totalCalls = volumeData.reduce((sum, day) => sum + day.calls, 0);
    const displayVolume = totalCalls === 0 ? defaultVolumeData : volumeData;
    const displaySentiment = totalCalls === 0 ? defaultSentimentData : sentimentData;
    const sentimentTotal = displaySentiment.reduce((sum, entry) => sum + entry.value, 0);

    return (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-lg font-bold text-white">Performance Analytics</h2>
                    <p className="text-sm text-neutral-500 mt-1">Real-time call volume and lead classification.</p>
                </div>
                {totalCalls === 0 && (
                    <span className="text-xs font-semibold text-cyan-400 bg-cyan-950 px-3 py-1 rounded-full border border-cyan-800">DEMO MODE</span>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 h-[320px]">
                    <div className="flex justify-between items-end mb-4">
                        <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Call Volume (7D)</h3>
                        <p className="text-2xl font-bold text-white">{totalCalls === 0 ? '54' : totalCalls} <span className="text-xs text-neutral-500 font-normal">total</span></p>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={displayVolume} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#525252' }} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#525252' }} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="calls" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorCalls)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="h-[320px] flex flex-col">
                    <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">Lead Sentiment</h3>
                    <div className="flex-1 flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={displaySentiment} cx="50%" cy="50%" innerRadius={75} outerRadius={105} paddingAngle={3} dataKey="value" stroke="none">
                                    {displaySentiment.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={totalCalls === 0 ? "#334155" : COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} itemStyle={{ color: '#94a3b8', fontSize: '12px' }} labelStyle={{ color: '#fff', fontWeight: 'bold' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <p className="text-3xl font-bold text-white">{sentimentTotal}%</p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">Quality</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mt-4">
                        <div><span className="block h-1.5 w-full rounded-full bg-cyan-400 mb-2" /><p className="text-xs text-neutral-400">Pos</p></div>
                        <div><span className="block h-1.5 w-full rounded-full bg-slate-400 mb-2" /><p className="text-xs text-neutral-400">Neu</p></div>
                        <div><span className="block h-1.5 w-full rounded-full bg-red-400 mb-2" /><p className="text-xs text-neutral-400">Neg</p></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
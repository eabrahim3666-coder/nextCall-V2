"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import React from "react";

const volumeData = [
    { name: "9 AM", calls: 2 },
    { name: "10 AM", calls: 5 },
    { name: "11 AM", calls: 4 },
    { name: "12 PM", calls: 9 },
    { name: "1 PM", calls: 7 },
    { name: "2 PM", calls: 11 },
    { name: "Now", calls: 8 },
];

const recentCalls = [
    { id: 1, phone: "+1 (***) ***-4567", status: "Qualified", time: "2m ago", color: "text-blue-400 bg-blue-900" },
    { id: 2, phone: "+1 (***) ***-6543", status: "Emergency", time: "15m ago", color: "text-red-400 bg-red-900" },
    { id: 3, phone: "+1 (***) ***-5555", status: "Spam", time: "32m ago", color: "text-gray-400 bg-gray-700" },
];

// CUSTOM PULSING DOT FOR THE "LIVE" CHART POINT
const CustomizedDot = (props: { cx?: number; cy?: number; index?: number }) => {
    const { cx, cy, index } = props;
    // Only add the pulsing dot to the very last data point ("Now")
    if (index === volumeData.length - 1) {
        return (
            <g>
                <circle cx={cx} cy={cy} r={4} fill="#06b6d4" stroke="#0f172a" strokeWidth={2} />
                <circle cx={cx} cy={cy} r={8} fill="#06b6d4" opacity={0.4} className="animate-ping" />
            </g>
        );
    }
    return null;
};

export default function HeroVisual() {
    return (
        <motion.div
            className="mt-16 max-w-4xl mx-auto bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 overflow-hidden"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 1, type: "spring", stiffness: 100 }}
        >
            {/* Dashboard Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-950">
                <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-medium text-gray-400">Live Dashboard</span>
                </div>
                <span className="text-[10px] text-gray-600">nextCall Analytics</span>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Chart Section */}
                <div className="md:col-span-2 h-48">
                    <h3 className="text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-widest">Call Volume</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={volumeData}>
                            <defs>
                                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#475569' }} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#475569' }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', fontSize: '12px' }}
                                itemStyle={{ color: '#06b6d4' }}
                                labelStyle={{ color: '#94a3b8' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="calls"
                                stroke="#06b6d4"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorCalls)"
                                animationDuration={2000}
                                animationEasing="ease-out"
                                dot={<CustomizedDot />} // ADDS THE PULSING LIVE DOT
                                activeDot={{ r: 6, fill: "#06b6d4", stroke: "#0f172a", strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Recent Activity List */}
                <div className="flex flex-col">
                    <h3 className="text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-widest">Recent Calls</h3>
                    <div className="space-y-2">
                        {recentCalls.map((call, i) => (
                            <motion.div
                                key={call.id}
                                className="flex items-center justify-between bg-gray-800 p-2.5 rounded-lg border border-gray-700"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4, delay: 2 + (i * 0.3) }}
                            >
                                <div>
                                    <p className="text-[11px] font-medium text-gray-300">{call.phone}</p>
                                    <p className="text-[9px] text-gray-500">{call.time}</p>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${call.color}`}>
                                    {call.status}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
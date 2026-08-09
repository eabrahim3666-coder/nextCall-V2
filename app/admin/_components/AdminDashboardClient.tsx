"use client";

import { useState } from "react";
import { Users, Phone, Clock, AlertTriangle, Download, Eye, X, Database, CheckCircle, XCircle } from "lucide-react";

type Business = {
    business_id: string;
    business_name?: string;
    email?: string;
    owner_phone?: string;
    status?: string;
    plan?: string;
    minutes_limit?: number;
    total_minutes_used?: number;
    total_calls_processed?: number;
    created_at?: string;
    knowledge_base_text?: string;
    greeting_text?: string;
    greeting_tone?: string;
    routing_rules?: Record<string, boolean>;
    meta_page_id?: string | null;
    meta_page_access_token?: string | null;
    google_refresh_token?: string | null;
    zapier_webhook_url?: string | null;
    referral_code?: string;
    bonus_minutes?: number;
    twilio_number?: string;
};

type Props = {
    allBusinesses: Business[];
    totalCallsProcessed: number;
    totalMinutesConsumed: number;
    flaggedCount: number;
    dbStats: {
        businessCount: number;
        callsCount: number;
        convoCount: number;
        notifCount: number;
        estimatedMB: number;
        dbLimitMB: number;
        storagePercent: number;
    };
};

export default function AdminDashboardClient({ allBusinesses, totalCallsProcessed, totalMinutesConsumed, flaggedCount, dbStats }: Props) {
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const activeUsers = allBusinesses.filter(b => b.status === "active").length;

    // Churn Risk Calculation
    const churnRiskUsers = allBusinesses.map(b => {
        const used = b.total_minutes_used || 0;
        const limit = b.minutes_limit || 200;
        const percent = limit > 0 ? (used / limit) : 0;

        let riskLevel = null;
        let riskReason = "";

        if (b.status === "active" && (b.total_calls_processed || 0) === 0) {
            riskLevel = "high";
            riskReason = "Paying but 0 calls (Ghost User)";
        } else if (b.status === "active" && percent >= 0.9) {
            riskLevel = "high";
            riskReason = "Using >90% of minutes (Frustrated/Limited)";
        } else if (b.status === "pending") {
            riskLevel = "medium";
            riskReason = "Stuck in onboarding/paywall";
        }

        return { ...b, riskLevel, riskReason, percent };
    }).filter(b => b.riskLevel !== null).sort((a, b) => {
        // Sort High risk first
        if (a.riskLevel === "high" && b.riskLevel !== "high") return -1;
        if (a.riskLevel !== "high" && b.riskLevel === "high") return 1;
        return 0;
    });

    const filteredBusinesses = allBusinesses.filter(b =>
        b.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.business_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleExportAll = () => {
        const dataStr = JSON.stringify(allBusinesses, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nextcall_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleExportSingle = (business: Business) => {
        const dataStr = JSON.stringify(business, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${business.business_name || 'user'}_backup.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header + Export */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Command Center</h1>
                    <p className="mt-1 text-sm text-neutral-400">Platform-wide metrics, infrastructure, and user management.</p>
                </div>
                <button onClick={handleExportAll} className="inline-flex items-center gap-2 bg-white text-black text-sm font-medium px-5 py-2.5 rounded-full hover:bg-neutral-200 transition-colors">
                    <Download width={16} /> Export All Data
                </button>
            </div>

            {/* Global Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/[0.03] border border-white/[0.06] p-5 rounded-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Users</span>
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20"><Users className="h-4 w-4 text-indigo-400" /></div>
                    </div>
                    <p className="text-3xl font-bold text-white">{allBusinesses.length}</p>
                    <p className="text-xs text-emerald-400 mt-1">{activeUsers} active</p>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.06] p-5 rounded-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Calls</span>
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20"><Phone className="h-4 w-4 text-cyan-400" /></div>
                    </div>
                    <p className="text-3xl font-bold text-white">{totalCallsProcessed}</p>
                    <p className="text-xs text-neutral-500 mt-1">Across all accounts</p>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.06] p-5 rounded-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Minutes Served</span>
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20"><Clock className="h-4 w-4 text-emerald-400" /></div>
                    </div>
                    <p className="text-3xl font-bold text-white">{totalMinutesConsumed.toFixed(0)}</p>
                    <p className="text-xs text-neutral-500 mt-1">Platform-wide usage</p>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.06] p-5 rounded-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Flagged</span>
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20"><AlertTriangle className="h-4 w-4 text-amber-400" /></div>
                    </div>
                    <p className="text-3xl font-bold text-white">{flaggedCount}</p>
                    <p className="text-xs text-neutral-500 mt-1">Needs review</p>
                </div>
            </div>

            {/* DB Stats */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-4">
                    <Database className="h-4 w-4 text-indigo-400" />
                    <h2 className="text-base font-bold text-white">Database Storage</h2>
                </div>
                <div className="flex justify-between items-end mb-2">
                    <p className="text-2xl font-bold text-white">{dbStats.estimatedMB.toFixed(1)} <span className="text-sm font-normal text-neutral-500">MB used</span></p>
                    <p className="text-xs text-neutral-500">{dbStats.dbLimitMB / 1024} GB Limit</p>
                </div>
                <div className="w-full bg-white/[0.05] rounded-full h-3">
                    <div className={`h-3 rounded-full transition-all duration-500 ${dbStats.storagePercent > 80 ? 'bg-red-500' : dbStats.storagePercent > 50 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${dbStats.storagePercent}%` }} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg"><p className="text-xs text-neutral-500">Businesses</p><p className="text-lg font-bold text-white">{dbStats.businessCount}</p></div>
                    <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg"><p className="text-xs text-neutral-500">Calls</p><p className="text-lg font-bold text-white">{dbStats.callsCount}</p></div>
                    <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg"><p className="text-xs text-neutral-500">Conversations</p><p className="text-lg font-bold text-white">{dbStats.convoCount}</p></div>
                    <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg"><p className="text-xs text-neutral-500">Notifications</p><p className="text-lg font-bold text-white">{dbStats.notifCount}</p></div>
                </div>
            </div>

            {/* Churn Risk Section */}
            <div className="bg-white/[0.03] border border-rose-500/20 rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <h2 className="text-base font-bold text-white">Churn Risk ({churnRiskUsers.length})</h2>
                </div>
                <p className="text-xs text-neutral-500 mb-5">Users who are stuck, not getting value, or hitting limits. Reach out to them!</p>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {churnRiskUsers.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-white/[0.1] rounded-xl">
                            <p className="text-sm text-neutral-500">No users at risk of churning right now. 🎉</p>
                        </div>
                    ) : (
                        churnRiskUsers.map((user) => (
                            <div key={user.business_id} className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-lg hover:bg-white/[0.04] transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2.5 h-2.5 rounded-full ${user.riskLevel === 'high' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                                        <p className="text-sm font-medium text-white">{user.business_name || "Unnamed Business"}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${user.riskLevel === 'high' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                        {user.riskLevel} risk
                                    </span>
                                </div>
                                <p className="text-xs text-neutral-400 mb-3">{user.riskReason}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-neutral-500">Plan: {user.plan || 'trial'} | Status: {user.status}</span>
                                    <button onClick={() => setSelectedBusiness(user)} className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                                        View Details &rarr;
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* All Users Table */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-base font-bold text-white">All Businesses & Plans</h2>
                    <input
                        type="text"
                        placeholder="Search by name, email, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-4 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/50 w-full sm:w-72"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-white/[0.06]">
                            <tr>
                                <th className="pb-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Business</th>
                                <th className="pb-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Plan</th>
                                <th className="pb-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                                <th className="pb-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Minutes</th>
                                <th className="pb-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {filteredBusinesses.length === 0 ? (
                                <tr><td colSpan={5} className="py-6 text-center text-sm text-neutral-500">No businesses found.</td></tr>
                            ) : (
                                filteredBusinesses.map((user) => {
                                    const used = user.total_minutes_used || 0;
                                    const limit = user.minutes_limit || 200;
                                    const percent = Math.round((used / limit) * 100);
                                    return (
                                        <tr key={user.business_id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="py-3 pr-4">
                                                <p className="text-sm font-medium text-white">{user.business_name || "Unnamed"}</p>
                                                <p className="text-xs text-neutral-600 truncate max-w-[200px]">{user.email || user.business_id}</p>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${user.plan === 'premium' ? 'bg-indigo-500/10 text-indigo-400' : user.plan === 'standard' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-neutral-500/10 text-neutral-400'}`}>
                                                    {user.plan || 'trial'}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className={`text-xs font-semibold ${user.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                    {user.status || 'pending'}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 bg-white/[0.05] rounded-full h-1.5">
                                                        <div className={`h-1.5 rounded-full ${percent >= 90 ? 'bg-red-500' : percent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, percent)}%` }} />
                                                    </div>
                                                    <span className="text-xs text-neutral-400">{used}/{limit}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleExportSingle(user)} className="text-neutral-500 hover:text-white transition-colors p-1" title="Export JSON">
                                                        <Download width={14} />
                                                    </button>
                                                    <button onClick={() => setSelectedBusiness(user)} className="text-neutral-500 hover:text-indigo-400 transition-colors p-1" title="View Details">
                                                        <Eye width={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedBusiness && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedBusiness(null)}>
                    <div className="bg-[#0a0a0a] border border-white/[0.1] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-white">{selectedBusiness.business_name || "Business Details"}</h2>
                            <button onClick={() => setSelectedBusiness(null)} className="text-neutral-500 hover:text-white"><X width={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/[0.03] p-3 rounded-lg"><p className="text-[10px] text-neutral-500 uppercase">Plan</p><p className="text-sm text-white font-medium">{selectedBusiness.plan || 'trial'}</p></div>
                                <div className="bg-white/[0.03] p-3 rounded-lg"><p className="text-[10px] text-neutral-500 uppercase">Status</p><p className="text-sm text-white font-medium">{selectedBusiness.status || 'pending'}</p></div>
                                <div className="bg-white/[0.03] p-3 rounded-lg"><p className="text-[10px] text-neutral-500 uppercase">Owner Email</p><p className="text-sm text-white font-medium break-all">{selectedBusiness.email || 'N/A'}</p></div>
                                <div className="bg-white/[0.03] p-3 rounded-lg"><p className="text-[10px] text-neutral-500 uppercase">Owner Phone</p><p className="text-sm text-white font-medium">{selectedBusiness.owner_phone || 'N/A'}</p></div>
                                <div className="bg-white/[0.03] p-3 rounded-lg"><p className="text-[10px] text-neutral-500 uppercase">Twilio Number</p><p className="text-sm text-white font-medium">{selectedBusiness.twilio_number || 'N/A'}</p></div>
                                <div className="bg-white/[0.03] p-3 rounded-lg"><p className="text-[10px] text-neutral-500 uppercase">Referral Code</p><p className="text-sm text-white font-medium">{selectedBusiness.referral_code || 'N/A'}</p></div>
                            </div>

                            <div className="bg-white/[0.03] p-4 rounded-lg">
                                <h3 className="text-xs font-bold text-neutral-400 mb-2 uppercase">Integrations</h3>
                                <div className="flex flex-wrap gap-3">
                                    <span className="flex items-center gap-1.5 text-xs text-neutral-300"><span>{selectedBusiness.google_refresh_token ? <CheckCircle width={12} className="text-emerald-400" /> : <XCircle width={12} className="text-neutral-600" />}</span> Google Cal</span>
                                    <span className="flex items-center gap-1.5 text-xs text-neutral-300"><span>{selectedBusiness.meta_page_access_token ? <CheckCircle width={12} className="text-emerald-400" /> : <XCircle width={12} className="text-neutral-600" />}</span> FB/IG Messenger</span>
                                    <span className="flex items-center gap-1.5 text-xs text-neutral-300"><span>{selectedBusiness.zapier_webhook_url ? <CheckCircle width={12} className="text-emerald-400" /> : <XCircle width={12} className="text-neutral-600" />}</span> Zapier</span>
                                </div>
                            </div>

                            <div className="bg-white/[0.03] p-4 rounded-lg">
                                <h3 className="text-xs font-bold text-neutral-400 mb-2 uppercase">AI Configuration</h3>
                                <p className="text-xs text-neutral-500 mb-1">Greeting: <span className="text-neutral-300">"{selectedBusiness.greeting_text || 'Default'}"</span></p>
                                <p className="text-xs text-neutral-500 mb-1">Tone: <span className="text-neutral-300">{selectedBusiness.greeting_tone || 'Default'}</span></p>
                                <div className="mt-2 p-2 bg-black/40 rounded border border-white/[0.04] max-h-32 overflow-y-auto">
                                    <p className="text-xs text-neutral-400 whitespace-pre-wrap font-mono">{selectedBusiness.knowledge_base_text || "No knowledge base configured."}</p>
                                </div>
                            </div>

                            <div className="bg-white/[0.03] p-4 rounded-lg">
                                <h3 className="text-xs font-bold text-neutral-400 mb-2 uppercase">Raw Metadata</h3>
                                <pre className="text-xs text-neutral-500 whitespace-pre-wrap font-mono bg-black/40 p-2 rounded border border-white/[0.04] max-h-32 overflow-y-auto">
                                    {JSON.stringify(selectedBusiness.routing_rules || {}, null, 2)}
                                </pre>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => handleExportSingle(selectedBusiness)} className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] text-white text-xs font-medium px-4 py-2 rounded-full hover:bg-white/[0.1] transition-colors">
                                <Download width={12} /> Export JSON
                            </button>
                            <button onClick={() => setSelectedBusiness(null)} className="inline-flex items-center gap-2 bg-white text-black text-xs font-medium px-4 py-2 rounded-full hover:bg-neutral-200 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
import { auth } from "@clerk/nextjs/server";
import { callsCollection } from "@/lib/astra";
import { redirect } from "next/navigation";
import Link from "next/link";
import RequestReviewButton from "../_components/RequestReviewButton";

export const dynamic = 'force-dynamic';

export default async function CallsPage() {
    const { userId } = await auth();
    if (!userId) redirect("/");

    // Fetch the 100 most recent calls
    const calls = await callsCollection
        .find({ business_id: userId })
        .sort({ created_at: -1 })
        .limit(100)
        .toArray();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Call Log</h1>
                    <p className="mt-1 text-sm text-neutral-400">Review all calls handled by your AI receptionist.</p>
                </div>
                <Link href="/dashboard" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
                    ← Back to Dashboard
                </Link>
            </div>

            {/* Call Log Table */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-xl overflow-hidden">
                {calls.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-white/[0.05] mb-3">
                            <svg className="w-6 h-6 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        </div>
                        <p className="text-sm text-neutral-400">No calls yet</p>
                        <p className="text-xs text-neutral-600 mt-1">Your AI is ready and waiting for calls!</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/[0.06] text-neutral-500 text-xs uppercase tracking-wider">
                                    <th className="py-4 px-6 font-medium">Customer</th>
                                    <th className="py-4 px-6 font-medium">Summary</th>
                                    <th className="py-4 px-6 font-medium">Sentiment</th>
                                    <th className="py-4 px-6 font-medium">Duration</th>
                                    <th className="py-4 px-6 font-medium">Date & Time</th>
                                    <th className="py-4 px-6 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {calls.map((call) => {
                                    const callDate = new Date(call.created_at);
                                    const isValidDate = !isNaN(callDate.getTime());
                                    const durationMin = call.call_duration_minutes || Math.ceil((call.call_duration || 0) / 60);

                                    return (
                                        <tr key={call.call_id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                            <td className="py-4 px-6 align-top">
                                                <p className="text-sm font-medium text-white">{call.customer_name || "Unknown"}</p>
                                                <p className="text-xs text-neutral-500">{call.customer_phone || "No number"}</p>
                                            </td>
                                            <td className="py-4 px-6 align-top max-w-md">
                                                <p className="text-sm text-neutral-300">{call.summary || "No summary available"}</p>
                                                <div className="flex gap-2 mt-2">
                                                    {call.lead_quality === "hot" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">🔥 Hot Lead</span>}
                                                    {call.appointment_booked && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">📅 Booked</span>}
                                                    {call.is_emergency && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">🚨 Emergency</span>}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 align-top">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${call.sentiment === "Positive" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                    call.sentiment === "Negative" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                                                        "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                                                    }`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${call.sentiment === "Positive" ? "bg-emerald-400" :
                                                        call.sentiment === "Negative" ? "bg-rose-400" :
                                                            "bg-neutral-500"
                                                        }`} />
                                                    {call.sentiment || "Neutral"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 align-top">
                                                <p className="text-sm text-neutral-300">{durationMin} min</p>
                                            </td>
                                            <td className="py-4 px-6 align-top">
                                                <p className="text-sm text-neutral-300 whitespace-nowrap">
                                                    {isValidDate ? callDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "--"}
                                                </p>
                                                <p className="text-xs text-neutral-500 whitespace-nowrap">
                                                    {isValidDate ? callDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                                                </p>
                                            </td>
                                            <td className="py-4 px-6 align-top">
                                                <RequestReviewButton callId={call.call_id} initialStatus={call.review_status} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
import { auth } from "@clerk/nextjs/server";
import { callsCollection } from "@/lib/astra";
import { redirect } from "next/navigation";
import Link from "next/link";
import CallRow from "../_components/CallRow";
import { findBusinessByUserId } from "@/lib/business";

export const dynamic = 'force-dynamic';

export default async function CallsPage() {
    const { userId } = await auth();
    if (!userId) redirect("/");

    const business = await findBusinessByUserId(userId);
    const isTrial = (business?.plan_type || business?.plan || "standard") === "trial";

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
                    <p className="mt-1 text-sm text-[#A7ADBB]">Review all calls handled by your AI receptionist.</p>
                </div>
                <Link href="/dashboard" className="text-sm font-medium text-[#ff4b00] hover:text-[#ff4b00]">
                    ← Back to Dashboard
                </Link>
            </div>

            {/* Call Log Table */}
            <div className="bg-black border border-white/5 rounded-2xl overflow-hidden">
                {calls.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-black mb-3">
                            <svg className="w-6 h-6 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        </div>
                        <p className="text-sm text-[#A7ADBB]">No calls yet</p>
                        <p className="text-xs text-neutral-600 mt-1">Your AI is ready and waiting for calls!</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 text-[#A7ADBB] text-xs uppercase tracking-wider">
                                    <th className="py-4 px-6 font-medium">Customer</th>
                                    <th className="py-4 px-6 font-medium">Summary</th>
                                    <th className="py-4 px-6 font-medium">Sentiment</th>
                                    <th className="py-4 px-6 font-medium">Duration</th>
                                    <th className="py-4 px-6 font-medium">Date & Time</th>
                                    <th className="py-4 px-6 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {calls.map((call) => (
                                    <CallRow key={call.call_id} call={call} isTrial={isTrial} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
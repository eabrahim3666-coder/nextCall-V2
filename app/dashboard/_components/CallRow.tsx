"use client";

import { useState } from "react";
import JobStatusButtons from "./JobStatusButtons";

type CallRowProps = {
    call: Record<string, any>;
    isTrial: boolean;
};

export default function CallRow({ call, isTrial }: CallRowProps) {
    const [expanded, setExpanded] = useState(false);

    const callDate = new Date(call.created_at);
    const isValidDate = !isNaN(callDate.getTime());
    const durationMin = call.call_duration_minutes || Math.ceil((call.call_duration || 0) / 60);
    const showTranscript = typeof call.transcript === "string" && call.transcript.trim() && call.transcript !== "No transcript available.";
    const showRecording = typeof call.recording_url === "string" && call.recording_url.length > 0;

    return (
        <>
            <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <td className="py-4 px-6 align-top">
                    <p className="text-sm font-medium text-white">{call.customer_name || "Unknown"}</p>
                    <p className="text-xs text-neutral-500">{call.customer_phone || "No number"}</p>
                    {call.channel === "sms" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 inline-block mt-1">SMS</span>
                    )}
                </td>
                <td className="py-4 px-6 align-top max-w-md">
                    <p className="text-sm text-neutral-300">{call.summary || "No summary available"}</p>
                    <div className="flex gap-2 mt-2">
                        {call.lead_quality === "hot" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">🔥 Hot Lead</span>}
                        {call.appointment_booked && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">📅 Booked</span>}
                        {call.is_emergency && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">🚨 Emergency</span>}
                        {call.quote_given && <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">💵 {call.quote_amount || "Quote given"}</span>}
                    </div>
                    {(showTranscript || showRecording) && (
                        <p className="text-[10px] text-neutral-600 mt-2">Click to {expanded ? "collapse" : "view transcript"}{showRecording ? " · replay audio" : ""}</p>
                    )}
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
                <td className="py-4 px-6 align-top" onClick={(e) => e.stopPropagation()}>
                    {!isTrial && call.appointment_booked && (
                        <JobStatusButtons callId={call.call_id} jobStatus={call.job_status} />
                    )}
                </td>
            </tr>
            {expanded && (
                <tr className="border-b border-white/[0.04] bg-white/[0.015]">
                    <td colSpan={6} className="py-4 px-6">
                        {showRecording && (
                            <div className="mb-4">
                                <p className="text-xs font-medium text-neutral-400 mb-2">Recording</p>
                                <audio controls className="w-full max-w-xl h-9" src={call.recording_url} preload="none">Your browser does not support audio playback.</audio>
                            </div>
                        )}
                        {showTranscript ? (
                            <div>
                                <p className="text-xs font-medium text-neutral-400 mb-2">Transcript</p>
                                <div className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-4 max-h-64 overflow-y-auto">
                                    <p className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">{call.transcript}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-neutral-600">No transcript available for this call.</p>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JobStatusButtons({ callId, jobStatus }: { callId: string; jobStatus?: string }) {
    const [loading, setLoading] = useState<string | null>(null);
    const router = useRouter();

    const mark = async (action: "done" | "no_show") => {
        setLoading(action);
        try {
            const res = await fetch("/api/calls/mark-job", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ call_id: callId, action }),
            });
            if (res.ok) {
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to update job status.");
            }
        } catch {
            alert("Network error");
        } finally {
            setLoading(null);
        }
    };

    if (jobStatus === "done" || jobStatus === "auto_done") {
        return (
            <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                ✅ Job Done
            </span>
        );
    }

    if (jobStatus === "no_show") {
        return (
            <span className="text-[10px] px-2 py-1 rounded-full bg-neutral-500/10 text-[#A7ADBB] border border-neutral-500/20 whitespace-nowrap">
                No-show / Skipped
            </span>
        );
    }

    return (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
            <button
                onClick={() => mark("done")}
                disabled={loading !== null}
                className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
                {loading === "done" ? "Marking..." : "Mark Done"}
            </button>
            <button
                onClick={() => mark("no_show")}
                disabled={loading !== null}
                className="text-[10px] px-2 py-1 rounded-full bg-neutral-500/10 text-[#A7ADBB] border border-neutral-500/20 hover:bg-neutral-500/20 transition-colors disabled:opacity-50"
            >
                {loading === "no_show" ? "..." : "No-show"}
            </button>
        </div>
    );
}

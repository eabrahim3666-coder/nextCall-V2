"use client";

import { useState } from "react";

export default function RequestReviewButton({ callId, initialStatus }: { callId: string; initialStatus?: string }) {
    const [status, setStatus] = useState(initialStatus || "");
    const [loading, setLoading] = useState(false);

    const handleRequest = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reviews/trigger-job-done', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ call_id: callId })
            });

            if (res.ok) {
                setStatus("awaiting_owner_reply");
            } else {
                const data = await res.json();
                alert(data.error || "Failed to trigger review request.");
            }
        } catch {
            alert("Network error");
        } finally {
            setLoading(false);
        }
    };

    if (status === "awaiting_owner_reply" || status === "link_sent") {
        return (
            <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                ✓ Review Requested
            </span>
        );
    }

    return (
        <button
            onClick={handleRequest}
            disabled={loading}
            className="text-[10px] px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors whitespace-nowrap disabled:opacity-50"
        >
            {loading ? "Sending..." : "Request Review"}
        </button>
    );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ActionName = "resolve" | "dismiss" | "requires_action" | "retry";

const ACTION_LABEL: Record<ActionName, string> = {
  resolve: "Mark resolved",
  dismiss: "Dismiss",
  requires_action: "Needs action",
  retry: "Retry now",
};

export default function IncidentActionPanel({
  incidentId,
  status,
  recommendableActions,
}: {
  incidentId: string;
  status: string;
  recommendableActions: { id: string; description: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function runAction(action: ActionName) {
    if (submitting) return;
    setSubmitting(true);
    setBusy(action);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/incidents/${encodeURIComponent(incidentId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setResult({ ok: true, message: `${ACTION_LABEL[action]} applied.` });
        router.refresh();
      } else {
        setResult({ ok: false, message: data.error || "Request failed." });
      }
    } catch {
      setResult({ ok: false, message: "Network error." });
    } finally {
      setSubmitting(false);
      setBusy(null);
    }
  }

  const actionable = status === "OPEN" || status === "RECOVERING" || status === "REQUIRES_ACTION";
  const needsToken = status === "REQUIRES_ACTION";

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3">
      <div className="text-xs font-semibold text-neutral-300">Admin actions</div>

      {needsToken && (
        <p className="text-[11px] text-amber-300/90 border border-amber-500/20 bg-amber-500/5 rounded-lg px-3 py-2">
          This incident is marked “needs action”. Resolve the underlying issue, then retry or resolve it here.
        </p>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note for the timeline (e.g. what you fixed)…"
        rows={2}
        className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500/50 placeholder:text-neutral-600 resize-none"
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => runAction("retry")}
          disabled={!actionable || submitting}
          className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg px-3.5 py-2 transition-colors"
        >
          {busy === "retry" ? "Retrying…" : "Retry now"}
        </button>
        <button
          onClick={() => runAction("resolve")}
          disabled={!actionable || submitting}
          className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-xs font-medium rounded-lg px-3.5 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy === "resolve" ? "Applying…" : "Mark resolved"}
        </button>
        <button
          onClick={() => runAction("dismiss")}
          disabled={!actionable || submitting}
          className="bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-medium rounded-lg px-3.5 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy === "dismiss" ? "Applying…" : "Dismiss"}
        </button>
        <button
          onClick={() => runAction("requires_action")}
          disabled={status === "REQUIRES_ACTION" || submitting}
          className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-medium rounded-lg px-3.5 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy === "requires_action" ? "Applying…" : "Needs action"}
        </button>
      </div>

      {recommendableActions.length > 0 && (
        <div className="pt-1">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">Registered recovery actions for this operation (policy-checked on execution)</div>
          <ul className="space-y-1">
            {recommendableActions.map((a) => (
              <li key={a.id} className="text-[11px] text-neutral-400 flex items-start gap-1.5">
                <span className="font-mono text-indigo-400">{a.id}</span>
                <span className="text-neutral-500">— {a.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div
          className={`text-[11px] rounded-lg px-3 py-2 border ${
            result.ok
              ? "text-emerald-300 border-emerald-500/20 bg-emerald-500/5"
              : "text-rose-300 border-rose-500/20 bg-rose-500/5"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
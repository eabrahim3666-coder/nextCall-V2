import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { incidentsStore } from "@/lib/recovery/incidents-store";
import { getRecommendableActions } from "@/lib/recovery/registry";
import IncidentActionPanel from "../_components/IncidentActionPanel";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const badge: Record<string, string> = {
  OPEN: "bg-amber-500/10 border-amber-500/20 text-amber-300",
  RECOVERING: "bg-blue-500/10 border-blue-500/20 text-blue-300",
  REQUIRES_ACTION: "bg-rose-500/10 border-rose-500/20 text-rose-300",
  RECOVERED: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
  RESOLVED: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
  DISMISSED: "bg-white/5 border-white/10 text-neutral-400",
  CRITICAL: "bg-rose-500/10 border-rose-500/20 text-rose-300",
  HIGH: "bg-orange-500/10 border-orange-500/20 text-orange-300",
  MEDIUM: "bg-amber-500/10 border-amber-500/20 text-amber-300",
  LOW: "bg-white/5 border-white/10 text-neutral-500",
};

function Row({ k, v, isLast }: { k: string; v: string; isLast?: boolean }) {
  return (
    <div className={`grid grid-cols-[140px_1fr] gap-3 py-2 border-b border-white/[0.04] ${isLast ? "!border-b-0" : ""}`}>
      <div className="text-[11px] text-neutral-500 uppercase tracking-wider">{k}</div>
      <div className="text-xs text-neutral-300 font-mono break-all">{v || "—"}</div>
    </div>
  );
}

export default async function AdminIncidentDetailPage({ params }: Params) {
  await requireAdmin();
  const { id } = await params;

  const incident =
    (await incidentsStore.findOne({ _id: id })) ||
    (await incidentsStore.findOne({ fingerprint: id }));
  if (!incident) notFound();

  const recommendableActions = getRecommendableActions(incident.provider, incident.operation);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/incidents" className="text-xs text-neutral-400 hover:text-white transition-colors border border-white/10 rounded-lg px-3 py-1.5">
            ← Incidents
          </Link>
          <h1 className="text-lg font-bold text-white font-mono">
            <span className="text-indigo-400">{incident.provider}</span>
            <span className="text-neutral-600"> / </span>
            {incident.operation}
          </h1>
        </div>
        <span className={`inline-block px-2.5 py-1 rounded-full border text-[11px] font-medium ${badge[incident.status] || badge.DISMISSED}`}>
          {incident.status}
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${badge[incident.severity] || badge.LOW}`}>{incident.severity}</span>
              {incident.failureKind === "BUSINESS" && (
                <span className="px-2 py-0.5 rounded-full border border-sky-500/20 text-[10px] font-medium text-sky-300">BUSINESS</span>
              )}
              <span className="px-2 py-0.5 rounded-full border border-white/10 text-[10px] text-neutral-400">occurrences: {incident.occurrenceCount ?? 1}</span>
              <span className="px-2 py-0.5 rounded-full border border-white/10 text-[10px] text-neutral-400">retries: {incident.retryCount ?? 0}</span>
              <span className="px-2 py-0.5 rounded-full border border-white/10 text-[10px] text-neutral-400">classification: {incident.aiClassification || incident.errorCode || "n/a"}</span>
              {incident.aiDiagnosisSkipped && (
                <span className="px-2 py-0.5 rounded-full border border-amber-500/20 text-[10px] font-medium text-amber-300">
                  AI skipped ({incident.aiDiagnosisSkipReason === "budget_exhausted" ? "budget" : "disabled"})
                </span>
              )}
              {incident.aiDiagnosisCached && (
                <span className="px-2 py-0.5 rounded-full border border-indigo-500/20 text-[10px] font-medium text-indigo-300">AI from cache</span>
              )}
            </div>

            <div className="text-sm font-medium text-neutral-200 mb-3">Error message</div>
            <pre className="text-xs text-neutral-300 font-mono bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-3 whitespace-pre-wrap break-all">
              {incident.errorMessage || "—"}
            </pre>

            {incident.errorCode && (
              <>
                <div className="text-sm font-medium text-neutral-200 mt-4 mb-3">Error code</div>
                <pre className="text-xs text-neutral-300 font-mono bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-3 whitespace-pre-wrap break-all">
                  {incident.errorCode}
                </pre>
              </>
            )}

            {incident.sanitizedStack && (
              <>
                <div className="text-sm font-medium text-neutral-200 mt-4 mb-3">Stack trace (redacted)</div>
                <pre className="text-xs text-neutral-400 font-mono bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-3 whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                  {incident.sanitizedStack}
                </pre>
              </>
            )}
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-neutral-200">AI diagnosis <span className="text-[10px] uppercase tracking-wider text-amber-300/80 ml-1">— advisory only</span></div>
              {incident.aiConfidence != null && (
                <span className="text-[11px] text-neutral-400">
                  confidence <span className="text-neutral-200 font-mono">{Math.round(incident.aiConfidence * 100)}%</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 mb-3">
              GPT only recommends a recovery action; the backend policy engine decides whether anything actually runs. This section never executes anything.
            </p>
            {incident.aiDiagnosisSkipped && (
              <div className="mb-3 text-[11px] text-amber-300/90 border border-amber-500/20 bg-amber-500/5 rounded-lg px-3 py-2">
                AI diagnosis was skipped — {incident.aiDiagnosisSkipReason === "budget_exhausted" ? "the per-fingerprint diagnosis budget was exhausted." : "AI diagnosis is disabled."} Incident handling was not affected.
              </div>
            )}
            {incident.aiDiagnosisCached && (
              <div className="mb-3 text-[11px] text-indigo-300/80 border border-indigo-500/20 bg-indigo-500/5 rounded-lg px-3 py-2">
                The diagnosis below was served from the diagnosis cache (advisory; re-validated by the policy engine at use time).
              </div>
            )}
            {incident.aiRootCause || incident.aiRecommendation ? (
              <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-3">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Root cause</div>
                  <div className="text-xs text-neutral-300">{incident.aiRootCause || "—"}</div>
                </div>
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-3">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Recommendation</div>
                  <div className="text-xs text-neutral-300">{incident.aiRecommendation || "—"}</div>
                  {incident.aiClassification && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-full border border-indigo-500/20 text-[10px] font-mono text-indigo-300">{incident.aiClassification}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-500">No AI diagnosis recorded (deterministic only).</div>
            )}
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
            <div className="text-sm font-medium text-neutral-200 mb-1">Policy evaluation — audit trail</div>
            <p className="text-[11px] text-neutral-500 mb-3">
              Every recovery action candidate was re-validated by the backend policy engine. These records are persisted with the incident.
            </p>
            {(!incident.policyEvaluations || incident.policyEvaluations.length === 0) && (
              <div className="text-xs text-neutral-500">No policy evaluations recorded for this incident.</div>
            )}
            <div className="space-y-3">
              {(incident.policyEvaluations || []).slice().reverse().map((pe, i) => (
                <div key={i} className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-mono text-[11px] text-indigo-300">{pe.actionId}</span>
                    {pe.allowed ? (
                      <span className="text-[10px] text-emerald-300 border border-emerald-500/20 bg-emerald-500/5 rounded-full px-2 py-0.5">ALLOWED</span>
                    ) : (
                      <span className="text-[10px] text-rose-300 border border-rose-500/20 bg-rose-500/5 rounded-full px-2 py-0.5">BLOCKED</span>
                    )}
                  </div>
                  {pe.reason && <div className="text-[11px] text-neutral-400 mt-1.5">{pe.reason}</div>}
                  <ul className="mt-2 space-y-0.5">
                    {(pe.checks || []).map((c) => (
                      <li key={c.name} className="text-[10px] flex items-start gap-1.5 font-mono">
                        <span className={c.passed ? "text-emerald-400/80" : "text-rose-400/80"}>
                          {c.passed ? "✓" : "✗"}
                        </span>
                        <span className="text-neutral-400">{c.name}</span>
                        {!c.passed && c.reason && <span className="text-neutral-600">— {c.reason}</span>}
                      </li>
                    ))}
                  </ul>
                  <div className="text-[10px] text-neutral-600 mt-1.5">
                    {pe.at ? new Date(pe.at).toLocaleString() : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
            <div className="text-sm font-medium text-neutral-200 mb-3">Incident context</div>
            <div className="grid md:grid-cols-2 gap-x-8">
              <Row k="Fingerprint" v={incident.fingerprint || ""} />
              <Row k="Business ID" v={incident.businessId || ""} />
              <Row k="First seen" v={incident.firstSeen ? new Date(incident.firstSeen).toLocaleString() : ""} />
              <Row k="Last seen" v={incident.lastSeen ? new Date(incident.lastSeen).toLocaleString() : ""} />
              <Row k="Resolved at" v={incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : ""} />
              <Row k="Resolved by" v={incident.resolvedBy || ""} />
              <Row k="Recovery" v={incident.recoveryAttempted ? `${incident.recoveryAction || "attempted"} → ${incident.recoveryResult || "done"}` : "none"} />
              <Row k="Recovery note" v={incident.resolutionNote || ""} />
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
            <div className="text-sm font-medium text-neutral-200 mb-3">Timeline</div>
            {(!incident.timeline || incident.timeline.length === 0) && (
              <div className="text-xs text-neutral-500">No timeline entries.</div>
            )}
            <div className="space-y-0">
              {(incident.timeline || []).map((t, i) => (
                <div key={i} className={`relative pl-5 pb-4 ${i === (incident.timeline || []).length - 1 ? "pb-0" : ""}`}>
                  <div className="absolute left-1 top-1.5 h-2 w-2 rounded-full bg-indigo-500/60" />
                  {i < (incident.timeline || []).length - 1 && (
                    <div className="absolute left-[7px] top-4 bottom-0 w-px bg-white/[0.06]" />
                  )}
                  <div className="text-[11px] text-neutral-300">{t.detail || t.type}</div>
                  <div className="text-[10px] text-neutral-600 mt-0.5">
                    {t.at ? new Date(t.at).toLocaleString() : ""}
                    {t.type === "admin_action" && t.by ? ` · by ${t.by}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <IncidentActionPanel
            incidentId={String(incident._id || incident.fingerprint)}
            status={incident.status}
            recommendableActions={recommendableActions.map((a) => ({ id: a.id, description: a.description }))}
          />
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
            <div className="text-xs font-semibold text-neutral-300 mb-3">Internal</div>
            <Row k="operation" v={incident.operation || ""} />
            <Row k="provider" v={incident.provider || ""} />
            <Row k="retryCount" v={String(incident.retryCount ?? 0)} />
            <Row k="stackTraceLen" v={incident.sanitizedStack ? String(incident.sanitizedStack.length) : "0"} isLast />
          </div>
        </div>
      </div>
    </div>
  );
}
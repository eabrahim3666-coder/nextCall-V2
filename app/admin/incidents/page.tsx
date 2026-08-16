import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { queryIncidents, incidentStats } from "@/lib/recovery/incidents-store";
import type { Incident } from "@/lib/recovery/types";

export const dynamic = "force-dynamic";

const PROVIDERS = ["twilio", "google", "openai", "resend", "retell", "clerk", "paddle", "astra", "telegram", "pusher"];
const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const STATUSES = ["OPEN", "RECOVERING", "REQUIRES_ACTION", "RECOVERED", "RESOLVED", "DISMISSED"];

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

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

function Chips({ value, options, param }: { value: string; options: string[]; param: string }) {
  return (
    <select
      name={param}
      defaultValue={value || ""}
      className="bg-[#0a0a0a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500/50"
    >
      <option value="">All</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export default async function AdminIncidentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const provider = first(sp.provider);
  const severity = first(sp.severity);
  const status = first(sp.status);
  const q = first(sp.q);
  const from = first(sp.from);
  const to = first(sp.to);

  const [incidents, stats] = await Promise.all([
    queryIncidents({ provider, severity, status, q, from, to }),
    incidentStats(),
  ]);

  const statCards = [
    { label: "Open incidents", value: stats.open, accent: "text-amber-300" },
    { label: "Need action", value: stats.requiresAction, accent: "text-rose-300" },
    { label: "Critical / High", value: stats.critical, accent: "text-rose-300" },
    { label: "Recovered", value: stats.recovered, accent: "text-emerald-300" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Incidents</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Error recovery events captured by the recovery engine. Filters below; click an incident for details and actions.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-xs text-neutral-400 hover:text-white transition-colors border border-white/10 rounded-lg px-3 py-1.5"
        >
          ← Admin home
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((c) => (
          <div key={c.label} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
            <div className={`text-2xl font-bold ${c.accent}`}>{c.value}</div>
            <div className="text-[11px] text-neutral-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <form method="get" className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-neutral-500">Provider</label>
          <Chips value={provider || ""} options={PROVIDERS} param="provider" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-neutral-500">Severity</label>
          <Chips value={severity || ""} options={SEVERITIES} param="severity" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-neutral-500">Status</label>
          <Chips value={status || ""} options={STATUSES} param="status" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-neutral-500">Search</label>
          <input
            name="q"
            defaultValue={q || ""}
            placeholder="message, operation, provider…"
            className="bg-[#0a0a0a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 w-52 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-neutral-500">From</label>
          <input type="date" name="from" defaultValue={from || ""} className="bg-[#0a0a0a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500/50" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-neutral-500">To</label>
          <input type="date" name="to" defaultValue={to || ""} className="bg-[#0a0a0a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500/50" />
        </div>
        <button type="submit" className="bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-medium rounded-lg px-4 py-1.5 transition-colors">
          Apply
        </button>
        <Link
          href="/admin/incidents"
          className="text-xs text-neutral-400 hover:text-white transition-colors border border-white/10 rounded-lg px-3 py-1.5"
        >
          Clear
        </Link>
      </form>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-3">Incident</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Occurrences</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3">Recovery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {incidents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                    No incidents match the current filters.
                  </td>
                </tr>
              )}
              {incidents.map((inc: Incident) => (
                <tr key={String(inc._id || inc.fingerprint)} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/incidents/${encodeURIComponent(String(inc._id || inc.fingerprint))}`} className="block text-neutral-200 hover:text-indigo-300 transition-colors">
                      <span className="font-mono text-indigo-400/80">{inc.provider}</span>{" "}
                      <span className="font-mono">{inc.operation}</span>
                      {inc.errorCode && <span className="ml-1.5 text-[10px] text-neutral-500">· code {inc.errorCode}</span>}
                    </Link>
                    <div className="text-[11px] text-neutral-500 mt-0.5 max-w-md truncate">
                      {inc.errorMessage || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-400 whitespace-nowrap">
                    {inc.businessId ? <span className="font-mono text-[11px]">{inc.businessId}</span> : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-medium ${badge[inc.severity] || badge.LOW}`}>
                        {inc.severity}
                      </span>
                      {inc.failureKind === "BUSINESS" && (
                        <span className="inline-block px-2 py-0.5 rounded-full border border-sky-500/20 text-[10px] font-medium text-sky-300">
                          BUSINESS
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-medium ${badge[inc.status] || badge.DISMISSED}`}>
                      {inc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{inc.occurrenceCount ?? 1}</td>
                  <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">
                    {inc.lastSeen ? new Date(inc.lastSeen).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {inc.recoveryAttempted ? (
                      <span className="text-[11px] text-emerald-300">
                        {inc.recoveryAction || "attempted"} → {inc.recoveryResult || "done"}
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-600">none</span>
                    )}
                    {inc.aiDiagnosisSkipped && (
                      <span className="block text-[10px] text-amber-300/80 mt-0.5">
                        AI diagnosis skipped ({inc.aiDiagnosisSkipReason === "budget_exhausted" ? "budget" : "disabled"})
                      </span>
                    )}
                    {inc.aiDiagnosisCached && (
                      <span className="block text-[10px] text-indigo-300/70 mt-0.5">AI diagnosis from cache</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
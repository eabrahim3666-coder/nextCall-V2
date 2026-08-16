import { Incident, IncidentStore, IncidentStatus, FailureKind, PolicyEvaluation } from "./types";
import { computeFingerprint, buildIncident } from "./incidents-core";
import { NormalizedError } from "./types";
import { ClusterableError } from "./types";

/**
 * Astra-backed incident persistence.
 *
 * Collection: `incidents`. Lazy-created following the repo convention
 * (sms_compliance / chat_photos pattern). Uses the project's MongoDB-style
 * Data API (`lib/astra.ts`). Never stores secrets (callers pass redacted
 * payloads; buildIncident redacts context again defensively).
 */

type IncidentPatch = Partial<Incident>;

type IncidentAiInput = {
  classification?: NormalizedError["category"];
  severity?: NormalizedError["severity"];
  rootCause?: string;
  recommendation?: string;
  confidence?: number;
};

/** Bounded, newest-last merge of policy evaluations (audit trail, H6). */
function mergePolicyEvaluations(
  existing: PolicyEvaluation[] | undefined,
  incoming: PolicyEvaluation[] | undefined
): PolicyEvaluation[] | undefined {
  if (!incoming || incoming.length === 0) return existing;
  const merged = [...(existing || []), ...incoming].slice(-10);
  return merged;
}

async function ensureCollection(): Promise<void> {
  try {
    const { incidentsCollection } = await import("@/lib/astra");
    await incidentsCollection.findOne({ fingerprint: "" });
  } catch (err: unknown) {
    const msg = (err as Error)?.message || "";
    if (/does not exist|collection|COLLECTION/i.test(msg)) {
      try {
        const db = (await import("@/lib/astra")).default;
        await db.createCollection("incidents");
        const { incidentsCollection } = await import("@/lib/astra");
        await incidentsCollection.findOne({ fingerprint: "" });
      } catch (createErr) {
        console.error("[recovery/incidents] could not create incidents collection:", createErr);
      }
    } else {
      console.error("[recovery/incidents] ensure collection failed:", err);
    }
  }
}

async function getCollection() {
  const { incidentsCollection } = await import("@/lib/astra");
  return incidentsCollection;
}

export const incidentsStore: IncidentStore = {
  async findOne(filter) {
    try {
      const col = await getCollection();
      const doc = await col.findOne(filter);
      return (doc as Incident | null) ?? null;
    } catch {
      return null;
    }
  },

  async find(filter, opts) {
    try {
      await ensureCollection();
      const col = await getCollection();
      let query = col.find(filter);
      if (opts?.sort) query = query.sort(opts.sort as never);
      if (opts?.limit) query = query.limit(opts.limit);
      const docs = await query.toArray();
      return docs as unknown as Incident[];
    } catch (err) {
      console.error("[recovery/incidents] find failed:", err);
      return [];
    }
  },

  async insertOne(doc) {
    try {
      await ensureCollection();
      const col = await getCollection();
      await col.insertOne(doc as never);
    } catch (err) {
      console.error("[recovery/incidents] insertOne failed:", err);
    }
  },

  async updateOne(filter, update) {
    try {
      await ensureCollection();
      const col = await getCollection();
      const result = await col.updateOne(filter, update as never);
      return { matchedCount: result.matchedCount ?? 0 };
    } catch (err) {
      console.error("[recovery/incidents] updateOne failed:", err);
      return { matchedCount: 0 };
    }
  },

  async count(filter) {
    try {
      await ensureCollection();
      const col = await getCollection();
      return await col.countDocuments(filter as never, 10000);
    } catch {
      return 0;
    }
  },
};

/**
 * Serialize create-vs-aggregate decisions per fingerprint so two concurrent
 * occurrences of the same failure cannot race a findOne → double insert.
 * Process-local; cross-instance safety comes from incident aggregation being
 * idempotent at read time (the effective incident is re-read after insert).
 */
const inflightRecords = new Map<string, Promise<Incident | null>>();

/**
 * Record an error occurrence as an incident (create or aggregate).
 * Returns the effective incident after the write.
 */
export async function recordIncident(input: {
  error: NormalizedError;
  context: Record<string, unknown>;
  retryCount: number;
  recovery?: { attempted: boolean; action?: string; result?: string };
  status?: IncidentStatus;
  ai?: IncidentAiInput;
  aiFlags?: { skipped?: boolean; skipReason?: "budget_exhausted" | "disabled"; cached?: boolean };
  policyEvaluations?: PolicyEvaluation[];
  failureKind?: FailureKind;
  fingerprintOverride?: ClusterableError;
  timeline?: Incident["timeline"];
  store?: IncidentStore;
}): Promise<Incident | null> {
  const fingerprint = input.fingerprintOverride
    ? computeFingerprint(input.fingerprintOverride)
    : computeFingerprint({
        provider: input.error.provider,
        operation: input.error.operation,
        errorCode: input.error.errorCode,
        httpStatus: input.error.httpStatus,
        message: input.error.message,
        businessId: input.error.businessId,
      });

  const prior = inflightRecords.get(fingerprint);
  const run = (prior || Promise.resolve()).then(() => recordIncidentInner({ ...input, fingerprint }));
  inflightRecords.set(fingerprint, run);
  try {
    return await run;
  } finally {
    if (inflightRecords.get(fingerprint) === run) inflightRecords.delete(fingerprint);
  }
}

async function recordIncidentInner(input: {
  error: NormalizedError;
  context: Record<string, unknown>;
  retryCount: number;
  recovery?: { attempted: boolean; action?: string; result?: string };
  status?: IncidentStatus;
  ai?: IncidentAiInput;
  aiFlags?: { skipped?: boolean; skipReason?: "budget_exhausted" | "disabled"; cached?: boolean };
  policyEvaluations?: PolicyEvaluation[];
  failureKind?: FailureKind;
  fingerprintOverride?: ClusterableError;
  timeline?: Incident["timeline"];
  store?: IncidentStore;
  fingerprint: string;
}): Promise<Incident | null> {
  const store = input.store || incidentsStore;
  const existing = await store.findOne({ fingerprint: input.fingerprint });

  if (existing && (existing.status === "OPEN" || existing.status === "RECOVERING" || existing.status === "REQUIRES_ACTION")) {
    const { aggregateIncident, appendTimeline } = await import("./incidents-core");
    const patch = aggregateIncident(existing, input.error);
    // Mirror buildIncident's status derivation: an occurrence that already
    // attempted recovery must merge the incident up to REQUIRES_ACTION, even
    // when racing a recovery-less occurrence (concurrency H5).
    const effectiveStatus =
      input.status ||
      (input.recovery?.attempted ? ("REQUIRES_ACTION" as IncidentStatus) : undefined);
    if (effectiveStatus && effectiveStatus !== existing.status) {
      patch.status = effectiveStatus;
      patch.timeline = appendTimeline({ ...existing, timeline: patch.timeline || existing.timeline }, {
        type: "incident_updated",
        detail: `Status → ${effectiveStatus}`,
      });
    }
    if (input.timeline && input.timeline.length > 0) {
      let timeline = existing.timeline;
      for (const event of input.timeline) {
        timeline = appendTimeline({ ...existing, timeline }, event);
      }
      patch.timeline = timeline;
    }
    const evaluations = mergePolicyEvaluations(existing.policyEvaluations, input.policyEvaluations);
    if (evaluations) patch.policyEvaluations = evaluations;
    if (input.aiFlags?.skipped !== undefined) patch.aiDiagnosisSkipped = input.aiFlags.skipped;
    if (input.aiFlags?.skipReason) patch.aiDiagnosisSkipReason = input.aiFlags.skipReason;
    if (input.aiFlags?.cached !== undefined) patch.aiDiagnosisCached = input.aiFlags.cached;
    if (input.failureKind) patch.failureKind = input.failureKind;
    await store.updateOne(
      { fingerprint: input.fingerprint },
      { $set: patch }
    );
    return { ...existing, ...patch };
  }

  const incident = buildIncident({
    fingerprint: input.fingerprint,
    error: input.error,
    ai: input.ai,
    context: input.context,
    retryCount: input.retryCount,
    recovery: input.recovery,
    status: input.status,
    timeline: input.timeline,
    aiFlags: input.aiFlags,
    policyEvaluations: input.policyEvaluations,
    failureKind: input.failureKind,
  });
  await store.insertOne(incident);
  const created = await store.findOne({ fingerprint: input.fingerprint });
  return created || incident;
}

/** Admin transitions on an existing incident. */
export async function transitionIncident(
  store: IncidentStore,
  fingerprintOrId: string,
  status: IncidentStatus,
  opts: { by?: string; note?: string; resolvedAt?: string }
): Promise<Incident | null> {
  const existing =
    (await store.findOne({ fingerprint: fingerprintOrId })) ||
    (await store.findOne({ _id: fingerprintOrId }));
  if (!existing) return null;

  const { appendTimeline } = await import("./incidents-core");
  const now = opts.resolvedAt || new Date().toISOString();
  const patch: IncidentPatch = {
    status,
    updatedAt: now,
    timeline: appendTimeline(existing, {
      type: "admin_action",
      detail: `Status → ${status}${opts.note ? `. Note: ${opts.note.slice(0, 300)}` : ""}`,
      by: opts.by,
    }),
  };
  if (status === "RESOLVED" || status === "RECOVERED") {
    patch.resolvedAt = now;
    patch.resolvedBy = opts.by;
    patch.resolutionNote = opts.note?.slice(0, 1000);
  }
  if (status === "DISMISSED") {
    patch.resolvedAt = now;
    patch.resolvedBy = opts.by;
    patch.resolutionNote = opts.note?.slice(0, 1000);
  }
  await store.updateOne({ _id: existing._id }, { $set: patch });
  return { ...existing, ...patch };
}

export function isIncidentTerminal(status: IncidentStatus): boolean {
  return status === "RESOLVED" || status === "DISMISSED" || status === "RECOVERED";
}

// ---------------------------------------------------------------------------
// Admin query helpers
// ---------------------------------------------------------------------------

export type IncidentFilters = {
  provider?: string;
  severity?: string;
  status?: string;
  operation?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
};

function matchesQ(incident: Incident, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    incident.errorMessage?.toLowerCase().includes(needle) ||
    incident.operation?.toLowerCase().includes(needle) ||
    incident.provider?.toLowerCase().includes(needle) ||
    incident.fingerprint?.toLowerCase().includes(needle) ||
    incident.errorCode?.toLowerCase().includes(needle) ||
    incident.aiRootCause?.toLowerCase().includes(needle) ||
    false
  );
}

function matchesDates(incident: Incident, from?: string, to?: string): boolean {
  if (from && incident.createdAt < from) return false;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (incident.createdAt > end.toISOString()) return false;
  }
  return true;
}

export async function queryIncidents(
  filters: IncidentFilters = {},
  store: IncidentStore = incidentsStore
): Promise<Incident[]> {
  const dbFilter: Record<string, unknown> = {};
  if (filters.provider) dbFilter.provider = filters.provider;
  if (filters.severity) dbFilter.severity = filters.severity;
  if (filters.status) dbFilter.status = filters.status;
  if (filters.operation) dbFilter.operation = filters.operation;

  let incidents = await store.find(dbFilter, {
    sort: { createdAt: -1 },
    limit: Math.min(filters.limit || 300, 500),
  });

  if (filters.q) {
    const needle = filters.q.toLowerCase();
    incidents = incidents.filter(
      (i) =>
        matchesQ(i, needle) ||
        i.timeline?.some((t) => t.detail?.toLowerCase().includes(needle))
    );
  }
  if (filters.from || filters.to) {
    incidents = incidents.filter((i) => matchesDates(i, filters.from, filters.to));
  }
  return incidents;
}

export async function incidentStats(
  store: IncidentStore = incidentsStore
): Promise<{
  open: number;
  requiresAction: number;
  recovered: number;
  critical: number;
  total: number;
}> {
  const active = await store.find(
    { status: { $in: ["OPEN", "RECOVERING", "REQUIRES_ACTION"] } },
    { sort: { createdAt: -1 }, limit: 500 }
  );
  const critical = active.filter(
    (i) => i.severity === "CRITICAL" || i.severity === "HIGH"
  ).length;
  const requiresAction = active.filter((i) => i.status === "REQUIRES_ACTION").length;
  const recoveredDocs = await store.find(
    { status: { $in: ["RECOVERED", "RESOLVED", "DISMISSED"] } },
    { sort: { createdAt: -1 }, limit: 500 }
  );
  return {
    open: active.length,
    requiresAction,
    recovered: recoveredDocs.length,
    critical,
    total: active.length + recoveredDocs.length,
  };
}
import { createHash } from "crypto";
import { redactObject } from "./redaction";
import {
  ClusterableError,
  FailureKind,
  Incident,
  INCIDENT_ACTIVE_STATUSES,
  INCIDENT_TERMINAL_STATUSES,
  IncidentStatus,
  NormalizedError,
  PolicyEvaluation,
  TimelineEvent,
} from "./types";

/**
 * Pure incident logic (no I/O): fingerprinting, aggregation decisions, status
 * transitions and sanitized incident construction. Kept DB-free so it can be
 * unit tested without Astra.
 */

export function normalizeMessageForFingerprint(message: string): string {
  // Strip numbers, sids and long hex blobs so harmless variance in provider
  // messages doesn't split one incident into many.
  return message
    .replace(/\b[a-f0-9]{32}\b/gi, "")
    .replace(/\b\d{6,}\b/g, "")
    .replace(/[\s\n\r]+/g, " ")
    .trim()
    .slice(0, 400)
    .toLowerCase();
}

export function computeFingerprint(err: ClusterableError): string {
  const message = normalizeMessageForFingerprint(err.message || "");
  const parts = [
    err.provider || "unknown",
    err.operation,
    err.errorCode || String(err.httpStatus || "no-status"),
    err.businessId || "-",
    message || "-",
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export function shouldAggregate(
  existing: Incident | null,
  statuses: IncidentStatus[] = INCIDENT_ACTIVE_STATUSES
): boolean {
  if (!existing) return false;
  return statuses.includes(existing.status);
}

export function buildIncident(input: {
  fingerprint: string;
  error: NormalizedError;
  ai?: {
    classification?: NormalizedError["category"];
    severity?: NormalizedError["severity"];
    rootCause?: string;
    recommendation?: string;
    confidence?: number;
  } | null;
  context: Record<string, unknown>;
  retryCount: number;
  recovery?: {
    attempted: boolean;
    action?: string;
    result?: string;
  };
  status?: IncidentStatus;
  timeline?: TimelineEvent[];
  aiFlags?: {
    skipped?: boolean;
    skipReason?: "budget_exhausted" | "disabled";
    cached?: boolean;
  };
  policyEvaluations?: PolicyEvaluation[];
  failureKind?: FailureKind;
}): Incident {
  const now = new Date().toISOString();
  const status = input.status || (input.recovery?.attempted ? "REQUIRES_ACTION" : "OPEN");
  return {
    fingerprint: input.fingerprint,
    provider: input.error.provider,
    operation: input.error.operation,
    businessId: input.error.businessId,
    userId: input.error.userId,
    severity: input.ai?.severity || input.error.severity,
    status,
    errorCode: input.error.errorCode,
    httpStatus: input.error.httpStatus,
    errorMessage: input.error.message,
    aiClassification: input.ai?.classification,
    aiRootCause: input.ai?.rootCause,
    aiRecommendation: input.ai?.recommendation,
    aiConfidence: input.ai?.confidence,
    aiDiagnosisSkipped: input.aiFlags?.skipped,
    aiDiagnosisSkipReason: input.aiFlags?.skipReason,
    aiDiagnosisCached: input.aiFlags?.cached,
    failureKind: input.failureKind,
    policyEvaluations: input.policyEvaluations,
    recoveryAttempted: input.recovery?.attempted ?? false,
    recoveryAction: input.recovery?.action,
    recoveryResult: input.recovery?.result,
    retryCount: input.retryCount,
    occurrenceCount: 1,
    context: redactObject(input.context),
    sanitizedStack: input.error.sanitizedStack,
    providerRequestId: input.error.providerRequestId,
    createdAt: now,
    updatedAt: now,
    firstSeen: now,
    lastSeen: now,
    resolvedAt: undefined,
    resolvedBy: undefined,
    resolutionNote: undefined,
    timeline: input.timeline || [
      { at: now, type: "incident_created", detail: input.error.message.slice(0, 300) },
    ],
  };
}

export function appendTimeline(
  incident: Incident,
  event: Omit<TimelineEvent, "at">
): TimelineEvent[] {
  return [
    ...(incident.timeline || []).slice(-49),
    { ...event, at: new Date().toISOString() },
  ];
}

export function aggregateIncident(
  existing: Incident,
  error: NormalizedError
): Partial<Incident> {
  const now = new Date().toISOString();
  return {
    occurrenceCount: (existing.occurrenceCount || 1) + 1,
    lastSeen: now,
    updatedAt: now,
    retryCount: error.metadata?.retryCount !== undefined
      ? Number(error.metadata.retryCount)
      : existing.retryCount,
    timeline: appendTimeline(existing, {
      type: "incident_updated",
      detail: `Occurred again (${(existing.occurrenceCount || 1) + 1}). ${error.message.slice(0, 200)}`,
    }),
  };
}

export function toTerminalStatus(status: IncidentStatus): boolean {
  return INCIDENT_TERMINAL_STATUSES.includes(status);
}

export function isActiveStatus(status: IncidentStatus): boolean {
  return INCIDENT_ACTIVE_STATUSES.includes(status);
}
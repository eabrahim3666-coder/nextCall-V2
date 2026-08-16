export type Provider =
  | "twilio"
  | "google"
  | "paddle"
  | "retell"
  | "openai"
  | "clerk"
  | "astra"
  | "resend"
  | "telegram"
  | "meta"
  | "pusher"
  | "unknown";

export type ErrorCategory =
  | "RATE_LIMIT"
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "TIMEOUT"
  | "NETWORK"
  | "SERVER_ERROR"
  | "VALIDATION"
  | "DUPLICATE"
  | "NOT_FOUND"
  | "UNKNOWN";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type IncidentStatus =
  | "OPEN"
  | "RECOVERING"
  | "RECOVERED"
  | "REQUIRES_ACTION"
  | "RESOLVED"
  | "DISMISSED";

/**
 * Normalized, redacted error representation produced by the recovery system.
 *
 * `businessFailure` distinguishes provider rejections of an otherwise
 * technically-successful request (HTTP 2xx but REJECTED / malformed / missing
 * fields) from technical failures (exceptions, non-2xx, timeouts). Business
 * failures create incidents but are NEVER auto-retried.
 */
export type NormalizedError = {
  provider: Provider;
  operation: string;
  errorCode?: string;
  httpStatus?: number;
  message: string;
  providerRequestId?: string;
  retryable: boolean;
  category: ErrorCategory;
  severity: Severity;
  timestamp: string;
  businessId?: string;
  userId?: string;
  sanitizedStack?: string;
  businessFailure?: boolean;
  metadata: Record<string, unknown>;
};

export type ClusterableError = {
  provider: Provider;
  operation: string;
  errorCode?: string;
  httpStatus?: number;
  message: string;
  businessId?: string;
};

/** Strict, validated output of the AI diagnostic component. */
export type AiDiagnosis = {
  classification: ErrorCategory;
  severity: Severity;
  retryable: boolean;
  rootCause: string;
  recommendedAction: string;
  confidence: number;
  reason: string;
  safeRecoveryAvailable: boolean;
};

export const INCIDENT_ACTIVE_STATUSES: IncidentStatus[] = [
  "OPEN",
  "RECOVERING",
  "REQUIRES_ACTION",
];

export const INCIDENT_TERMINAL_STATUSES: IncidentStatus[] = [
  "RECOVERED",
  "RESOLVED",
  "DISMISSED",
];

export type TimelineEvent = {
  at: string;
  type:
    | "incident_created"
    | "incident_updated"
    | "business_failure"
    | "ai_diagnosis"
    | "ai_diagnosis_failed"
    | "ai_diagnosis_skipped"
    | "policy_evaluation"
    | "recovery_attempted"
    | "recovery_success"
    | "recovery_failed"
    | "admin_action"
    | "retry"
    | "resolution_note";
  detail?: string;
  by?: string;
};

/** One check evaluated by the recovery policy engine (audit trail). */
export type PolicyCheck = {
  name: string;
  passed: boolean;
  reason?: string;
};

/** Structured, persisted policy verdict for one action on one failure. */
export type PolicyEvaluation = {
  actionId: string;
  allowed: boolean;
  reason?: string;
  checks: PolicyCheck[];
  at: string;
};

/** Circuit breaker state for one provider+operation+action scope. */
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export type FailureKind = "TECHNICAL" | "BUSINESS";

export type Incident = {
  _id?: string;
  fingerprint: string;
  provider: Provider;
  operation: string;
  businessId?: string;
  userId?: string;
  severity: Severity;
  status: IncidentStatus;
  errorCode?: string;
  httpStatus?: number;
  errorMessage: string;
  aiClassification?: ErrorCategory;
  aiRootCause?: string;
  aiRecommendation?: string;
  aiConfidence?: number;
  /** True when the AI diagnosis stage was skipped (e.g. budget exhausted). */
  aiDiagnosisSkipped?: boolean;
  aiDiagnosisSkipReason?: "budget_exhausted" | "disabled";
  /** True when the recorded diagnosis was served from the diagnosis cache. */
  aiDiagnosisCached?: boolean;
  failureKind?: FailureKind;
  /** Structured policy verdicts (H6 audit trail), bounded and newest-first. */
  policyEvaluations?: PolicyEvaluation[];
  recoveryAttempted: boolean;
  recoveryAction?: string;
  recoveryResult?: string;
  retryCount: number;
  occurrenceCount: number;
  context: Record<string, unknown>;
  sanitizedStack?: string;
  providerRequestId?: string;
  createdAt: string;
  updatedAt: string;
  firstSeen: string;
  lastSeen: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  timeline: TimelineEvent[];
};

/** Persistence contract so engine/incident logic stays testable without a DB. */
export interface IncidentStore {
  findOne(filter: Record<string, unknown>): Promise<Incident | null>;
  find(filter: Record<string, unknown>, opts?: {
    sort?: Record<string, 1 | -1>;
    limit?: number;
  }): Promise<Incident[]>;
  insertOne(doc: Incident): Promise<void>;
  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{ matchedCount: number }>;
  count(filter: Record<string, unknown>): Promise<number>;
}

/** Analyzer contract so the engine can run without OpenAI in tests. */
export interface AiAnalyzer {
  analyze(input: AiAnalysisInput): Promise<AiDiagnosis | null>;
}

export type AiAnalysisInput = {
  provider: Provider;
  operation: string;
  httpStatus?: number;
  errorCode?: string;
  sanitizedMessage: string;
  sanitizedStack?: string;
  context: Record<string, unknown>;
  allowedActions: { id: string; description: string }[];
  previousRecoveryAttempts: { action: string; result: string }[];
  retryCount: number;
};

export type RecoveryLogger = {
  log(event: RecoveryLogEvent): void;
};

export type RecoveryLogEvent = {
  event:
    | "recovery_attempt"
    | "recovery_success"
    | "recovery_failed"
    | "incident_created"
    | "incident_updated"
    | "incident_resolved"
    | "ai_diagnosis_requested"
    | "ai_diagnosis_failed"
    | "retry"
    | "operation_success";
  incidentId?: string;
  provider?: Provider;
  operation?: string;
  action?: string;
  attempt?: number;
  result?: string;
  category?: ErrorCategory;
  severity?: Severity;
  durationMs?: number;
  ts: string;
};

export type OperationResult = {
  ok: boolean;
  error?: NormalizedError;
  detail?: string;
};

export type RecoveryActionContext = {
  provider: Provider;
  operation: string;
  businessId?: string;
  shared: Record<string, unknown>;
};

export type RecoveryActionExecutor = (
  ctx: RecoveryActionContext
) => Promise<{ ok: boolean; detail?: string }>;

/** Registered executor for an operation (used for admin manual retry). */
export type OperationExecutor = (
  ctx: {
    businessId?: string;
    context: Record<string, unknown>;
    shared?: Record<string, unknown>;
  }
) => Promise<OperationResult>;
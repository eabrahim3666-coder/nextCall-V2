import { AsyncLocalStorage } from "async_hooks";
import { normalizeError } from "./errors";
import { redactMessage, redactObject } from "./redaction";
import { autoRetryAllowed } from "./classifier";
import {
  evaluateRecoveryAction,
  executeValidatedAction,
  type ActionCheckResult,
} from "./policy";
import { getRecommendableActions, getActionExecutor, RECOVERY_ACTIONS, getOperationExecutor } from "./registry";
import { recordIncident, incidentsStore, transitionIncident } from "./incidents-store";
import { computeFingerprint } from "./incidents-core";
import { diagnoseWithGpt, conservativeAnalyzer } from "./ai";
import {
  aiGuardStore,
  cacheDiagnosis,
  computeDiagnosisCacheKey,
  consumeDiagnosisBudget,
  getCachedDiagnosis,
  type AiGuardStore,
} from "./ai-guard";
import {
  circuitBreakerStore,
  circuitKey,
  getCircuitState,
  recordCircuitFailure,
  recordCircuitSuccess,
  type CircuitBreakerStore,
} from "./circuit-breaker";
import { recoveryLogger } from "./logging";
import {
  AiAnalyzer,
  AiAnalysisInput,
  AiDiagnosis,
  ErrorCategory,
  Incident,
  IncidentStatus,
  IncidentStore,
  NormalizedError,
  PolicyEvaluation,
  Provider,
  RecoveryLogger,
  TimelineEvent,
} from "./types";

/**
 * Central Error Recovery Engine.
 *
 * executeWithRecovery() wraps an external operation and, on failure:
 *   1. normalizes + redacts the error
 *   2. classifies deterministically (no AI)
 *   3. retries safely per the retry policy (bounded, idempotency-aware)
 *   4. executes a registry-approved recovery action if one exists
 *   5. asks GPT-4o-mini ONLY for unknown/ambiguous errors
 *   6. validates the GPT recommendation against the action registry
 *   7. creates/aggregates an incident if nothing safe can run
 *
 * Safety invariants:
 *   - Maximum automatic recovery depth is 1 (AsyncLocalStorage guarded).
 *   - GPT never executes anything — the policy engine decides.
 *   - Fail-closed: when unsure, we create an incident, we never guess.
 */

export const MAX_RECOVERY_DEPTH = 1;

type EngineDeps = {
  store?: IncidentStore;
  ai?: AiAnalyzer;
  logger?: RecoveryLogger;
  /** AI diagnosis budget + cache (defaults to the Astra-backed guard). */
  aiGuard?: AiGuardStore;
  /** Recovery action circuit breakers (defaults to the Astra-backed store). */
  circuitBreaker?: CircuitBreakerStore;
  /** Override alerting (defaults to Telegram for HIGH/CRITICAL new incidents). */
  alert?: (incident: Incident) => Promise<void>;
  /** Disable alerting entirely. */
  disableAlerts?: boolean;
};

export type ExecuteWithRecoveryOptions<T> = {
  provider: Provider;
  operation: string;
  businessId?: string;
  userId?: string;
  /** False for mutating ops that could duplicate side effects on retry. */
  idempotent?: boolean;
  /** Extra sanitized context stored with any incident. */
  context?: Record<string, unknown>;
  /** The actual operation. `shared` is the mutable recovery state. */
  execute: (shared: Record<string, unknown>) => Promise<T>;
  /** Optional override of candidate recovery actions (else derived from registry). */
  actions?: string[];
  /**
   * Categories that should NOT generate incidents (caller handles them
   * gracefully, e.g. duplicate verification reconciled downstream).
   */
  suppressCategories?: ErrorCategory[];
  maxAttempts?: number;
  maxDelayMs?: number;
  recoveryDepth?: number;
  deps?: EngineDeps;
  /** Set by the engine internally when re-running after a recovery action. */
  _internal?: { recoveryAttempted: boolean };
};

type RecoveryState = { depth: number };
const recoveryContext = new AsyncLocalStorage<RecoveryState>();

/**
 * Process-local in-flight dedupe (concurrency hardening).
 *
 * - `inflightActions`: a recovery action is only executed by one invocation of
 *   the same fingerprint at a time. Concurrent duplicates skip straight to the
 *   incident path (which aggregates by fingerprint).
 * - `inflightDiagnoses`: AI diagnosis is serialized per cache key (see
 *   `withDiagnosisLock`) — the second concurrent request for the same
 *   fingerprint is served from the first request's result, so GPT is called once.
 * - `inflightRetries`: admin manual retries are serialized per incident.
 *
 * These are per-process guards; cross-instance correctness comes from
 * fingerprint aggregation being idempotent and recovery budgets being
 * persisted (Astra).
 */
const inflightActions = new Set<string>();
const inflightRetries = new Set<string>();
const diagnosisLocks = new Map<string, Promise<unknown>>();

/** Serialize async work per key (e.g. cache+budget+GPT for one cache key). */
async function withDiagnosisLock<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const prev = diagnosisLocks.get(key) || Promise.resolve();
  const next = prev.then(fn, fn);
  diagnosisLocks.set(key, next);
  try {
    return await next;
  } finally {
    if (diagnosisLocks.get(key) === next) diagnosisLocks.delete(key);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getRetryAfterMs(error: unknown): number | null {
  try {
    const resp = (error as { response?: { headers?: unknown } }).response;
    if (!resp) return null;
    const headers = resp.headers as
      | { get?: (k: string) => string | null; "retry-after"?: string }
      | undefined;
    const value =
      (typeof headers?.get === "function" && headers.get("retry-after")) ||
      headers?.["retry-after"];
    if (!value) return null;
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    return Math.min(seconds * 1000, 60_000);
  } catch {
    return null;
  }
}

export class RecoveryError extends Error {
  normalized: NormalizedError;
  constructor(normalized: NormalizedError) {
    super(normalized.message);
    this.name = "RecoveryError";
    this.normalized = normalized;
  }
}

function computeBackoff(attempt: number, base = 500, maxDelayMs = 8000): number {
  const exp = Math.min(base * 2 ** attempt, maxDelayMs);
  const jitter = Math.floor(Math.random() * 500);
  return exp + jitter;
}

async function alertForIncident(
  incident: Incident,
  deps: EngineDeps
): Promise<void> {
  if (deps.disableAlerts) return;
  if (incident.severity !== "HIGH" && incident.severity !== "CRITICAL") return;
  if (process.env.RECOVERY_ALERTS_DISABLED === "true") return;
  if (incident.occurrenceCount > 1) return; // already alerted on first occurrence
  if (deps.alert) {
    try { await deps.alert(incident); } catch { /* never break the pipeline */ }
    return;
  }
  try {
    const { sendTelegramMessage } = await import("@/lib/telegram");
    await sendTelegramMessage(
      `🚨 <b>Incident [${incident.severity}]</b>\n` +
      `<b>${incident.provider}</b> · <b>${escapeTg(incident.operation)}</b>\n` +
      `<b>Status:</b> ${incident.status}\n` +
      `──────────\n` +
      `${escapeTg(incident.errorMessage).slice(0, 400)}\n` +
      `\n<i>Admin → /admin/incidents/${incident._id}</i>`
    );
  } catch (err) {
    recoveryLogger.log({
      event: "incident_updated",
      incidentId: incident._id,
      provider: incident.provider,
      operation: incident.operation,
      result: `alert_failed: ${(err as Error)?.message?.slice(0, 100) || "unknown"}`,
      ts: new Date().toISOString(),
    });
  }
}

function escapeTg(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function executeWithRecovery<T>(
  opts: ExecuteWithRecoveryOptions<T>
): Promise<T> {
  const logger = opts.deps?.logger || recoveryLogger;
  const store = opts.deps?.store || incidentsStore;
  const ai = opts.deps?.ai;
  const aiGuard = opts.deps?.aiGuard || aiGuardStore;
  const breaker = opts.deps?.circuitBreaker || circuitBreakerStore;
  const depth = opts.recoveryDepth ?? recoveryContext.getStore()?.depth ?? 0;

  // Recursion guard: engine runs at depth 0 only. Any nested invocation
  // (depth >= 1) executes the operation directly with no further recovery.
  if (depth >= MAX_RECOVERY_DEPTH) {
    return opts.execute({});
  }

  const idempotent = opts.idempotent ?? false;
  const maxAttempts = opts.maxAttempts ?? 3;
  const maxDelayMs = opts.maxDelayMs ?? 8000;
  const shared: Record<string, unknown> = {};
  const started = Date.now();
  let recoveryAttempted = opts._internal?.recoveryAttempted ?? false;
  const attemptedActions: string[] = [];
  const suppress = (n: NormalizedError) => opts.suppressCategories?.includes(n.category) === true;

  const runOperation = async (): Promise<T> => {
    try {
      const value = await opts.execute(shared);
      logger.log({
        event: "operation_success",
        provider: opts.provider,
        operation: opts.operation,
        attempt: 1,
        durationMs: Date.now() - started,
        ts: new Date().toISOString(),
      });
      return value;
    } catch (rawError) {
      const normalized = normalizeError({
        error: rawError,
        provider: opts.provider,
        operation: opts.operation,
        businessId: opts.businessId,
        userId: opts.userId,
        context: opts.context,
      });

      // ---- bounded deterministic retries ----
      let attempt = 1;
      let retriesMade = 0;
      while (
        autoRetryAllowed(normalized.category, idempotent) &&
        attempt < maxAttempts
      ) {
        const retryAfter = getRetryAfterMs(rawError);
        const delay =
          retryAfter ??
          computeBackoff(attempt, 500, maxDelayMs);
        logger.log({
          event: "retry",
          provider: opts.provider,
          operation: opts.operation,
          attempt,
          result: `retrying after ${delay}ms (${normalized.category})`,
          category: normalized.category,
          ts: new Date().toISOString(),
        });
        await sleep(delay);
        try {
          return await opts.execute(shared);
        } catch (retryError) {
          const reNormalized = normalizeError({
            error: retryError,
            provider: opts.provider,
            operation: opts.operation,
            businessId: opts.businessId,
            userId: opts.userId,
            context: opts.context,
          });
          normalized.category = reNormalized.category;
          normalized.httpStatus = reNormalized.httpStatus;
          normalized.errorCode = reNormalized.errorCode;
          normalized.message = reNormalized.message;
          normalized.sanitizedStack = reNormalized.sanitizedStack;
          attempt++;
          retriesMade++;
        }
      }
      normalized.metadata.retryCount = retriesMade;
      throw new RecoveryError(normalized);
    }
  };

  try {
    return await runOperation();
  } catch (err) {
    if (!(err instanceof RecoveryError)) throw err;
    const normalized = err.normalized;

    // Fingerprint for this occurrence — reused for incident aggregation,
    // AI budget scope and in-flight dedupe keys.
    const fingerprint = computeFingerprint({
      provider: opts.provider,
      operation: opts.operation,
      errorCode: normalized.errorCode,
      httpStatus: normalized.httpStatus,
      message: normalized.message,
      businessId: opts.businessId,
    });
    // Structured policy audit trail (H6), persisted on the incident.
    const policyEvaluations: PolicyEvaluation[] = [];
    const nowIso = () => new Date().toISOString();
    const recordVerdict = (actionId: string, verdict: ActionCheckResult) => {
      policyEvaluations.push({
        actionId,
        allowed: verdict.allowed,
        reason: verdict.allowed ? undefined : verdict.reason,
        checks: verdict.checks,
        at: nowIso(),
      });
    };

    // ---- recovery stage (max depth 1) ----
    if (!recoveryAttempted) {
      // H4: business failures (provider rejected the request semantically)
      // are NEVER auto-retried. They still create an incident, marked for
      // business review.
      if (normalized.businessFailure) {
        if (suppress(normalized)) throw new RecoveryError(normalized);
        const incident = await createOrAggregateIncident({
          normalized,
          retryCount: 0,
          context: opts.context,
          status: "REQUIRES_ACTION",
          store,
          logger,
          provider: opts.provider,
          operation: opts.operation,
          businessId: opts.businessId,
          failureKind: "BUSINESS",
          timeline: [
            {
              type: "business_failure",
              at: nowIso(),
              detail: `Provider rejected the request (${normalized.category}). No auto-retry: requires business review.`,
            },
          ],
        });
        await alertForIncident(incident, opts.deps || {});
        throw new RecoveryError(normalized);
      }

      // 1. deterministic candidates
      const candidates = opts.actions?.length
        ? opts.actions
        : Object.keys(RECOVERY_ACTIONS).filter((id) => {
            const a = RECOVERY_ACTIONS[id];
            return (
              a.enabled &&
              (a.provider === opts.provider || a.provider === "unknown") &&
              (a.operations === "*" ||
                (Array.isArray(a.operations) && a.operations.includes(opts.operation))) &&
              a.allowedCategories.includes(normalized.category) &&
              getActionExecutor(id)
            );
          });

      for (const actionId of candidates) {
        // H3: circuit breaker gate (per provider+operation+action).
        const circuit = await getCircuitState(
          breaker,
          circuitKey(opts.provider, opts.operation, actionId)
        );
        const verdict = evaluateRecoveryAction(actionId, {
          provider: opts.provider,
          operation: opts.operation,
          category: normalized.category,
          businessId: opts.businessId,
          fingerprint,
          recoveryAttempted,
          previousActions: attemptedActions,
          shared,
          error: normalized,
          circuit,
        });
        recordVerdict(actionId, verdict);
        if (!verdict.allowed) continue;

        // Concurrency: only one execution of this action per fingerprint at a time.
        const inflightKey = `${fingerprint}|${actionId}`;
        if (inflightActions.has(inflightKey)) {
          logger.log({
            event: "recovery_failed",
            provider: opts.provider,
            operation: opts.operation,
            action: actionId,
            result: "already_in_flight",
            ts: nowIso(),
          });
          continue;
        }

        logger.log({
          event: "recovery_attempt",
          provider: opts.provider,
          operation: opts.operation,
          action: actionId,
          attempt: 1,
          ts: nowIso(),
        });

        // NOTE: recoveryAttempted/attemptedActions are updated only AFTER the
        // action executes — executeValidatedAction re-validates internally and
        // must see the state as it was when this verdict was granted.
        inflightActions.add(inflightKey);
        let outcome: Awaited<ReturnType<typeof executeValidatedAction>>;
        try {
          outcome = await executeValidatedAction(
            actionId,
            {
              provider: opts.provider,
              operation: opts.operation,
              category: normalized.category,
              businessId: opts.businessId,
              fingerprint,
              recoveryAttempted,
              previousActions: attemptedActions,
              shared,
              error: normalized,
              circuit,
            },
            async (s) => {
              return await recoveryContext.run({ depth: depth + 1 }, async () => {
                return await opts.execute(s);
              });
            }
          );
        } finally {
          inflightActions.delete(inflightKey);
        }

        if (outcome.executed) {
          recoveryAttempted = true;
          attemptedActions.push(actionId);
          // H3: feed the outcome into the circuit breaker.
          const cbKey = circuitKey(opts.provider, opts.operation, actionId);
          if (outcome.rerunError || !outcome.applied) {
            await recordCircuitFailure(breaker, cbKey);
          } else {
            await recordCircuitSuccess(breaker, cbKey);
          }
        }

        if (outcome.rerunError) {
          // action executed but re-run failed again → incident
          if (suppress(outcome.rerunError)) throw new RecoveryError(outcome.rerunError);
          const incident = await createOrAggregateIncident({
            normalized: outcome.rerunError,
            retryCount: 1,
            recovery: { attempted: true, action: actionId, result: outcome.detail || "failed" },
            context: opts.context,
            status: "REQUIRES_ACTION",
            store,
            logger,
            provider: opts.provider,
            operation: opts.operation,
            businessId: opts.businessId,
            policyEvaluations,
            failureKind: "TECHNICAL",
          });
          await alertForIncident(incident, opts.deps || {});
          throw new RecoveryError(outcome.rerunError);
        }

        if (outcome.executed) {
          if (!outcome.applied) {
            // action failed to apply — never treat as recovered; try next candidate
            logger.log({
              event: "recovery_failed",
              provider: opts.provider,
              operation: opts.operation,
              action: actionId,
              result: outcome.detail || "action_failed",
              ts: nowIso(),
            });
            continue;
          }

          // re-run succeeded (or action completed without re-execution)
          logger.log({
            event: "recovery_success",
            provider: opts.provider,
            operation: opts.operation,
            action: actionId,
            result: outcome.detail,
            ts: nowIso(),
          });
          // mark the (possible) open incident as RECOVERED
          const open = await store.findOne({ fingerprint });
          if (open && (open.status === "OPEN" || open.status === "RECOVERING" || open.status === "REQUIRES_ACTION")) {
            const { appendTimeline } = await import("./incidents-core");
            await store.updateOne(
              { _id: open._id },
              {
                $set: {
                  status: "RECOVERED" as IncidentStatus,
                  recoveryResult: outcome.detail,
                  updatedAt: nowIso(),
                  resolvedAt: nowIso(),
                  timeline: appendTimeline(open, {
                    type: "recovery_success",
                    detail: `Auto-recovered via ${actionId}.`,
                  }),
                },
              }
            );
            logger.log({
              event: "incident_resolved",
              incidentId: String(open._id),
              provider: opts.provider,
              operation: opts.operation,
              action: actionId,
              ts: nowIso(),
            });
          }
          if (outcome.value !== undefined) return outcome.value as T;
          return (await opts.execute(shared)) as T;
        }
      }

      // 2. AI diagnosis (only when no deterministic action recovered)
      if (ai || process.env.RECOVERY_AI_DISABLED !== "true") {
        const diagnose = ai
          ? (input: AiAnalysisInput) => ai.analyze(input)
          : (input: AiAnalysisInput) => diagnoseWithGpt(input);
        const allowedActions = getRecommendableActions(opts.provider, opts.operation);
        const aiInput = {
          provider: opts.provider,
          operation: opts.operation,
          httpStatus: normalized.httpStatus,
          errorCode: normalized.errorCode,
          sanitizedMessage: normalized.message,
          sanitizedStack: normalized.sanitizedStack,
          // FIX 1 (hardening audit): never pass raw caller context to the AI
          // layer — redact through the single enforcement point first.
          context: redactObject(opts.context || {}),
          allowedActions,
          previousRecoveryAttempts: attemptedActions.map((a) => ({ action: a, result: "failed" })),
          retryCount: 0,
        };
        // H2: cache key from normalized technical context — never secrets.
        const cacheKey = computeDiagnosisCacheKey({
          provider: opts.provider,
          operation: opts.operation,
          httpStatus: normalized.httpStatus,
          errorCode: normalized.errorCode,
          message: normalized.message,
        });

        let diagnosis: AiDiagnosis | null = null;
        let aiDiagnosisCached = false;
        let aiDiagnosisSkipped = false;
        let aiDiagnosisSkipReason: "budget_exhausted" | undefined;
        const diagnosisTimeline: TimelineEvent[] = [];

        // H1/H2: cache first, then budget, then GPT — serialized per cache key
        // so concurrent identical failures share one GPT call and one budget slot.
        const guarded = await withDiagnosisLock(cacheKey, async () => {
          const cached = await getCachedDiagnosis(aiGuard, cacheKey);
          if (cached) {
            return { diagnosis: cached.diagnosis, cached: true, skipped: false, budgetUsed: 0, budgetLimit: 0 };
          }
          const budget = await consumeDiagnosisBudget(aiGuard, fingerprint);
          if (!budget.allowed) {
            return { diagnosis: null, cached: false, skipped: true, budgetUsed: budget.used, budgetLimit: budget.limit };
          }
          const d = await analyzeWithFallback(diagnose, aiInput);
          if (d) await cacheDiagnosis(aiGuard, cacheKey, d);
          return { diagnosis: d, cached: false, skipped: false, budgetUsed: 0, budgetLimit: 0 };
        });
        diagnosis = guarded.diagnosis;
        aiDiagnosisCached = guarded.cached;
        aiDiagnosisSkipped = guarded.skipped;
        if (guarded.skipped) {
          aiDiagnosisSkipReason = "budget_exhausted";
          diagnosisTimeline.push({
            type: "ai_diagnosis_skipped",
            at: nowIso(),
            detail: `AI diagnosis skipped: budget exhausted for fingerprint (${guarded.budgetUsed}/${guarded.budgetLimit} per window).`,
          });
          logger.log({
            event: "ai_diagnosis_failed",
            provider: opts.provider,
            operation: opts.operation,
            result: `budget_exhausted (${guarded.budgetUsed}/${guarded.budgetLimit})`,
            ts: nowIso(),
          });
        } else if (guarded.cached) {
          diagnosisTimeline.push({
            type: "ai_diagnosis",
            at: nowIso(),
            detail: "AI diagnosis served from cache (advisory only; policy re-checked).",
          });
        }

        if (diagnosis && diagnosis.safeRecoveryAvailable && diagnosis.recommendedAction !== "NO_SAFE_RECOVERY") {
          // H3: circuit breaker gate for the AI-recommended action too.
          const circuit = await getCircuitState(
            breaker,
            circuitKey(opts.provider, opts.operation, diagnosis.recommendedAction)
          );
          const verdict = evaluateRecoveryAction(diagnosis.recommendedAction, {
            provider: opts.provider,
            operation: opts.operation,
            category: diagnosis.classification,
            businessId: opts.businessId,
            fingerprint,
            recoveryAttempted,
            previousActions: attemptedActions,
            shared,
            error: normalized,
            circuit,
          });
          recordVerdict(diagnosis.recommendedAction, verdict);
          if (verdict.allowed && getActionExecutor(diagnosis.recommendedAction)) {
            const inflightKey = `${fingerprint}|${diagnosis.recommendedAction}`;
            if (inflightActions.has(inflightKey)) {
              logger.log({
                event: "recovery_failed",
                provider: opts.provider,
                operation: opts.operation,
                action: diagnosis.recommendedAction,
                result: "already_in_flight",
                ts: nowIso(),
              });
            } else {
              logger.log({
                event: "recovery_attempt",
                provider: opts.provider,
                operation: opts.operation,
                action: diagnosis.recommendedAction,
                attempt: 1,
                ts: nowIso(),
              });
              inflightActions.add(inflightKey);
              let outcome: Awaited<ReturnType<typeof executeValidatedAction>>;
              try {
                outcome = await executeValidatedAction(
                  diagnosis.recommendedAction,
                  {
                    provider: opts.provider,
                    operation: opts.operation,
                    category: diagnosis.classification,
                    businessId: opts.businessId,
                    fingerprint,
                    recoveryAttempted,
                    previousActions: attemptedActions,
                    shared,
                    error: normalized,
                    circuit,
                  },
                  async (s) => {
                    return await recoveryContext.run({ depth: depth + 1 }, async () => {
                      return await opts.execute(s);
                    });
                  }
                );
              } finally {
                inflightActions.delete(inflightKey);
              }
              if (outcome.executed) {
                recoveryAttempted = true;
                attemptedActions.push(diagnosis.recommendedAction);
                const cbKey = circuitKey(opts.provider, opts.operation, diagnosis.recommendedAction);
                if (outcome.rerunError || !outcome.applied) {
                  await recordCircuitFailure(breaker, cbKey);
                } else {
                  await recordCircuitSuccess(breaker, cbKey);
                }
              }
              if (outcome.rerunError) {
                if (suppress(outcome.rerunError)) throw new RecoveryError(outcome.rerunError);
                const incident = await createOrAggregateIncident({
                  normalized: outcome.rerunError,
                  retryCount: 1,
                  recovery: { attempted: true, action: diagnosis.recommendedAction, result: outcome.detail || "failed" },
                  context: opts.context,
                  status: "REQUIRES_ACTION",
                  store,
                  logger,
                  provider: opts.provider,
                  operation: opts.operation,
                  businessId: opts.businessId,
                  ai: {
                    classification: diagnosis.classification,
                    severity: diagnosis.severity,
                    rootCause: diagnosis.rootCause,
                    recommendation: diagnosis.recommendedAction,
                    confidence: diagnosis.confidence,
                  },
                  aiFlags: {
                    skipped: aiDiagnosisSkipped || undefined,
                    skipReason: aiDiagnosisSkipReason,
                    cached: aiDiagnosisCached || undefined,
                  },
                  policyEvaluations,
                  failureKind: "TECHNICAL",
                  timeline: diagnosisTimeline,
                });
                await alertForIncident(incident, opts.deps || {});
                throw new RecoveryError(outcome.rerunError);
              }
              if (outcome.executed) {
                if (!outcome.applied) {
                  // recommended action failed to apply — never treat as recovered;
                  // fall through to incident creation (fail closed)
                  logger.log({
                    event: "recovery_failed",
                    provider: opts.provider,
                    operation: opts.operation,
                    action: diagnosis.recommendedAction,
                    result: outcome.detail || "action_failed",
                    ts: nowIso(),
                  });
                } else {
                  logger.log({
                    event: "recovery_success",
                    provider: opts.provider,
                    operation: opts.operation,
                    action: diagnosis.recommendedAction,
                    result: outcome.detail,
                    ts: nowIso(),
                  });
                  if (outcome.value !== undefined) return outcome.value as T;
                  return (await opts.execute(shared)) as T;
                }
              }
            }
          } else {
            logger.log({
              event: "recovery_failed",
              provider: opts.provider,
              operation: opts.operation,
              action: diagnosis.recommendedAction,
              result: verdict.allowed ? "no_executor" : verdict.reason,
              ts: nowIso(),
            });
          }
        }

        // AI said no safe recovery (or was unavailable) → incident with AI context
        if (suppress(normalized)) throw new RecoveryError(normalized);
        const incident = await createOrAggregateIncident({
          normalized,
          retryCount: 0,
          recovery: recoveryAttempted ? { attempted: true, result: "failed" } : undefined,
          context: opts.context,
          store,
          logger,
          provider: opts.provider,
          operation: opts.operation,
          businessId: opts.businessId,
          ai: diagnosis
            ? {
                classification: diagnosis.classification,
                severity: diagnosis.severity,
                rootCause: diagnosis.rootCause,
                recommendation: diagnosis.recommendedAction,
                confidence: diagnosis.confidence,
              }
            : null,
          aiFlags: {
            skipped: aiDiagnosisSkipped || undefined,
            skipReason: aiDiagnosisSkipReason,
            cached: aiDiagnosisCached || undefined,
          },
          policyEvaluations,
          failureKind: "TECHNICAL",
          timeline: diagnosisTimeline,
        });
        await alertForIncident(incident, opts.deps || {});
        throw new RecoveryError(normalized);
      }

      // AI disabled → pure deterministic path already exhausted
      if (suppress(normalized)) throw new RecoveryError(normalized);
      const incident = await createOrAggregateIncident({
        normalized,
        retryCount: 0,
        recovery: recoveryAttempted ? { attempted: true, result: "failed" } : undefined,
        context: opts.context,
        store,
        logger,
        provider: opts.provider,
        operation: opts.operation,
        businessId: opts.businessId,
        aiFlags: { skipped: true, skipReason: "disabled" },
        policyEvaluations,
        failureKind: "TECHNICAL",
      });
      await alertForIncident(incident, opts.deps || {});
      throw new RecoveryError(normalized);
    }

    // recovery already attempted at this depth → do not loop again
    if (suppress(normalized)) throw err;
    const incident = await createOrAggregateIncident({
      normalized,
      retryCount: 1,
      recovery: { attempted: true, result: "recovery already attempted" },
      context: opts.context,
      status: "REQUIRES_ACTION",
      store,
      logger,
      provider: opts.provider,
      operation: opts.operation,
      businessId: opts.businessId,
      policyEvaluations,
      failureKind: "TECHNICAL",
    });
    await alertForIncident(incident, opts.deps || {});
    throw err;
  }
}

async function analyzeWithFallback(
  analyzer: (input: AiAnalysisInput) => Promise<AiDiagnosis | null>,
  input: AiAnalysisInput
): Promise<AiDiagnosis | null> {
  try {
    return await analyzer(input);
  } catch {
    return conservativeAnalyzer.analyze(input);
  }
}

async function createOrAggregateIncident(input: {
  normalized: NormalizedError;
  retryCount: number;
  recovery?: { attempted: boolean; action?: string; result?: string };
  context?: Record<string, unknown>;
  status?: IncidentStatus;
  store: IncidentStore;
  logger: RecoveryLogger;
  provider: Provider;
  operation: string;
  businessId?: string;
  ai?: Parameters<typeof recordIncident>[0]["ai"] | null;
  aiFlags?: Parameters<typeof recordIncident>[0]["aiFlags"];
  policyEvaluations?: PolicyEvaluation[];
  failureKind?: "TECHNICAL" | "BUSINESS";
  timeline?: Incident["timeline"];
}): Promise<Incident> {
  const incident = await recordIncident({
    error: input.normalized,
    context: input.context || {},
    retryCount: input.retryCount,
    recovery: input.recovery,
    status: input.status,
    ai: input.ai || undefined,
    aiFlags: input.aiFlags,
    policyEvaluations: input.policyEvaluations,
    failureKind: input.failureKind,
    timeline: input.timeline,
    store: input.store,
  });
  const effective = incident || {
    fingerprint: computeFingerprint({
      provider: input.provider,
      operation: input.operation,
      errorCode: input.normalized.errorCode,
      httpStatus: input.normalized.httpStatus,
      message: input.normalized.message,
      businessId: input.businessId,
    }),
    provider: input.provider,
    operation: input.operation,
    businessId: input.businessId,
    errorMessage: input.normalized.message,
    status: (input.status || "OPEN") as IncidentStatus,
    severity: input.normalized.severity,
    occurrenceCount: 1,
    retryCount: input.retryCount,
    recoveryAttempted: input.recovery?.attempted ?? false,
    timeline: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    context: {},
  } as Incident;
  input.logger.log({
    event: incident ? "incident_updated" : "incident_created",
    incidentId: String(effective._id || effective.fingerprint),
    provider: effective.provider,
    operation: effective.operation,
    severity: effective.severity,
    ts: new Date().toISOString(),
  });
  return effective;
}

/**
 * Admin manual retry. Runs the registered operation executor through the
 * same policy system (registered actions only) and updates the incident.
 *
 * Concurrency-hardened: an incident that is already being retried (or already
 * terminal) is never executed twice.
 */
export async function retryIncident(
  incidentId: string,
  adminId: string,
  deps: EngineDeps = {}
): Promise<{ ok: boolean; incident?: Incident; error?: string }> {
  const store = deps.store || incidentsStore;
  const incident =
    (await store.findOne({ _id: incidentId })) ||
    (await store.findOne({ fingerprint: incidentId }));
  if (!incident) return { ok: false, error: "Incident not found" };

  if (incident.status === "RESOLVED" || incident.status === "DISMISSED" || incident.status === "RECOVERED") {
    return { ok: false, error: "already_resolved", incident };
  }

  const key = String(incident._id || incident.fingerprint);
  if (inflightRetries.has(key)) {
    return { ok: false, error: "retry_in_progress" };
  }
  inflightRetries.add(key);
  try {
    const executor = getOperationExecutor(incident.provider, incident.operation);
    if (!executor) {
      const updated = await transitionIncident(store, incidentId, "REQUIRES_ACTION", {
        by: adminId,
        note: "Manual retry requested but no safe retry path is registered for this operation.",
      });
      return { ok: false, error: "no_retry_path", incident: updated || undefined };
    }

    const result = await executor({
      businessId: incident.businessId,
      context: incident.context,
    });

    if (result.ok) {
      const updated = await transitionIncident(store, incidentId, "RECOVERED", {
        by: adminId,
        note: "Manual retry succeeded.",
        resolvedAt: new Date().toISOString(),
      });
      recoveryLogger.log({
        event: "incident_resolved",
        incidentId,
        provider: incident.provider,
        operation: incident.operation,
        result: "manual_retry_success",
        ts: new Date().toISOString(),
      });
      return { ok: true, incident: updated || undefined };
    }

    // FIX 2 (hardening audit): the provider/executor error may contain
    // secrets — redact before it enters the incident timeline.
    const failureDetail = redactMessage(result.error ?? result.detail, "unknown").slice(0, 300);
    const updated = await transitionIncident(store, incidentId, "REQUIRES_ACTION", {
      by: adminId,
      note: `Manual retry failed: ${failureDetail}`,
    });
    return { ok: false, error: "retry_failed", incident: updated || undefined };
  } finally {
    inflightRetries.delete(key);
  }
}
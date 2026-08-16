import { normalizeError } from "./errors";
import { getActionExecutor, RECOVERY_ACTIONS } from "./registry";
import { CircuitSnapshot } from "./circuit-breaker";
import {
  ErrorCategory,
  NormalizedError,
  PolicyCheck,
  Provider,
  RecoveryActionContext,
} from "./types";

export type ActionCheckResult =
  | { allowed: true; actionId: string; context: RecoveryActionContext; checks: PolicyCheck[] }
  | { allowed: false; actionId: string; reason: string; detail?: string; checks: PolicyCheck[] };

export type RecoveryPolicyOptions = {
  provider: Provider;
  operation: string;
  category: ErrorCategory;
  businessId?: string;
  /** The sha256 fingerprint of this recovery occurrence (engine-computed). */
  fingerprint?: string;
  recoveryAttempted: boolean;
  /** What previous recovery actions already ran for this operation. */
  previousActions: string[];
  shared: Record<string, unknown>;
  error: NormalizedError;
  /** Circuit breaker snapshot for provider|operation|action (hardening H3). */
  circuit?: CircuitSnapshot;
};

/**
 * Per-recovery-occurrence attempt counter (anti-hammer, hardening H8).
 *
 * Keyed on `fingerprint|actionId`, where the fingerprint is the engine's
 * sha256 of provider|operation|errorCode|httpStatus|businessId|normalized
 * message — never a raw error message or secret. Independent failures
 * (different businesses, different fingerprints) never consume each other's
 * slot; the SAME fingerprint+action still respects maxAttempts.
 *
 * Bounded: entries expire after a TTL window (same spirit as the AI budget
 * window) and the map is lazily pruned; a hard entry cap evicts the
 * oldest-inserted entry first. No unbounded growth.
 */
const MAX_ATTEMPTS_TTL_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS_CACHE_LIMIT = 2000;
const MAX_ATTEMPTS_CACHE = new Map<string, { count: number; ts: number }>();
let lastAttemptsPruneAt = 0;
const GLOBAL_SCOPE = "__global__";

function attemptsKey(actionId: string, fingerprint?: string): string {
  return fingerprint ? `${fingerprint}|${actionId}` : `${actionId}|${GLOBAL_SCOPE}`;
}

function attemptsUsed(actionId: string, fingerprint?: string): number {
  const entry = MAX_ATTEMPTS_CACHE.get(attemptsKey(actionId, fingerprint));
  if (!entry) return 0;
  return Date.now() - entry.ts < MAX_ATTEMPTS_TTL_MS ? entry.count : 0;
}

function pruneAttemptsCache(): void {
  const now = Date.now();
  if (now - lastAttemptsPruneAt < 60_000) return;
  lastAttemptsPruneAt = now;
  for (const [key, entry] of MAX_ATTEMPTS_CACHE) {
    if (now - entry.ts >= MAX_ATTEMPTS_TTL_MS) MAX_ATTEMPTS_CACHE.delete(key);
  }
}

/**
 * The Recovery Policy Engine.
 *
 * ALL recovery actions must pass every check here before execution.
 * AI confidence is never part of this evaluation — only facts are.
 *
 * Every evaluation collects a structured `checks[]` audit trail (H6) that is
 * persisted on the incident. Reasons are stable strings so existing callers
 * and tests keep working.
 */
export function evaluateRecoveryAction(
  actionId: string,
  opts: RecoveryPolicyOptions
): ActionCheckResult {
  const checks: PolicyCheck[] = [];
  const fail = (name: string, reason: string): ActionCheckResult => {
    checks.push({ name, passed: false, reason });
    return { allowed: false, actionId, reason, checks };
  };
  const pass = (name: string) => checks.push({ name, passed: true });
  const action = RECOVERY_ACTIONS[actionId];

  // 1. Is the action registered at all?
  if (!action) {
    return fail("registered", `Action ${actionId} is not registered.`);
  }
  pass("registered");

  // 2. Is it enabled?
  if (!action.enabled) {
    return fail("enabled", `Action ${actionId} is disabled.`);
  }
  pass("enabled");

  // 3. Is an executor wired up for it? (No executor ⇒ cannot safely execute.)
  if (!getActionExecutor(actionId)) {
    return fail("executor", `Action ${actionId} has no executor.`);
  }
  pass("executor");

  // 4. Is it allowed for this provider?
  if (action.provider !== opts.provider && action.provider !== "unknown") {
    return fail(
      "provider",
      `Action ${actionId} does not apply to provider ${opts.provider}.`
    );
  }
  pass("provider");

  // 5. Is it allowed for this operation?
  if (
    action.operations !== "*" &&
    !(Array.isArray(action.operations) && action.operations.includes(opts.operation))
  ) {
    return fail(
      "operation",
      `Action ${actionId} does not apply to operation ${opts.operation}.`
    );
  }
  pass("operation");

  // 6. Is it allowed for this error category?
  if (!action.allowedCategories.includes(opts.category)) {
    return fail(
      "category",
      `Action ${actionId} does not apply to category ${opts.category}.`
    );
  }
  pass("category");

  // 7. Has the recovery budget been consumed?
  if (opts.recoveryAttempted) {
    return fail("budget", "Recovery already attempted for this operation.");
  }
  pass("budget");

  // 8. Has this specific action already been attempted (per-invocation + global)?
  if (opts.previousActions.includes(actionId)) {
    return fail("not_repeated", `Action ${actionId} was already attempted.`);
  }
  pass("not_repeated");

  // 9. Per-occurrence attempt cap for the action (scoped to this recovery's
  //    fingerprint so independent failures never share a slot; the
  //    invocation-level `not_repeated` guard above stays the authoritative
  //    check for a single failure).
  const used = attemptsUsed(actionId, opts.fingerprint);
  if (used >= action.maxAttempts) {
    return fail("max_attempts", `Action ${actionId} exceeded max attempts (${action.maxAttempts}).`);
  }
  pass("max_attempts");

  // 10. Circuit breaker (hardening H3): OPEN blocks, HALF_OPEN allows the probe.
  const circuit = opts.circuit;
  if (circuit?.state === "OPEN") {
    const until = circuit.opensAt
      ? ` until ${new Date(circuit.opensAt).toISOString()}`
      : "";
    return fail(
      "circuit_breaker",
      `Circuit breaker open for ${opts.provider}/${opts.operation}/${actionId}${until}.`
    );
  }
  pass("circuit_breaker");

  return {
    allowed: true,
    actionId,
    context: {
      provider: opts.provider,
      operation: opts.operation,
      businessId: opts.businessId,
      shared: opts.shared,
    },
    checks,
  };
}

export function recordActionAttempt(actionId: string, fingerprint?: string): void {
  const now = Date.now();
  pruneAttemptsCache();
  const key = attemptsKey(actionId, fingerprint);
  const prev = MAX_ATTEMPTS_CACHE.get(key);
  const count = prev && now - prev.ts < MAX_ATTEMPTS_TTL_MS ? prev.count + 1 : 1;
  MAX_ATTEMPTS_CACHE.set(key, { count, ts: now });
  if (MAX_ATTEMPTS_CACHE.size > MAX_ATTEMPTS_CACHE_LIMIT) {
    const oldest = MAX_ATTEMPTS_CACHE.keys().next().value;
    if (oldest !== undefined) MAX_ATTEMPTS_CACHE.delete(oldest);
  }
}

export function resetPolicyCountersForTests(): void {
  MAX_ATTEMPTS_CACHE.clear();
  lastAttemptsPruneAt = 0;
}

/**
 * Execute a validated recovery action and run the operation once more.
 * `runAgain` re-executes the original operation with the mutated shared state.
 *
 * Outcome contract:
 *  - executed=false: policy rejected the action (never runs).
 *  - executed=true, applied=false: action was attempted but failed to apply.
 *    The caller must NOT treat the operation as recovered.
 *  - executed=true, applied=true, value=undefined: action completed without
 *    re-execution (requiresReexecution=false).
 *  - executed=true, applied=true, value: re-execution succeeded; `value` is
 *    the operation's result. Callers should return it WITHOUT re-running.
 *  - rerunError: action applied but the operation still failed.
 */
export async function executeValidatedAction(
  actionId: string,
  policy: RecoveryPolicyOptions,
  runAgain: (shared: Record<string, unknown>) => Promise<unknown>
): Promise<{
  executed: boolean;
  applied: boolean;
  detail?: string;
  rerunError?: NormalizedError;
  value?: unknown;
}> {
  const verdict = evaluateRecoveryAction(actionId, policy);
  if (!verdict.allowed) {
    return { executed: false, applied: false, detail: verdict.reason };
  }

  const executor = getActionExecutor(actionId)!;
  try {
    const result = await executor(verdict.context);
    recordActionAttempt(actionId, policy.fingerprint);

    if (!result.ok) {
      return { executed: true, applied: false, detail: result.detail || `Action ${actionId} failed to execute.` };
    }

    if (!RECOVERY_ACTIONS[actionId].requiresReexecution) {
      return { executed: true, applied: true, detail: result.detail || "Action executed." };
    }

    try {
      const value = await runAgain(policy.shared);
      return {
        executed: true,
        applied: true,
        detail: result.detail || "Action executed; operation succeeded on retry.",
        value,
      };
    } catch (rerunError) {
      return {
        executed: true,
        applied: true,
        detail: result.detail || "Action executed but operation still failed.",
        rerunError: normalizeError({
          error: rerunError,
          provider: policy.provider,
          operation: policy.operation,
          businessId: policy.businessId,
          context: policy.error.metadata,
        }),
      };
    }
  } catch (actionError) {
    return {
      executed: true,
      applied: false,
      detail: `Action ${actionId} threw: ${(actionError as Error)?.message || "unknown"}`,
    };
  }
}
import { CircuitState } from "./types";
import { checkMemoryFallbackWarning } from "./logging";

/**
 * Recovery action circuit breaker (Hardening H3).
 *
 * Scope: one breaker per provider + operation + recovery action. An action
 * that fails consecutively (threshold: AI_RECOVERY_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
 * default 2) opens its breaker. While OPEN the action is blocked by the
 * policy gate (check `circuit_breaker`) — other actions and operations are
 * unaffected. After the cooldown (AI_RECOVERY_CIRCUIT_BREAKER_COOLDOWN_SECONDS,
 * default 300s) the breaker moves to HALF_OPEN: one probe attempt is allowed.
 * Probe success closes the breaker; probe failure re-opens it with a fresh
 * cooldown.
 *
 * HALF_OPEN is derived at read time (never persisted). The breaker is
 * fail-safe: any storage failure reads as CLOSED (allow) and is never allowed
 * to break the recovery pipeline.
 */

export const CIRCUIT_THRESHOLD_DEFAULT = 2;
export const CIRCUIT_COOLDOWN_SECONDS_DEFAULT = 300;

function readEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function circuitFailureThreshold(): number {
  return readEnvInt("AI_RECOVERY_CIRCUIT_BREAKER_FAILURE_THRESHOLD", CIRCUIT_THRESHOLD_DEFAULT);
}

export function circuitCooldownMs(): number {
  return readEnvInt("AI_RECOVERY_CIRCUIT_BREAKER_COOLDOWN_SECONDS", CIRCUIT_COOLDOWN_SECONDS_DEFAULT) * 1000;
}

export type CircuitRecord = {
  key: string;
  /** HALF_OPEN is never persisted — it is derived from OPEN + elapsed cooldown. */
  state: "CLOSED" | "OPEN";
  consecutiveFailures: number;
  openedAt?: string;
};

export type CircuitBreakerStore = {
  getBreaker(key: string): Promise<CircuitRecord | null>;
  saveBreaker(record: CircuitRecord): Promise<void>;
};

export type CircuitSnapshot = {
  state: CircuitState;
  consecutiveFailures: number;
  opensAt?: string;
};

export function circuitKey(provider: string, operation: string, actionId: string): string {
  return `${provider}|${operation}|${actionId}`;
}

/** Effective breaker state with cooldown applied (OPEN → HALF_OPEN on expiry). */
export async function getCircuitState(
  store: CircuitBreakerStore,
  key: string
): Promise<CircuitSnapshot> {
  const cooldownMs = circuitCooldownMs();
  let record: CircuitRecord | null = null;
  try {
    record = await store.getBreaker(key);
  } catch {
    record = null;
  }
  if (!record) return { state: "CLOSED", consecutiveFailures: 0 };

  if (record.state === "OPEN" && record.openedAt) {
    const openedAt = new Date(record.openedAt).getTime();
    const stillCooling = Number.isFinite(openedAt) && Date.now() - openedAt < cooldownMs;
    if (stillCooling) {
      return {
        state: "OPEN",
        consecutiveFailures: record.consecutiveFailures,
        opensAt: new Date(openedAt + cooldownMs).toISOString(),
      };
    }
    return { state: "HALF_OPEN", consecutiveFailures: record.consecutiveFailures };
  }

  return { state: "CLOSED", consecutiveFailures: record.consecutiveFailures || 0 };
}

/** Record a recovery-action failure. Opens the breaker at the threshold. */
export async function recordCircuitFailure(
  store: CircuitBreakerStore,
  key: string
): Promise<void> {
  const threshold = circuitFailureThreshold();
  try {
    const snapshot = await getCircuitState(store, key);
    if (snapshot.state === "OPEN") return; // already open — nothing to record
    const failures = (snapshot.consecutiveFailures || 0) + 1;
    if (failures >= threshold || snapshot.state === "HALF_OPEN") {
      await store.saveBreaker({
        key,
        state: "OPEN",
        consecutiveFailures: failures,
        openedAt: new Date().toISOString(),
      });
    } else {
      await store.saveBreaker({ key, state: "CLOSED", consecutiveFailures: failures });
    }
  } catch {
    // fail-safe: never let breaker bookkeeping break the pipeline
  }
}

/** Record a recovery-action success. Closes the breaker (resets failures). */
export async function recordCircuitSuccess(
  store: CircuitBreakerStore,
  key: string
): Promise<void> {
  try {
    await store.saveBreaker({ key, state: "CLOSED", consecutiveFailures: 0 });
  } catch {
    // fail-safe
  }
}

// ---------------------------------------------------------------------------
// Astra-backed default store (shared recovery_ai_guard collection, kind: "breaker")
// ---------------------------------------------------------------------------

async function getCollection() {
  const { recoveryGuardCollection } = await import("@/lib/astra");
  return recoveryGuardCollection;
}

/**
 * In-memory fallback used when Astra is not configured (tests/dev). Same
 * contract as the Astra-backed store; state is process-local. Never used in
 * production, where ASTRA_DB_APPLICATION_TOKEN is set.
 */
const memoryBreakers = new Map<string, CircuitRecord>();

const memoryStore: CircuitBreakerStore = {
  async getBreaker(key) {
    const record = memoryBreakers.get(key);
    return record ? { ...record } : null;
  },
  async saveBreaker(record) {
    memoryBreakers.set(record.key, { ...record });
  },
};

function resolveStore(): CircuitBreakerStore {
  checkMemoryFallbackWarning("circuit-breaker", !!process.env.ASTRA_DB_APPLICATION_TOKEN);
  return process.env.ASTRA_DB_APPLICATION_TOKEN ? astraStore : memoryStore;
}

const astraStore: CircuitBreakerStore = {
  async getBreaker(key) {
    try {
      const col = await getCollection();
      const doc = await col.findOne({ kind: "breaker", key });
      if (!doc) return null;
      return {
        key,
        state: doc.state === "OPEN" ? "OPEN" : "CLOSED",
        consecutiveFailures: Number(doc.consecutiveFailures ?? 0),
        openedAt: doc.openedAt ? String(doc.openedAt) : undefined,
      };
    } catch {
      return null;
    }
  },

  async saveBreaker(record) {
    try {
      const col = await getCollection();
      const patch: Record<string, unknown> = {
        consecutiveFailures: record.consecutiveFailures,
      };
      if (record.state === "OPEN") {
        patch.state = "OPEN";
        patch.openedAt = record.openedAt || new Date().toISOString();
      } else {
        patch.state = "CLOSED";
        patch.openedAt = null;
      }
      await col.updateOne(
        { kind: "breaker", key: record.key },
        { $set: patch },
        { upsert: true }
      );
    } catch (err) {
      console.error("[recovery/circuit-breaker] saveBreaker failed:", err);
    }
  },
};

export const circuitBreakerStore: CircuitBreakerStore = {
  getBreaker: (key) => resolveStore().getBreaker(key),
  saveBreaker: (record) => resolveStore().saveBreaker(record),
};

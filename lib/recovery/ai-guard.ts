import { createHash } from "crypto";
import { normalizeMessageForFingerprint } from "./incidents-core";
import { checkMemoryFallbackWarning } from "./logging";
import { AiDiagnosis } from "./types";

/**
 * AI diagnosis budget + diagnosis cache (Hardening H1/H2).
 *
 * Budget: at most AI_RECOVERY_MAX_DIAGNOSES_PER_FINGERPRINT GPT calls per
 * fingerprint per AI_RECOVERY_DIAGNOSIS_WINDOW_SECONDS. Persisted in Astra
 * (multi-instance safe, last-writer-wins under extreme races — bounded, never
 * unbounded). Exhaustion NEVER blocks incident creation; it only skips the
 * AI stage (incident records aiDiagnosisSkipReason: "budget_exhausted").
 *
 * Cache: GPT responses keyed by normalized technical context (provider,
 * operation, category, errorCode, httpStatus, redacted message) — never
 * secrets, never business IDs. TTL + bounded entry count. Failed GPT calls
 * are never cached (no poisoning). Cached diagnoses are advisory only and
 * still pass the normal policy gate on every use.
 *
 * Both are fail-open: a storage failure degrades the guards (diagnosis
 * allowed, cache miss) but never breaks the recovery pipeline.
 */

export const AI_BUDGET_MAX_DEFAULT = 5;
export const AI_BUDGET_WINDOW_SECONDS_DEFAULT = 3600;
export const AI_CACHE_TTL_SECONDS_DEFAULT = 3600;
export const AI_CACHE_MAX_ENTRIES_DEFAULT = 500;

function readEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function aiBudgetMax(): number {
  return readEnvInt("AI_RECOVERY_MAX_DIAGNOSES_PER_FINGERPRINT", AI_BUDGET_MAX_DEFAULT);
}

export function aiBudgetWindowMs(): number {
  return readEnvInt("AI_RECOVERY_DIAGNOSIS_WINDOW_SECONDS", AI_BUDGET_WINDOW_SECONDS_DEFAULT) * 1000;
}

export function aiCacheTtlMs(): number {
  return readEnvInt("AI_RECOVERY_DIAGNOSIS_CACHE_TTL_SECONDS", AI_CACHE_TTL_SECONDS_DEFAULT) * 1000;
}

export function aiCacheMaxEntries(): number {
  return readEnvInt("AI_RECOVERY_DIAGNOSIS_CACHE_MAX_ENTRIES", AI_CACHE_MAX_ENTRIES_DEFAULT);
}

export type AiBudgetRecord = {
  fingerprint: string;
  count: number;
  windowStart: string;
};

export type AiDiagnosisCacheEntry = {
  key: string;
  diagnosis: AiDiagnosis;
  cachedAt: string;
  expiresAt: string;
};

/** Persistence contract (Astra-backed default; in-memory in tests). */
export type AiGuardStore = {
  findBudget(fingerprint: string): Promise<AiBudgetRecord | null>;
  saveBudget(record: AiBudgetRecord): Promise<void>;
  findCache(key: string): Promise<AiDiagnosisCacheEntry | null>;
  saveCache(entry: AiDiagnosisCacheEntry): Promise<void>;
  /** All cache entries, oldest first (used to bound total size). */
  listCacheOldestFirst(): Promise<AiDiagnosisCacheEntry[]>;
  deleteCache(key: string): Promise<void>;
};

export type BudgetResult = { allowed: boolean; used: number; limit: number };

/**
 * Check + consume one budget slot for a fingerprint. Opens a fresh window
 * when the previous window has elapsed. Fail-open: if the store errors, the
 * diagnosis is allowed (the guard must never block recovery itself).
 */
export async function consumeDiagnosisBudget(
  store: AiGuardStore,
  fingerprint: string
): Promise<BudgetResult> {
  const limit = aiBudgetMax();
  const windowMs = aiBudgetWindowMs();
  const now = Date.now();

  try {
    const record = await store.findBudget(fingerprint);
    if (!record) {
      await store.saveBudget({ fingerprint, count: 1, windowStart: new Date(now).toISOString() });
      return { allowed: true, used: 1, limit };
    }
    const windowStart = new Date(record.windowStart).getTime();
    if (!Number.isFinite(windowStart) || now - windowStart >= windowMs) {
      await store.saveBudget({ fingerprint, count: 1, windowStart: new Date(now).toISOString() });
      return { allowed: true, used: 1, limit };
    }
    if (record.count >= limit) {
      return { allowed: false, used: record.count, limit };
    }
    await store.saveBudget({ fingerprint, count: record.count + 1, windowStart: record.windowStart });
    return { allowed: true, used: record.count + 1, limit };
  } catch {
    return { allowed: true, used: 0, limit };
  }
}

/** Cache key: normalized technical context only — no secrets, no business IDs. */
export function computeDiagnosisCacheKey(input: {
  provider: string;
  operation: string;
  httpStatus?: number;
  errorCode?: string;
  message: string;
}): string {
  const message = normalizeMessageForFingerprint(input.message || "");
  const parts = [
    input.provider || "unknown",
    input.operation,
    input.errorCode || String(input.httpStatus || "no-status"),
    message || "-",
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

/** Read a non-expired cache entry. A storage error is a miss (fail-open). */
export async function getCachedDiagnosis(
  store: AiGuardStore,
  key: string
): Promise<AiDiagnosisCacheEntry | null> {
  try {
    const entry = await store.findCache(key);
    if (!entry) return null;
    const expiresAt = new Date(entry.expiresAt).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
    return entry;
  } catch {
    return null;
  }
}

/** Store a validated diagnosis and keep the cache bounded (TTL + max entries). */
export async function cacheDiagnosis(
  store: AiGuardStore,
  key: string,
  diagnosis: AiDiagnosis
): Promise<void> {
  try {
    const ttlMs = aiCacheTtlMs();
    const now = Date.now();
    await store.saveCache({
      key,
      diagnosis,
      cachedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlMs).toISOString(),
    });
    await pruneCache(store);
  } catch {
    // caching is best-effort — never break the pipeline
  }
}

async function pruneCache(store: AiGuardStore): Promise<void> {
  try {
    const max = aiCacheMaxEntries();
    const all = await store.listCacheOldestFirst();
    const now = Date.now();
    let kept = 0;
    for (const entry of all) {
      const expiresAt = new Date(entry.expiresAt).getTime();
      const expired = !Number.isFinite(expiresAt) || expiresAt <= now;
      if (expired || kept >= max) {
        await store.deleteCache(entry.key);
      } else {
        kept++;
      }
    }
  } catch {
    // pruning is best-effort
  }
}

// ---------------------------------------------------------------------------
// Astra-backed default store
// ---------------------------------------------------------------------------

/**
 * Astra-backed guard state. Collection: `recovery_ai_guard`, one doc per
 * concern discriminated by `kind`: "budget" | "cache". Lazy-created following
 * the incidents collection pattern. Every operation fails safe (never throws).
 */
async function getCollection() {
  const { recoveryGuardCollection } = await import("@/lib/astra");
  return recoveryGuardCollection;
}

async function ensureCollection(): Promise<void> {
  try {
    const col = await getCollection();
    await col.findOne({ kind: "guard-init" });
  } catch (err: unknown) {
    const msg = (err as Error)?.message || "";
    if (/does not exist|collection|COLLECTION/i.test(msg)) {
      try {
        const db = (await import("@/lib/astra")).default;
        await db.createCollection("recovery_ai_guard");
        const col = await getCollection();
        await col.findOne({ kind: "guard-init" });
      } catch (createErr) {
        console.error("[recovery/ai-guard] could not create collection:", createErr);
      }
    } else {
      console.error("[recovery/ai-guard] ensure collection failed:", err);
    }
  }
}

/**
 * In-memory fallback used when Astra is not configured (tests/dev). Same
 * contract as the Astra-backed store; state is process-local and reset on
 * restart. Never used in production, where ASTRA_DB_APPLICATION_TOKEN is set.
 */
const memoryBudget = new Map<string, AiBudgetRecord>();
const memoryCache = new Map<string, AiDiagnosisCacheEntry>();

const memoryStore: AiGuardStore = {
  async findBudget(fingerprint) {
    return memoryBudget.get(fingerprint) ?? null;
  },
  async saveBudget(record) {
    memoryBudget.set(record.fingerprint, { ...record });
  },
  async findCache(key) {
    return memoryCache.get(key) ?? null;
  },
  async saveCache(entry) {
    memoryCache.set(entry.key, entry);
  },
  async listCacheOldestFirst() {
    return Array.from(memoryCache.entries())
      .map(([, entry]) => entry)
      .sort((a, b) => a.cachedAt.localeCompare(b.cachedAt));
  },
  async deleteCache(key) {
    memoryCache.delete(key);
  },
};

function resolveStore(): AiGuardStore {
  checkMemoryFallbackWarning("ai-guard", !!process.env.ASTRA_DB_APPLICATION_TOKEN);
  return process.env.ASTRA_DB_APPLICATION_TOKEN ? astraStore : memoryStore;
}

/** Test-only: clear the in-memory fallback state (no-op for the Astra store). */
export function resetAiGuardStateForTests(): void {
  memoryBudget.clear();
  memoryCache.clear();
}

const astraStore: AiGuardStore = {
  async findBudget(fingerprint) {
    try {
      const col = await getCollection();
      const doc = await col.findOne({ kind: "budget", fingerprint });
      if (!doc) return null;
      return {
        fingerprint,
        count: Number(doc.count ?? 0),
        windowStart: String(doc.windowStart ?? ""),
      };
    } catch {
      return null;
    }
  },

  async saveBudget(record) {
    try {
      await ensureCollection();
      const col = await getCollection();
      await col.updateOne(
        { kind: "budget", fingerprint: record.fingerprint },
        { $set: { count: record.count, windowStart: record.windowStart } },
        { upsert: true }
      );
    } catch (err) {
      console.error("[recovery/ai-guard] saveBudget failed:", err);
    }
  },

  async findCache(key) {
    try {
      const col = await getCollection();
      const doc = await col.findOne({ kind: "cache", key });
      if (!doc) return null;
      return {
        key,
        diagnosis: doc.diagnosis as AiDiagnosis,
        cachedAt: String(doc.cachedAt ?? ""),
        expiresAt: String(doc.expiresAt ?? ""),
      };
    } catch {
      return null;
    }
  },

  async saveCache(entry) {
    try {
      await ensureCollection();
      const col = await getCollection();
      await col.updateOne(
        { kind: "cache", key: entry.key },
        {
          $set: {
            diagnosis: entry.diagnosis,
            cachedAt: entry.cachedAt,
            expiresAt: entry.expiresAt,
          },
        },
        { upsert: true }
      );
    } catch (err) {
      console.error("[recovery/ai-guard] saveCache failed:", err);
    }
  },

  async listCacheOldestFirst() {
    try {
      await ensureCollection();
      const col = await getCollection();
      const docs = await col.find({ kind: "cache" }).sort({ cachedAt: 1 } as never).toArray();
      return docs as unknown as AiDiagnosisCacheEntry[];
    } catch {
      return [];
    }
  },

  async deleteCache(key) {
    try {
      const col = await getCollection();
      await col.deleteOne({ kind: "cache", key });
    } catch (err) {
      console.error("[recovery/ai-guard] deleteCache failed:", err);
    }
  },
};

export const aiGuardStore: AiGuardStore = {
  findBudget: (fingerprint) => resolveStore().findBudget(fingerprint),
  saveBudget: (record) => resolveStore().saveBudget(record),
  findCache: (key) => resolveStore().findCache(key),
  saveCache: (entry) => resolveStore().saveCache(entry),
  listCacheOldestFirst: () => resolveStore().listCacheOldestFirst(),
  deleteCache: (key) => resolveStore().deleteCache(key),
};

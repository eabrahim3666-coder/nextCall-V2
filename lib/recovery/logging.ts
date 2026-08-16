import { RecoveryLogEvent, RecoveryLogger } from "./types";

/**
 * Structured observability for the recovery system.
 *
 * Plain JSON console lines (repo convention: console logging only); never
 * includes secrets — callers must pass sanitized data.
 */

export const recoveryLogger: RecoveryLogger = {
  log(event: RecoveryLogEvent) {
    const line = JSON.stringify({ ...event, ts: event.ts || new Date().toISOString() });
    console.log(`[recovery] ${line}`);
  },
};

export function createSilentLogger(): RecoveryLogger {
  return { log() {} };
}

let warnedMemoryFallback = false;

/**
 * Once-per-process guard: recovery guards (AI budget/cache, circuit breaker)
 * silently fall back to process-local in-memory stores when Astra is not
 * configured. That is fine for tests/local dev, but in production it weakens
 * multi-instance protection and resets state on cold starts — so warn loudly,
 * exactly once, never per request. Fail-safe: this never throws.
 *
 * Note: `warnedMemoryFallback` is only set when the warning actually fires,
 * so a non-production caller never suppresses the production warning later.
 */
export function checkMemoryFallbackWarning(component: string, usingAstra: boolean): void {
  if (usingAstra || warnedMemoryFallback) return;
  if (process.env.NODE_ENV !== "production") return;
  warnedMemoryFallback = true;
  console.error(
    `[recovery/${component}] CRITICAL: recovery persistence is running in IN-MEMORY FALLBACK mode. ` +
      `ASTRA_DB_APPLICATION_TOKEN is not set, so the AI diagnosis budget/cache and circuit-breaker ` +
      `state are process-local, reset on restart, and are NOT shared across instances. ` +
      `Set ASTRA_DB_APPLICATION_TOKEN in production.`
  );
}
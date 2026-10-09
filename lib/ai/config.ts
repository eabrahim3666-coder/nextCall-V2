/**
 * Shared AI provider configuration.
 *
 * Providers are declared with numbered environment slots and are tried in the
 * order they are declared (provider 1 is primary, provider 2 the fallback, …):
 *
 *   AI_PROVIDER_1_TYPE=openai
 *   AI_PROVIDER_1_API_KEY=...
 *   AI_PROVIDER_1_MODEL=...
 *
 *   AI_PROVIDER_2_TYPE=gemini
 *   AI_PROVIDER_2_API_KEY=...
 *   AI_PROVIDER_2_MODEL=...
 *
 *   # AI_PROVIDER_3_... etc — add as many as you need, no code change.
 *
 * Design rules:
 *   - The FIRST missing TYPE ends the scan (a numbering gap stops the list).
 *   - A provider's endpoint is derived from its TYPE, never guessed.
 *   - Backward compatible: if no AI_PROVIDER_* slots exist, the legacy
 *     OPENAI_API_KEY (+ optional OPENAI_MODEL) becomes provider 1.
 *   - Placeholder values are treated as "not configured" so the app keeps
 *     running on whatever providers ARE configured.
 *   - Never logged with a secret value, and never exposed via any endpoint.
 */

export type AiProviderType = "openai" | "gemini";

export type AiProvider = {
  /** Stable, non-secret identifier (e.g. "provider-1"). Used for pinning + logs. */
  id: string;
  type: AiProviderType;
  apiKey: string;
  model: string;
  /** Undefined = the OpenAI SDK's default endpoint. */
  baseURL?: string;
};

/** Endpoint per provider type. Derived, never hardcoded per-model. */
export const PROVIDER_BASE_URLS: Record<AiProviderType, string | undefined> = {
  // undefined -> https://api.openai.com/v1 (SDK default)
  openai: undefined,
  // Google's OpenAI-compatible endpoint (https://ai.google.dev/gemini-api/docs/openai)
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
};

/**
 * Model used when only the legacy OPENAI_API_KEY is configured. This preserves
 * the exact pre-migration behaviour (every call site used "gpt-4o-mini").
 */
export const LEGACY_OPENAI_MODEL = "gpt-4o-mini";

const MAX_PROVIDER_SLOTS = 12;

/** Values that are obvious placeholders rather than real credentials. */
const PLACEHOLDER_VALUE = /^(paste_|your_|placeholder|none|null|undefined|changeme|xxx+)/i;

const warned = new Set<string>();

function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  // Mirrors lib/openai.ts: warn, never throw — a bad env must not crash a build.
  console.warn(`[ai/config] ${message}`);
}

export function isAiProviderType(value: string): value is AiProviderType {
  return value === "openai" || value === "gemini";
}

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_VALUE.test(value.trim());
}

type RawSlot = { type: string; apiKey: string; model: string };

function readSlot(index: number): RawSlot | null {
  const prefix = `AI_PROVIDER_${index}_`;
  const type = (process.env[`${prefix}TYPE`] || "").trim().toLowerCase();
  if (!type) return null; // gap -> end of the provider list
  return {
    type,
    apiKey: (process.env[`${prefix}API_KEY`] || "").trim(),
    model: (process.env[`${prefix}MODEL`] || "").trim(),
  };
}

/**
 * Build the ordered provider chain from the environment.
 *
 * Exposed (not just memoized) so tests can exercise it against controlled env.
 */
export function resolveProviders(): AiProvider[] {
  const providers: AiProvider[] = [];

  for (let index = 1; index <= MAX_PROVIDER_SLOTS; index++) {
    const slot = readSlot(index);
    if (!slot) break;

    const slotName = `AI_PROVIDER_${index}`;

    if (!isAiProviderType(slot.type)) {
      warnOnce(
        `unknown-type:${slotName}`,
        `${slotName}_TYPE="${slot.type}" is not a supported provider type (openai|gemini) — skipping this slot.`
      );
      continue;
    }

    let apiKey = slot.apiKey;
    let model = slot.model;

    // Backward compatibility: provider 1 (OpenAI) falls back to the legacy
    // OPENAI_API_KEY / OPENAI_MODEL vars when the slot omits them.
    if (index === 1 && slot.type === "openai") {
      if (!apiKey) apiKey = (process.env.OPENAI_API_KEY || "").trim();
      if (!model) model = (process.env.OPENAI_MODEL || LEGACY_OPENAI_MODEL).trim();
    }

    if (isPlaceholder(apiKey)) {
      warnOnce(
        `placeholder:${slotName}`,
        `${slotName}_API_KEY is still a placeholder — provider "${slotName}" is not active.`
      );
      continue;
    }
    if (!apiKey) {
      warnOnce(`nokey:${slotName}`, `${slotName}_API_KEY is missing — provider "${slotName}" is not active.`);
      continue;
    }
    if (!model) {
      warnOnce(`nomodel:${slotName}`, `${slotName}_MODEL is missing — provider "${slotName}" is not active.`);
      continue;
    }

    providers.push({
      id: `provider-${index}`,
      type: slot.type,
      apiKey,
      model,
      baseURL: PROVIDER_BASE_URLS[slot.type],
    });
  }

  if (providers.length > 0) return providers;

  // Legacy bridge: no numbered slots at all -> use OPENAI_API_KEY only.
  const legacyKey = (process.env.OPENAI_API_KEY || "").trim();
  if (legacyKey && !isPlaceholder(legacyKey)) {
    return [
      {
        id: "provider-1",
        type: "openai",
        apiKey: legacyKey,
        model: (process.env.OPENAI_MODEL || LEGACY_OPENAI_MODEL).trim(),
        baseURL: undefined,
      },
    ];
  }

  warnOnce(
    "no-providers",
    "No AI providers configured. Set AI_PROVIDER_1_TYPE/API_KEY/MODEL (and optionally AI_PROVIDER_2_*), or OPENAI_API_KEY. AI features will return a controlled error until then."
  );
  return [];
}

let cached: AiProvider[] | null = null;

/** Memoized provider chain (read once per process, like the other clients). */
export function getProviders(): AiProvider[] {
  if (cached === null) cached = resolveProviders();
  return cached;
}

export function hasConfiguredProvider(): boolean {
  return getProviders().length > 0;
}

/** Secret-free view for health/ops output. */
export function getProviderSummaries(): { id: string; type: AiProviderType; model: string }[] {
  return getProviders().map((p) => ({ id: p.id, type: p.type, model: p.model }));
}

/** Test-only: drop the memoized chain so env changes take effect. */
export function resetProvidersForTests(): void {
  cached = null;
  warned.clear();
}

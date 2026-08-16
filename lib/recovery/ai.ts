import { AiAnalysisInput, AiDiagnosis, ErrorCategory, Severity } from "./types";
import { getRecommendableActions } from "./registry";
import { recoveryLogger } from "./logging";

/**
 * AI diagnostic component (GPT-4o-mini).
 *
 * GPT IS A DIAGNOSTIC COMPONENT. IT IS NOT THE EXECUTION AUTHORITY.
 * It may only recommend a recovery action from the registry-backed allow list;
 * the backend policy engine decides whether anything actually runs.
 *
 * The analyzer NEVER makes the app depend on OpenAI being available: every
 * failure path returns null (caller falls back to deterministic handling).
 */

export const AI_DIAGNOSIS_MODEL = "gpt-4o-mini";

const DIAGNOSIS_SCHEMA_PROMPT = `You are a production SRE diagnosing a software failure. You are NOT authorized to execute anything and you cannot change any system state. You may ONLY recommend one recovery action from the exact list of allowed actions below, or NO_SAFE_RECOVERY.

RULES:
- Never invent a recovery action. Never propose arbitrary fixes or code changes.
- If the best fix is not in the allowed list (or you are unsure), return NO_SAFE_RECOVERY.
- classification must be one of: RATE_LIMIT, AUTHENTICATION, AUTHORIZATION, TIMEOUT, NETWORK, SERVER_ERROR, VALIDATION, DUPLICATE, NOT_FOUND, UNKNOWN.
- severity must be one of: LOW, MEDIUM, HIGH, CRITICAL.
- confidence must be a number between 0 and 1. Be honest; unknown errors get low confidence.
- safeRecoveryAvailable must be false unless you recommend an allowed action.
- Reply with STRICT JSON only. No markdown, no commentary: {"classification":"...","severity":"...","retryable":true|false,"rootCause":"...","recommendedAction":"...","confidence":0.0,"reason":"...","safeRecoveryAvailable":true|false}`;

const ALLOWED_CLASSIFICATIONS: ErrorCategory[] = [
  "RATE_LIMIT", "AUTHENTICATION", "AUTHORIZATION", "TIMEOUT", "NETWORK",
  "SERVER_ERROR", "VALIDATION", "DUPLICATE", "NOT_FOUND", "UNKNOWN",
];
const ALLOWED_SEVERITIES: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function validateDiagnosis(raw: unknown): AiDiagnosis | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.classification !== "string" || !ALLOWED_CLASSIFICATIONS.includes(r.classification as ErrorCategory)) return null;
  if (typeof r.severity !== "string" || !ALLOWED_SEVERITIES.includes(r.severity as Severity)) return null;
  if (typeof r.retryable !== "boolean") return null;
  if (typeof r.rootCause !== "string") return null;
  if (typeof r.recommendedAction !== "string") return null;
  if (typeof r.confidence !== "number" || r.confidence < 0 || r.confidence > 1) return null;
  if (typeof r.reason !== "string") return null;
  if (typeof r.safeRecoveryAvailable !== "boolean") return null;

  if (r.safeRecoveryAvailable && r.recommendedAction === "NO_SAFE_RECOVERY") return null;

  // The recommended action must come from the allow list the backend handed over —
  // even adversarial responses can't name an action that isn't in it.
  const allowed = new Set((r._allowedActions as string[]) || []);
  if (r.recommendedAction !== "NO_SAFE_RECOVERY" && !allowed.has(r.recommendedAction as string)) {
    return null;
  }

  return {
    classification: r.classification as ErrorCategory,
    severity: r.severity as Severity,
    retryable: r.retryable,
    rootCause: String(r.rootCause).slice(0, 1000),
    recommendedAction: r.recommendedAction as string,
    confidence: r.confidence,
    reason: String(r.reason).slice(0, 1000),
    safeRecoveryAvailable: r.safeRecoveryAvailable,
  };
}

function buildPrompt(input: AiAnalysisInput): string {
  const actions = input.allowedActions.map((a) => `- ${a.id}: ${a.description}`).join("\n");
  const previous = input.previousRecoveryAttempts.length
    ? input.previousRecoveryAttempts
        .map((p) => `- action=${p.action}, result=${p.result}`)
        .join("\n")
    : "none";

  return `${DIAGNOSIS_SCHEMA_PROMPT}

ALLOWED ACTIONS:
${actions || "- NO_SAFE_RECOVERY (no actions are available)"}

FAILURE CONTEXT:
- provider: ${input.provider}
- operation: ${input.operation}
- httpStatus: ${input.httpStatus ?? "n/a"}
- errorCode: ${input.errorCode ?? "n/a"}
- errorMessage: ${input.sanitizedMessage.slice(0, 1500)}
- stack: ${(input.sanitizedStack || "").slice(0, 800) || "n/a"}
- context: ${JSON.stringify(input.context).slice(0, 1200)}
- retryCount: ${input.retryCount}
- previousRecoveryAttempts: ${previous}`;
}

/** Safest possible injected analyzer for tests / emergencies. */
export const conservativeAnalyzer: {
  analyze(input: AiAnalysisInput): Promise<AiDiagnosis>;
} = {
  async analyze() {
    return {
      classification: "UNKNOWN",
      severity: "HIGH",
      retryable: false,
      rootCause: "AI analysis unavailable — conservative fallback.",
      recommendedAction: "NO_SAFE_RECOVERY",
      confidence: 0,
      reason: "No analysis performed.",
      safeRecoveryAvailable: false,
    };
  },
};

export async function diagnoseWithGpt(
  input: AiAnalysisInput,
  deps: { openai?: typeof import("@/lib/openai").default } = {}
): Promise<AiDiagnosis | null> {
  const allowedActions = input.allowedActions.length
    ? input.allowedActions
    : getRecommendableActions(input.provider, input.operation);
  const effectiveInput = { ...input, allowedActions };

  const openai =
    deps.openai ||
    (await import("@/lib/openai")).default;

  recoveryLogger.log({
    event: "ai_diagnosis_requested",
    provider: input.provider,
    operation: input.operation,
    ts: new Date().toISOString(),
  });

  try {
    const response = await openai.chat.completions.create(
      {
        model: AI_DIAGNOSIS_MODEL,
        temperature: 0,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildPrompt(effectiveInput) },
        ],
      },
      { timeout: 15_000 }
    );

    const rawText = response.choices?.[0]?.message?.content || "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      recoveryLogger.log({
        event: "ai_diagnosis_failed",
        provider: input.provider,
        operation: input.operation,
        result: "invalid_json",
        ts: new Date().toISOString(),
      });
      return null;
    }

    // Attach the allow list so validation is self-contained.
    (parsed as Record<string, unknown>)._allowedActions = allowedActions.map((a) => a.id);
    const validated = validateDiagnosis(parsed);
    if (!validated) {
      recoveryLogger.log({
        event: "ai_diagnosis_failed",
        provider: input.provider,
        operation: input.operation,
        result: "schema_validation_failed",
        ts: new Date().toISOString(),
      });
      return null;
    }
    return validated;
  } catch (err) {
    recoveryLogger.log({
      event: "ai_diagnosis_failed",
      provider: input.provider,
      operation: input.operation,
      result: (err as Error)?.message?.slice(0, 200) || "openai_error",
      ts: new Date().toISOString(),
    });
    return null;
  }
}
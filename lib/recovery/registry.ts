import {
  ErrorCategory,
  OperationExecutor,
  Provider,
  RecoveryActionExecutor,
} from "./types";

/**
 * Backend-controlled registry of SAFE recovery actions.
 *
 * GPT may ONLY recommend an action by its ID. Nothing is ever executed unless
 * it exists here, is enabled, and passes the policy checks in policy.ts.
 * AI can never register new actions — only code can.
 */

export type RecoveryActionDef = {
  id: string;
  provider: Provider;
  description: string;
  /** Operations this action may apply to. "*" = any operation for the provider. */
  operations: string[] | "*";
  /** Error categories this action may respond to. */
  allowedCategories: ErrorCategory[];
  maxAttempts: number;
  enabled: boolean;
  /** Whether executing the action requires a fresh provider round-trip. */
  requiresReexecution: boolean;
};

export const RECOVERY_ACTIONS: Record<string, RecoveryActionDef> = {
  TWILIO_USE_SUBACCOUNT_AUTH: {
    id: "TWILIO_USE_SUBACCOUNT_AUTH",
    provider: "twilio",
    description:
      "Retry the operation using the business's own Twilio subaccount scope (master credentials + accountSid). Only triggers when the parent-scoped call fails with an authentication/authorization error.",
    operations: ["create_tollfree_verification", "update_tollfree_verification"],
    allowedCategories: ["AUTHENTICATION", "AUTHORIZATION"],
    maxAttempts: 1,
    enabled: true,
    requiresReexecution: true,
  },
  GOOGLE_REFRESH_OAUTH_TOKEN: {
    id: "GOOGLE_REFRESH_OAUTH_TOKEN",
    provider: "google",
    description:
      "Force an OAuth token refresh using the business's stored refresh token, then retry the operation once.",
    operations: ["calendar_insert_event", "list_business_reviews", "reply_to_review"],
    allowedCategories: ["AUTHENTICATION", "AUTHORIZATION"],
    maxAttempts: 1,
    enabled: true,
    requiresReexecution: true,
  },
  RETRY_ONCE_READ: {
    id: "RETRY_ONCE_READ",
    provider: "unknown",
    description:
      "Retry a read-only operation once after a transient network/server failure. Never used for mutating operations.",
    operations: "*",
    allowedCategories: ["NETWORK", "TIMEOUT", "SERVER_ERROR"],
    maxAttempts: 1,
    enabled: true,
    requiresReexecution: true,
  },
};

const actionExecutors = new Map<string, RecoveryActionExecutor>();

export function registerRecoveryActionExecutor(
  actionId: string,
  executor: RecoveryActionExecutor
): void {
  actionExecutors.set(actionId, executor);
}

export function getActionExecutor(actionId: string): RecoveryActionExecutor | undefined {
  return actionExecutors.get(actionId);
}

export function hasActionExecutor(actionId: string): boolean {
  return actionExecutors.has(actionId);
}

/** List of actions available for AI to recommend (id + description only). */
export function getRecommendableActions(
  provider: Provider,
  operation: string
): { id: string; description: string }[] {
  return Object.values(RECOVERY_ACTIONS)
    .filter((a) => a.enabled)
    .filter((a) => a.provider === provider || a.provider === "unknown")
    .filter((a) => a.operations === "*" || (Array.isArray(a.operations) && a.operations.includes(operation)))
    .map((a) => ({ id: a.id, description: a.description }));
}

const operationExecutors = new Map<string, OperationExecutor>();

function executorKey(provider: Provider, operation: string): string {
  return `${provider}:${operation}`;
}

/** Register a re-execution function for an operation (used by admin manual retry). */
export function registerOperationExecutor(
  provider: Provider,
  operation: string,
  executor: OperationExecutor
): void {
  operationExecutors.set(executorKey(provider, operation), executor);
}

export function getOperationExecutor(
  provider: Provider,
  operation: string
): OperationExecutor | undefined {
  return operationExecutors.get(executorKey(provider, operation));
}

/** Test-only reset so suites are isolated. */
export function resetRegistryForTests(): void {
  actionExecutors.clear();
  operationExecutors.clear();
}
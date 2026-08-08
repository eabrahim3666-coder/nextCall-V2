import "server-only";

import { businessesCollection, withRetry } from "@/lib/astra";

export const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

export async function findBusinessByUserId(userId: string) {
    try {
        const directMatch = await withRetry(() =>
            businessesCollection.findOne({ business_id: userId })
        );
        return directMatch ?? null;
    } catch {
        console.error("AstraDB unavailable — returning null business");
        return null;
    }
}

type TrialInfo = {
    status?: string;
    plan_type?: string;
    plan?: string;
    trial_ends_at?: string;
    trial_started_at?: string;
    created_at?: string;
    [key: string]: unknown;
};

export function getTrialEndsAt(business: TrialInfo | null) {
    if (!business) return new Date();
    if (business.trial_ends_at) return new Date(business.trial_ends_at);
    const start = business.trial_started_at || business.created_at;
    return new Date(new Date(start || Date.now()).getTime() + TRIAL_DURATION_MS);
}

export function isTrialExpired(business: TrialInfo | null) {
    if (!business) return false;
    if (business.status === "trial_expired") return true;
    if (business.plan_type !== "trial" && business.plan !== "trial") return false;
    return getTrialEndsAt(business).getTime() <= Date.now();
}

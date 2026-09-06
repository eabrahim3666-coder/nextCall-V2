import "server-only";

import { businessesCollection, withRetry } from "@/lib/astra";

export const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Shape of a document in the `businesses` collection as consumed across the
 * app. All fields optional except the identity — documents are created at
 * onboarding and enriched incrementally (Paddle activation, integrations,
 * compliance), so any field may be absent on an older record.
 */
export type BusinessDoc = {
    business_id: string;
    business_name?: string;
    business_type?: string;
    service_area?: string;
    business_timezone?: string;
    owner_phone?: string;
    hours?: string;
    services?: string;
    exclusions?: string;
    pricing_rules?: string;
    notes?: string;
    faq?: Array<{ question: string; answer: string }>;
    greeting_tone?: string;
    greeting_text?: string;
    ai_name?: string;
    emergency_definition?: string;
    routing_rules?: {
        forward_emergency?: boolean;
        notify_hot_lead?: boolean;
        sms_missed_call?: boolean;
        email_followup?: boolean;
        daily_summary?: boolean;
        appointment_reminders?: boolean;
        review_followup?: boolean;
        [key: string]: boolean | undefined;
    };
    knowledge_base_text?: string;
    referral_code?: string;
    referral_applied_at?: string | null;
    bonus_minutes?: number;
    status?: string;
    plan?: string;
    plan_type?: string;
    trial_started_at?: string;
    trial_ends_at?: string;
    trial_expired?: boolean;
    minutes_limit?: number;
    total_minutes_used?: number;
    total_calls_processed?: number;
    avg_job_value?: number;
    twilio_number?: string;
    twilio_numbers?: string[];
    twilio_subaccount_sid?: string;
    paddle_customer_id?: string | null;
    paddle_subscription_id?: string | null;
    google_refresh_token?: string | null;
    google_account_email?: string | null;
    zapier_webhook_url?: string | null;
    review_link?: string;
    meta_page_access_token?: string | null;
    meta_page_id?: string | null;
    meta_page_name?: string | null;
    meta_page_picture?: string | null;
    meta_ig_business_id?: string | null;
    meta_ig_business_name?: string | null;
    jobs_completed?: Array<Record<string, unknown>>;
    created_at?: string;
    [key: string]: unknown;
};

export async function findBusinessByUserId(userId: string): Promise<BusinessDoc | null> {
    try {
        const directMatch = (await withRetry(() =>
            businessesCollection.findOne({ business_id: userId })
        )) as BusinessDoc | null;
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

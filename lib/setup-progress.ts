import type { BusinessDoc } from "@/lib/business";

/**
 * Setup Progress / Profile Strength scoring.
 *
 * Pure function — no DB or API access. Callers pass the business doc plus the
 * two signals that live outside it (SMS compliance, call history). The result
 * drives the dashboard sidebar's SetupProgressSidebar, which hides itself at
 * 100%.
 *
 * Secret-bearing fields (e.g. google_refresh_token) are only ever reduced to
 * a boolean here — the value must never reach the client.
 */

export type SetupItem = {
    id: string;
    label: string;
    done: boolean;
    /** Deep link to the settings tab that fixes this item, when one exists. */
    fixUrl?: string;
    /** Human explanation shown on the checklist row. */
    hint?: string;
};

export type SetupProgress = {
    percent: number;
    items: SetupItem[];
    remaining: SetupItem[];
    doneCount: number;
    total: number;
    allDone: boolean;
};

const truthy = (v: unknown): boolean =>
    typeof v === "string" ? v.trim().length > 0 : Boolean(v);

export function computeSetupProgress(
    business: BusinessDoc | null,
    opts: { smsApproved: boolean; hasCalls: boolean }
): SetupProgress {
    const b = business ?? ({} as BusinessDoc);

    const items: SetupItem[] = [
        {
            id: "profile",
            label: "Business profile",
            done: truthy(b.business_name) && truthy(b.owner_phone) && truthy(b.business_type) && truthy(b.service_area),
            fixUrl: "/dashboard/settings?focus=business",
            hint: "Name, phone, type and service area",
        },
        {
            id: "hours_services",
            label: "Hours & services",
            done: truthy(b.hours) && truthy(b.services),
            fixUrl: "/dashboard/settings?focus=business",
            hint: "So the AI can answer 'when are you open?'",
        },
        {
            id: "knowledge",
            label: "AI knowledge enriched",
            done: truthy(b.pricing_rules) || truthy(b.exclusions) || (Array.isArray(b.faq) && b.faq.length > 0),
            fixUrl: "/dashboard/settings?focus=knowledge",
            hint: "Add pricing, exclusions or FAQs",
        },
        {
            id: "greeting",
            label: "Custom greeting & AI name",
            done: truthy(b.ai_name) && truthy(b.greeting_text),
            fixUrl: "/dashboard/settings?focus=greeting",
            hint: "How your AI introduces itself on calls",
        },
        {
            id: "emergency",
            label: "Emergency definition",
            done: truthy(b.emergency_definition),
            fixUrl: "/dashboard/settings?focus=routing",
            hint: "Which calls should be forwarded to you",
        },
        {
            id: "first_call",
            label: "First call received",
            done: opts.hasCalls || (typeof b.total_calls_processed === "number" && b.total_calls_processed > 0),
            hint: "Make a test call to your AI number",
        },
        {
            id: "sms",
            label: "SMS verification approved",
            done: opts.smsApproved,
            fixUrl: "/dashboard/settings?focus=sms",
            hint: "Required before any outbound texts",
        },
        {
            id: "google_calendar",
            label: "Google Calendar connected",
            done: truthy(b.google_refresh_token),
            fixUrl: "/dashboard/settings?focus=integrations",
            hint: "Appointments sync to your calendar",
        },
        {
            id: "review_link",
            label: "Review link set",
            done: truthy(b.review_link),
            fixUrl: "/dashboard/settings?focus=integrations",
            hint: "Used by automatic review follow-ups",
        },
        {
            id: "job_value",
            label: "Average job value",
            done: typeof b.avg_job_value === "number" && b.avg_job_value > 0,
            fixUrl: "/dashboard/settings?focus=billing",
            hint: "Unlocks revenue analytics",
        },
    ];

    const doneCount = items.filter((i) => i.done).length;
    const total = items.length;
    const percent = Math.round((doneCount / total) * 100);

    return {
        percent,
        items,
        remaining: items.filter((i) => !i.done),
        doneCount,
        total,
        allDone: doneCount === total,
    };
}

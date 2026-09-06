import { describe, it, expect } from 'vitest';
import { computeSetupProgress } from '../lib/setup-progress';
import type { BusinessDoc } from '../lib/business';

// A fully-set-up business — every setup item's done condition satisfied.
const completeBusiness: BusinessDoc = {
    business_id: 'biz-1',
    business_name: 'Acme Plumbing',
    owner_phone: '+15551230000',
    business_type: 'plumbing',
    service_area: 'Austin, TX',
    hours: 'Mon–Fri 9–5',
    services: 'Repairs, installs',
    pricing_rules: 'Callout $80',
    exclusions: 'No gas work',
    faq: [{ question: 'Do you do drains?', answer: 'Yes.' }],
    ai_name: 'Sam',
    greeting_text: 'Hi! Thanks for calling Acme.',
    emergency_definition: 'Burst pipe, flooding',
    total_calls_processed: 12,
    google_refresh_token: 'ya29.some-secret-refresh-token',
    review_link: 'https://g.page/acme/review',
    avg_job_value: 250,
};

const opts = { smsApproved: true, hasCalls: true };

describe('computeSetupProgress', () => {
    it('returns 100% and allDone when every item is satisfied', () => {
        const r = computeSetupProgress(completeBusiness, opts);
        expect(r.percent).toBe(100);
        expect(r.allDone).toBe(true);
        expect(r.doneCount).toBe(10);
        expect(r.total).toBe(10);
        expect(r.remaining).toHaveLength(0);
    });

    it('returns 0% for a null business with no external signals', () => {
        const r = computeSetupProgress(null, { smsApproved: false, hasCalls: false });
        expect(r.percent).toBe(0);
        expect(r.allDone).toBe(false);
        expect(r.doneCount).toBe(0);
        expect(r.remaining).toHaveLength(10);
    });

    it('counts 7 of 10 as 70% with the right remaining set', () => {
        // Knock out exactly 3 items: greeting, review link, job value.
        const partial: BusinessDoc = {
            ...completeBusiness,
            ai_name: '',
            review_link: '',
            avg_job_value: 0,
        };
        const out = computeSetupProgress(partial, opts);
        expect(out.doneCount).toBe(7);
        expect(out.percent).toBe(70);
        expect(out.allDone).toBe(false);
        expect(out.remaining.map((i) => i.id).sort()).toEqual(['greeting', 'job_value', 'review_link']);
    });

    it('knowledge item is satisfied by any one of pricing, exclusions, or FAQ', () => {
        for (const patch of [
            { pricing_rules: 'x', exclusions: '', faq: [] },
            { pricing_rules: '', exclusions: 'x', faq: [] },
            { pricing_rules: '', exclusions: '', faq: [{ question: 'q', answer: 'a' }] },
        ] as Partial<BusinessDoc>[]) {
            const r = computeSetupProgress({ ...completeBusiness, ...patch }, opts);
            expect(r.items.find((i) => i.id === 'knowledge')?.done).toBe(true);
        }
        const r = computeSetupProgress(
            { ...completeBusiness, pricing_rules: '', exclusions: '', faq: [] },
            opts
        );
        expect(r.items.find((i) => i.id === 'knowledge')?.done).toBe(false);
    });

    it('profile requires ALL four identity fields', () => {
        for (const missing of ['business_name', 'owner_phone', 'business_type', 'service_area'] as const) {
            const r = computeSetupProgress({ ...completeBusiness, [missing]: '' }, opts);
            expect(r.items.find((i) => i.id === 'profile')?.done).toBe(false);
        }
    });

    it('whitespace-only values count as incomplete', () => {
        const r = computeSetupProgress({ ...completeBusiness, emergency_definition: '   ' }, opts);
        expect(r.items.find((i) => i.id === 'emergency')?.done).toBe(false);
    });

    it('first call is satisfied by call history OR total_calls_processed', () => {
        const byHistory = computeSetupProgress({ ...completeBusiness, total_calls_processed: 0 }, { smsApproved: true, hasCalls: true });
        const byCounter = computeSetupProgress({ ...completeBusiness, total_calls_processed: 3 }, { smsApproved: true, hasCalls: false });
        expect(byHistory.items.find((i) => i.id === 'first_call')?.done).toBe(true);
        expect(byCounter.items.find((i) => i.id === 'first_call')?.done).toBe(true);
        const neither = computeSetupProgress({ ...completeBusiness, total_calls_processed: 0 }, { smsApproved: true, hasCalls: false });
        expect(neither.items.find((i) => i.id === 'first_call')?.done).toBe(false);
    });

    it('SMS item follows the smsApproved flag, not the business doc', () => {
        const r = computeSetupProgress(completeBusiness, { smsApproved: false, hasCalls: true });
        expect(r.items.find((i) => i.id === 'sms')?.done).toBe(false);
        expect(r.remaining.map((i) => i.id)).toContain('sms');
    });

    it('avg_job_value must be a positive number (0 or missing is incomplete)', () => {
        expect(computeSetupProgress({ ...completeBusiness, avg_job_value: 0 }, opts).items.find((i) => i.id === 'job_value')?.done).toBe(false);
        expect(computeSetupProgress({ ...completeBusiness, avg_job_value: undefined }, opts).items.find((i) => i.id === 'job_value')?.done).toBe(false);
        expect(computeSetupProgress({ ...completeBusiness, avg_job_value: 120 }, opts).items.find((i) => i.id === 'job_value')?.done).toBe(true);
    });

    it('NEVER leaks secret values — google connection is only ever a boolean', () => {
        const r = computeSetupProgress({ ...completeBusiness, google_refresh_token: 'super-secret-value-xyz' }, opts);
        const serialized = JSON.stringify(r);
        expect(serialized).not.toContain('super-secret-value-xyz');
        expect(r.items.find((i) => i.id === 'google_calendar')?.done).toBe(true);
    });

    it('every incomplete item that has a fixUrl points at the right settings tab', () => {
        const r = computeSetupProgress(null, { smsApproved: false, hasCalls: false });
        const fixUrls = Object.fromEntries(r.items.map((i) => [i.id, i.fixUrl]));
        expect(fixUrls.profile).toBe('/dashboard/settings?focus=business');
        expect(fixUrls.hours_services).toBe('/dashboard/settings?focus=business');
        expect(fixUrls.knowledge).toBe('/dashboard/settings?focus=knowledge');
        expect(fixUrls.greeting).toBe('/dashboard/settings?focus=greeting');
        expect(fixUrls.emergency).toBe('/dashboard/settings?focus=routing');
        expect(fixUrls.sms).toBe('/dashboard/settings?focus=sms');
        expect(fixUrls.google_calendar).toBe('/dashboard/settings?focus=integrations');
        expect(fixUrls.review_link).toBe('/dashboard/settings?focus=integrations');
        expect(fixUrls.job_value).toBe('/dashboard/settings?focus=billing');
        // first_call can't be fixed in settings — no link.
        expect(fixUrls.first_call).toBeUndefined();
    });
});

import {
    businessesCollection,
    callsCollection,
    conversationsCollection,
    notificationsCollection,
} from "@/lib/astra";
import AdminDashboardClient from "./_components/AdminDashboardClient";
import { clerkClient } from "@clerk/nextjs/server";
import { computeUsageCost, costRates, currentYm, ymKey, ymLabel, type UsageCost } from "@/lib/costing";

export const dynamic = 'force-dynamic';

type MonthCounts = { voice: number; sms: number; whatsapp: number };

type UsageBuckets = {
    /** business_id -> month key ("YYYY-MM") -> voice/sms/whatsapp counts */
    monthly: Map<string, Map<string, MonthCounts>>;
    /** business_id -> all-time SMS/WhatsApp message counts */
    allTimeMsgs: Map<string, { sms: number; whatsapp: number }>;
};

// Per-business usage bucketed by calendar month, computed from the call and
// conversation records (single find + client-side tally each — no N+1, no
// aggregation pipeline). Bounded to the loaded businesses via $in.
async function aggregateUsage(businessIds: string[]): Promise<UsageBuckets> {
    const monthly = new Map<string, Map<string, MonthCounts>>();
    const allTimeMsgs = new Map<string, { sms: number; whatsapp: number }>();
    if (businessIds.length === 0) return { monthly, allTimeMsgs };
    try {
        const bizFilter = { business_id: { $in: businessIds } };

        const calls = await callsCollection
            .find(bizFilter)
            .project({ business_id: 1, call_duration_minutes: 1, created_at: 1 })
            .toArray();
        for (const row of calls as Array<{ business_id?: unknown; call_duration_minutes?: unknown; created_at?: unknown }>) {
            const biz = String(row.business_id || "");
            const mins = Math.round(Number(row.call_duration_minutes || 0));
            const ym = ymKey(row.created_at as string | undefined);
            if (!biz || !mins || !ym) continue;
            const bm = monthly.get(biz) || new Map<string, MonthCounts>();
            const m = bm.get(ym) || { voice: 0, sms: 0, whatsapp: 0 };
            m.voice += mins;
            bm.set(ym, m);
            monthly.set(biz, bm);
        }

        const convos = await conversationsCollection
            .find({ ...bizFilter, channel: { $in: ["SMS", "WhatsApp"] } })
            .project({ business_id: 1, channel: 1, created_at: 1 })
            .toArray();
        for (const row of convos as Array<{ business_id?: unknown; channel?: unknown; created_at?: unknown }>) {
            const biz = String(row.business_id || "");
            const channel = String(row.channel || "");
            if (!biz) continue;
            const at = allTimeMsgs.get(biz) || { sms: 0, whatsapp: 0 };
            if (channel === "WhatsApp") at.whatsapp += 1;
            else at.sms += 1;
            allTimeMsgs.set(biz, at);

            const ym = ymKey(row.created_at as string | undefined);
            if (!ym) continue;
            const bm = monthly.get(biz) || new Map<string, MonthCounts>();
            const m = bm.get(ym) || { voice: 0, sms: 0, whatsapp: 0 };
            if (channel === "WhatsApp") m.whatsapp += 1;
            else m.sms += 1;
            bm.set(ym, m);
            monthly.set(biz, bm);
        }
    } catch (error) {
        console.error("Failed to aggregate usage:", error);
    }
    return { monthly, allTimeMsgs };
}

let clerkEmailCache: { at: number; emails: Record<string, string> } | null = null;

async function resolveMissingEmails(
    businesses: { business_id: string; email?: string }[]
): Promise<Record<string, string>> {
    const missingIds = businesses.filter((b) => !b.email).map((b) => b.business_id);
    if (missingIds.length === 0) return {};

    if (clerkEmailCache && Date.now() - clerkEmailCache.at < 60_000) {
        return clerkEmailCache.emails;
    }

    const emails: Record<string, string> = {};
    try {
        const clerk = await clerkClient();
        const users = await clerk.users.getUserList({ limit: 500 });
        for (const u of users.data) {
            const email = u.emailAddresses?.[0]?.emailAddress;
            if (email) emails[u.id] = email;
        }
        clerkEmailCache = { at: Date.now(), emails };
    } catch (error) {
        console.error("Failed to resolve Clerk emails:", error);
    }

    // Backfill so the emails stick in the DB (best-effort, non-blocking)
    for (const b of businesses) {
        const email = emails[b.business_id];
        if (email && !b.email) {
            businessesCollection
                .updateOne({ business_id: b.business_id }, { $set: { owner_email: email } })
                .catch(() => {});
        }
    }

    return emails;
}

export default async function AdminDashboard() {
    // 1. Fetch Global Stats (Limit to 500 most recent to prevent Vercel OOM crashes)
    const allBusinesses = await businessesCollection.find({}).sort({ created_at: -1 }).limit(500).toArray();

    // Use estimated counts for the header stats to avoid loading everything into memory
    const totalUsers = await businessesCollection.countDocuments({}, 1000000);

    const totalCallsProcessed = allBusinesses.reduce((sum: number, b: any) => sum + (b.total_calls_processed || 0), 0);
    const totalMinutesConsumed = allBusinesses.reduce((sum: number, b: any) => sum + (b.total_minutes_used || 0), 0);

    // 2. Document Counts for DB Estimation
    const businessCount = totalUsers;
    const callsCount = await callsCollection.countDocuments({}, 1000000);
    const convoCount = await conversationsCollection.countDocuments({}, 1000000);
    const notifCount = await notificationsCollection.countDocuments({}, 1000000);
    const totalDocuments = businessCount + callsCount + convoCount + notifCount;

    // DB Storage Estimation (Avg ~2KB per document)
    const estimatedBytes = totalDocuments * 2048;
    const estimatedMB = estimatedBytes / (1024 * 1024);
    const dbLimitMB = 5120; // Change this based on your Astra tier (5120MB = 5GB)
    const storagePercent = Math.min(100, Math.round((estimatedMB / dbLimitMB) * 100));

    // 3. Flagged calls count
    const flaggedCount = await callsCollection.countDocuments({ is_flagged: true }, 1000000);

    // Resolve emails from Clerk for any businesses missing owner_email in the DB
    const clerkEmails = await resolveMissingEmails(
        allBusinesses as unknown as { business_id: string; email?: string }[]
    );

    // Per-user COGS: voice (all-time minutes) + SMS/WhatsApp messages (all-time
    // and monthly buckets) + phone numbers.
    const rates = costRates();
    const { monthly, allTimeMsgs } = await aggregateUsage(
        allBusinesses.map((b: any) => b.business_id)
    );
    const currYm = currentYm();

    // Serialize data for the client component (convert any AstraDB weird types to plain JSON)
    const { serializedBusinesses, totals, monthTotals } = (() => {
        const serialized = allBusinesses.map((b: any) => {
            const plan = b.plan_type || b.plan || undefined;
            const minutes = b.total_minutes_used || 0;
            const phoneCount = b.twilio_number ? 1 : 0;
            const allTime = allTimeMsgs.get(b.business_id) || { sms: 0, whatsapp: 0 };

            const cost = computeUsageCost({ // OVERALL / all-time
                voiceMinutes: minutes,
                smsMessages: allTime.sms,
                whatsappMessages: allTime.whatsapp,
                phoneNumbers: phoneCount,
                plan,
                rates,
            });

            const bm = monthly.get(b.business_id) || new Map<string, MonthCounts>();
            const curM = bm.get(currYm) || { voice: 0, sms: 0, whatsapp: 0 };

            const monthCost = computeUsageCost({ // THIS calendar month
                voiceMinutes: curM.voice,
                smsMessages: curM.sms,
                whatsappMessages: curM.whatsapp,
                phoneNumbers: phoneCount,
                plan,
                rates,
            });

            const monthlyEntries: (UsageCost & { ym: string; label: string })[] = [...bm.entries()]
                .sort((a, b) => (a[0] < b[0] ? 1 : -1))
                .slice(0, 6)
                .map(([ym, m]) => ({
                    ym,
                    label: ymLabel(ym),
                    ...computeUsageCost({
                        voiceMinutes: m.voice,
                        smsMessages: m.sms,
                        whatsappMessages: m.whatsapp,
                        phoneNumbers: phoneCount,
                        plan,
                        rates,
                    }),
                }));

            // Ensure the current month is always listed once
            if (!monthlyEntries.some((e) => e.ym === currYm)) {
                monthlyEntries.unshift({ ym: currYm, label: ymLabel(currYm), ...monthCost });
            }

            return {
                business_id: b.business_id,
                business_name: b.business_name || undefined,
                email: b.owner_email || b.email || clerkEmails[b.business_id] || undefined,
                owner_phone: b.owner_phone || undefined,
                status: b.status || undefined,
                plan,
                minutes_limit: b.minutes_limit || undefined,
                total_minutes_used: minutes,
                total_calls_processed: b.total_calls_processed || undefined,
                created_at: b.created_at || undefined,
                knowledge_base_text: b.knowledge_base_text || undefined,
                greeting_text: b.greeting_text || undefined,
                greeting_tone: b.greeting_tone || undefined,
                routing_rules: b.routing_rules || undefined,
                meta_page_id: b.meta_page_id || undefined,
                meta_page_access_token: b.meta_page_access_token ? "Connected" : undefined, // Mask sensitive tokens!
                google_refresh_token: b.google_refresh_token ? "Connected" : undefined, // Mask sensitive tokens!
                referral_code: b.referral_code || undefined,
                bonus_minutes: b.bonus_minutes || undefined,
                twilio_number: b.twilio_number || undefined,
                cost: { ...cost, rates, smsCount: allTime.sms, whatsappCount: allTime.whatsapp, phoneCount },
                monthCost: { ...monthCost, smsCount: curM.sms, whatsappCount: curM.whatsapp },
                monthly: monthlyEntries,
            };
        });

        const sum = (key: "totalCost" | "revenue" | "net") =>
            serialized.reduce((s: number, b: any) => s + (b.cost?.[key] || 0), 0);
        const monthSum = (key: "totalCost" | "revenue" | "net") =>
            serialized.reduce((s: number, b: any) => s + (b.monthCost?.[key] || 0), 0);

        return {
            serializedBusinesses: serialized,
            totals: { totalCost: sum("totalCost"), revenue: sum("revenue"), net: sum("net") },
            monthTotals: { totalCost: monthSum("totalCost"), revenue: monthSum("revenue"), net: monthSum("net") },
        };
    })();

    const dbStats = {
        businessCount,
        callsCount,
        convoCount,
        notifCount,
        estimatedMB,
        dbLimitMB,
        storagePercent,
    };

    const costSummary = {
        platformCost: totals.totalCost,
        platformRevenue: totals.revenue,
        platformNet: totals.net,
        viewableRevenue: totals.revenue,
        viewableCost: totals.totalCost,
        viewableNet: totals.net,
        viewableMarginPct: totals.revenue > 0 ? (totals.net / totals.revenue) * 100 : 0,
        monthRevenue: monthTotals.revenue,
        monthCost: monthTotals.totalCost,
        monthNet: monthTotals.net,
        monthMarginPct: monthTotals.revenue > 0 ? (monthTotals.net / monthTotals.revenue) * 100 : 0,
        voiceRate: rates.voicePerMinute,
        smsRate: rates.smsPerMessage,
        whatsappRate: rates.whatsappPerMessage,
        phoneRate: rates.phoneNumberPerMonth,
    };

    return (
        <AdminDashboardClient
            allBusinesses={serializedBusinesses}
            totalCallsProcessed={totalCallsProcessed}
            totalMinutesConsumed={totalMinutesConsumed}
            flaggedCount={flaggedCount}
            dbStats={dbStats}
            costSummary={costSummary}
        />
    );
}

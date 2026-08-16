import {
    businessesCollection,
    callsCollection,
    conversationsCollection,
    notificationsCollection,
} from "@/lib/astra";
import AdminDashboardClient from "./_components/AdminDashboardClient";
import { clerkClient } from "@clerk/nextjs/server";
import { computeUsageCost, costRates } from "@/lib/costing";

export const dynamic = 'force-dynamic';

// Per-business SMS/WhatsApp message counts for the trailing 30 days
// (mirrors monthly cost). Single find + client-side tally — no N+1 queries.
async function aggregateMessageCounts(): Promise<Map<string, { sms: number; whatsapp: number }>> {
    const counts = new Map<string, { sms: number; whatsapp: number }>();
    try {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const rows = await conversationsCollection
            .find({
                channel: { $in: ["SMS", "WhatsApp"] },
                created_at: { $gte: since },
            })
            .project({ business_id: 1, channel: 1 })
            .toArray();
        for (const row of rows) {
            const biz = String((row as { business_id?: unknown }).business_id || "unknown_business");
            const channel = String((row as { channel?: unknown }).channel || "");
            const entry = counts.get(biz) || { sms: 0, whatsapp: 0 };
            if (channel === "WhatsApp") entry.whatsapp += 1;
            else entry.sms += 1;
            counts.set(biz, entry);
        }
    } catch (error) {
        console.error("Failed to tally message counts:", error);
    }
    return counts;
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

    const totalCallsProcessed = allBusinesses.reduce((sum, b) => sum + (b.total_calls_processed || 0), 0);
    const totalMinutesConsumed = allBusinesses.reduce((sum, b) => sum + (b.total_minutes_used || 0), 0);

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

    // Per-user COGS: voice (total minutes) + SMS/WhatsApp messages + phone numbers.
    const messageCounts = await aggregateMessageCounts();
    const rates = costRates();

    // Serialize data for the client component (convert any AstraDB weird types to plain JSON)
    const { serializedBusinesses, totals } = (() => {
        const serialized = allBusinesses.map(b => {
            const plan = b.plan_type || b.plan || undefined;
            const minutes = b.total_minutes_used || 0;
            const msgs = messageCounts.get(b.business_id) || { sms: 0, whatsapp: 0 };
            const phoneCount = b.twilio_number ? 1 : 0;
            const cost = computeUsageCost({
                voiceMinutes: minutes,
                smsMessages: msgs.sms,
                whatsappMessages: msgs.whatsapp,
                phoneNumbers: phoneCount,
                plan,
                rates,
            });

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
                cost: { ...cost, rates, smsCount: msgs.sms, whatsappCount: msgs.whatsapp, phoneCount },
            };
        });

        const sum = (key: "totalCost" | "revenue" | "net") =>
            serialized.reduce((s, b) => s + (b.cost?.[key] || 0), 0);

        return {
            serializedBusinesses: serialized,
            totals: { totalCost: sum("totalCost"), revenue: sum("revenue"), net: sum("net") },
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

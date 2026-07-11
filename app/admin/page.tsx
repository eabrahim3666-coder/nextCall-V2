import { businessesCollection, callsCollection, conversationsCollection, notificationsCollection } from "@/lib/astra";
import AdminDashboardClient from "./_components/AdminDashboardClient";

export const dynamic = 'force-dynamic';

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

    // Serialize data for the client component (convert any AstraDB weird types to plain JSON)
    const serializedBusinesses = allBusinesses.map(b => ({
        business_id: b.business_id,
        business_name: b.business_name || undefined,
        email: b.email || undefined,
        owner_phone: b.owner_phone || undefined,
        status: b.status || undefined,
        plan: b.plan || undefined,
        minutes_limit: b.minutes_limit || undefined,
        total_minutes_used: b.total_minutes_used || undefined,
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
    }));

    const dbStats = {
        businessCount,
        callsCount,
        convoCount,
        notifCount,
        estimatedMB,
        dbLimitMB,
        storagePercent,
    };

    return (
        <AdminDashboardClient
            allBusinesses={serializedBusinesses}
            totalCallsProcessed={totalCallsProcessed}
            totalMinutesConsumed={totalMinutesConsumed}
            flaggedCount={flaggedCount}
            dbStats={dbStats}
        />
    );
}

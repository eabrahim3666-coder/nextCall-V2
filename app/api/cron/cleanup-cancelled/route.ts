import { NextResponse } from 'next/server';
import { businessesCollection, callsCollection, notificationsCollection } from '@/lib/astra';
import telnyxClient from '@/lib/telnyx';
import { hasValidSecret } from '@/lib/security';

export async function GET(request: Request) {
    // Security check: Verify the CRON_SECRET header
    const authHeader = request.headers.get('authorization');
    if (!hasValidSecret(authHeader, process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date().toISOString();

        // 1. Find all businesses that are cancelled AND their deletion date has passed
        const expiredBusinesses = await businessesCollection.find({
            status: "cancelled",
            scheduled_deletion_date: { $lte: now }
        }).toArray();

        if (expiredBusinesses.length === 0) {
            return NextResponse.json({ message: "No expired accounts to clean up." });
        }

        let deletedCount = 0;
        let numbersReleasedCount = 0;

        for (const business of expiredBusinesses) {
            const businessId = business.business_id;

             // 2. Release the business's Telnyx numbers FIRST (stops recurring charges!)
            // If this fails, we skip DB deletion so the cron can retry tomorrow.
            const numbersToRelease: string[] = Array.isArray(business.telnyx_numbers)
                ? business.telnyx_numbers
                : Array.isArray(business.twilio_numbers)
                    ? business.twilio_numbers
                    : [];
            const mainNumber = business.telnyx_number || business.twilio_number;
            if (mainNumber && !numbersToRelease.includes(mainNumber)) {
                numbersToRelease.push(mainNumber);
            }

            if (numbersToRelease.length > 0) {
                let allReleased = true;
                for (const e164 of numbersToRelease) {
                    if (!e164 || e164 === "PROVISIONING_FAILED") continue;
                    try {
                        const numbers = (await telnyxClient.phoneNumbers.list({
                            filter: { phone_number: e164 },
                            "page[number]": 1,
                            "page[size]": 5,
                        } as never)) as unknown as { data?: Array<{ id?: string; phone_number?: string }> };
                        const hit = (numbers.data || []).find((n) => n.phone_number === e164);
                        if (hit?.id) {
                            await telnyxClient.phoneNumbers.delete(hit.id);
                            numbersReleasedCount++;
                            console.log(`Released Telnyx number ${e164} (${hit.id}) for cancelled business ${businessId}`);
                        }
                    } catch (releaseError: unknown) {
                        const msg = releaseError instanceof Error ? releaseError.message : String(releaseError);
                        console.error(`Failed to release Telnyx number ${e164} for ${businessId}:`, msg);
                        allReleased = false;
                        break;
                    }
                }
                if (!allReleased) {
                    continue; // Skip DB deletion for this user so we can retry later
                }
            }

            // 3. Delete associated data from AstraDB (Only after numbers are safely released)
            await callsCollection.deleteMany({ business_id: businessId });
            await notificationsCollection.deleteMany({ business_id: businessId });
            await businessesCollection.deleteOne({ _id: business._id });

            deletedCount++;
        }

        console.log(`🧹 Cron Cleanup: Deleted ${deletedCount} expired accounts and released ${numbersReleasedCount} Telnyx numbers.`);
        return NextResponse.json({ success: true, deletedAccounts: deletedCount, releasedTelnyxNumbers: numbersReleasedCount });

    } catch (error) {
        console.error("❌ Cron Cleanup Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

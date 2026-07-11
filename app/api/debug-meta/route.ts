import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { businessesCollection } from '@/lib/astra';

export async function GET() {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await currentUser();
        const claims = sessionClaims as {
            metadata?: { role?: string };
            publicMetadata?: { role?: string };
        };
        const isAdmin =
            claims.metadata?.role === "admin" ||
            claims.publicMetadata?.role === "admin";
        const bossEmails = process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim().toLowerCase()) || [];
        const currentEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase() || "";

        if (!isAdmin && !bossEmails.includes(currentEmail)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Find ALL business records in the database
        const allBusinesses = await businessesCollection.find({}).toArray();

        const summary = allBusinesses.map(b => ({
            business_id: b.business_id,
            business_name: b.business_name,
            status: b.status,
            plan: b.plan,
            has_meta_page_id: !!b.meta_page_id,
            meta_page_id: b.meta_page_id || "NONE"
        }));

        return NextResponse.json({
            total_records: allBusinesses.length,
            businesses: summary
        });

    } catch (error) {
        console.error('Debug error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

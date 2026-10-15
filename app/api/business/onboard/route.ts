import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { businessesCollection } from "@/lib/astra";

function generateReferralCode(businessName: string) {
    const prefix = (businessName || "BIZ").replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${suffix}`;
}

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { business_name, owner_name, phone, business_type, industry, hours, services, notes } = body;

        // Cap user-supplied strings before they land in the DB or the compiled
        // knowledge base (which reaches every Retell call payload).
        const capStr = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        const ownerEmail = clerkUser.emailAddresses?.[0]?.emailAddress || null;

        const existing = await businessesCollection.findOne({ business_id: userId });
        const existingCode = (existing as Record<string, unknown> | null)?.referral_code as string | undefined;

        await businessesCollection.updateOne(
            { business_id: userId },
            {
                $set: {
                    business_id: userId,
                    owner_email: ownerEmail,
                    business_name: capStr(business_name, 200),
                    owner_name: capStr(owner_name, 120),
                    phone: capStr(phone, 30),
                    owner_phone: capStr(phone, 30),
                    business_type: capStr(business_type, 100) || "General",
                    industry: capStr(industry, 120),
                    hours: capStr(hours, 2000),
                    services: capStr(services, 4000),
                    notes: capStr(notes, 4000),
                    status: "pending",
                    knowledge_base_text: `Business: ${capStr(business_name, 200)}. Owner: ${capStr(owner_name, 120)}. Type: ${capStr(business_type, 100)}. Industry: ${capStr(industry, 120)}. Hours: ${capStr(hours, 2000)}. Services: ${capStr(services, 4000)}. Notes: ${capStr(notes, 4000)}`,
                    updated_at: new Date().toISOString(),
                },
                $setOnInsert: {
                    total_calls_processed: 0,
                    total_minutes_used: 0,
                    referral_code: generateReferralCode(business_name || "BIZ"),
                    created_at: new Date().toISOString(),
                },
            },
            { upsert: true }
        );

        if (!existingCode && existing) {
            const code = generateReferralCode(business_name || "BIZ");
            await businessesCollection.updateOne(
                { business_id: userId },
                { $set: { referral_code: code } }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Onboard error:", error);
        return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
}

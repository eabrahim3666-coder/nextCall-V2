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
                    business_name: business_name || "",
                    owner_name: owner_name || "",
                    phone: phone || "",
                    owner_phone: phone || "",
                    business_type: business_type || "General",
                    industry: industry || "",
                    hours: hours || "",
                    services: services || "",
                    notes: notes || "",
                    status: "pending",
                    knowledge_base_text: `Business: ${business_name}. Owner: ${owner_name}. Type: ${business_type}. Industry: ${industry}. Hours: ${hours}. Services: ${services}. Notes: ${notes}`,
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

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { businessesCollection } from "@/lib/astra";

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { business_name, owner_name, phone, business_type, industry, hours, services, notes } = body;

        await businessesCollection.updateOne(
            { business_id: userId },
            {
                $set: {
                    business_id: userId,
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
                    created_at: new Date().toISOString(),
                },
            },
            { upsert: true }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Onboard error:", error);
        return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
}

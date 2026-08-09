import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { conversationsCollection } from "@/lib/astra";

export const dynamic = "force-dynamic";

export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await conversationsCollection.updateOne(
            { business_id: userId, kind: "support" },
            { $set: { read_by_business_at: new Date().toISOString() } }
        );

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Chat mark-read error:", error);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { conversationsCollection } from "@/lib/astra";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const conv = await conversationsCollection.findOne({ business_id: userId, kind: "support" });
        const messages = Array.isArray(conv?.messages) ? conv.messages : [];
        return NextResponse.json({ messages });
    } catch (error) {
        console.error("Chat history error:", error);
        return NextResponse.json({ messages: [] });
    }
}
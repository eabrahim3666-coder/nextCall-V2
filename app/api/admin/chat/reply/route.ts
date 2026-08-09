import { NextResponse } from "next/server";
import { conversationsCollection } from "@/lib/astra";
import { requireAdmin } from "@/lib/admin-auth";
import type { ChatMessage } from "@/app/api/chat/send/route";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const adminId = await requireAdmin();
        if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { business_id, message } = await request.json();
        const content = String(message || "").trim();
        if (!business_id || !content || content.length > 2000) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const filter = { business_id, kind: "support" };
        const conv = await conversationsCollection.findOne(filter);

        const reply: ChatMessage = {
            id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            role: "owner",
            sender: "admin",
            content,
            at: new Date().toISOString(),
        };

        const existing = Array.isArray(conv?.messages) ? conv.messages : [];
        const messages = [...existing.slice(-99), reply];

        await conversationsCollection.updateOne(
            filter,
            {
                $set: {
                    kind: "support",
                    messages,
                    last_activity: reply.at,
                    read_by_admin_at: reply.at,
                },
            },
            { upsert: true }
        );

        return NextResponse.json({ ok: true, message: reply });
    } catch (error) {
        console.error("Admin chat reply error:", error);
        return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
    }
}
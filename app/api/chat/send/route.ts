import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { businessesCollection, conversationsCollection } from "@/lib/astra";
import { sendTelegramMessage } from "@/lib/telegram";
import { escapeHtml } from "@/lib/security";

export const dynamic = "force-dynamic";

export type ChatMessage = {
    id: string;
    role: "user" | "owner";
    content: string;
    at: string;
    telegram_message_id?: number;
};

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const content = String(body.message || "").trim();
        if (!content || content.length > 2000) {
            return NextResponse.json({ error: "Message must be between 1 and 2000 characters" }, { status: 400 });
        }

        const business = await businessesCollection.findOne({ business_id: userId });
        if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

        const message: ChatMessage = {
            id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            role: "user",
            content,
            at: new Date().toISOString(),
        };

        const senderName = String(business.owner_name || business.business_name || business.owner_email || "Dashboard user").trim();
        const senderEmail = business.owner_email ? String(business.owner_email) : null;
        const businessName = String(business.business_name || "Your business");

        const telegramText =
            `📞 <b>New chat message</b>\n` +
            `<b>From:</b> ${escapeHtml(senderName)}${senderEmail ? ` (${escapeHtml(senderEmail)})` : ""}\n` +
            `<b>Business:</b> ${escapeHtml(businessName)}\n` +
            `──────────\n` +
            `${escapeHtml(content)}\n` +
            `<i>└ Reply to this message to respond</i>`;

        const tg = await sendTelegramMessage(telegramText);
        if (tg.ok && tg.message_id) {
            message.telegram_message_id = tg.message_id;
        }

        const filter = { business_id: userId, kind: "support" };
        const conv = await conversationsCollection.findOne(filter);
        const existing = Array.isArray(conv?.messages) ? conv.messages : [];
        const messages = [...existing.slice(-99), message];

        await conversationsCollection.updateOne(
            filter,
            { $set: { business_id: userId, kind: "support", messages, last_activity: message.at } },
            { upsert: true }
        );

        return NextResponse.json({ ok: true, message, telegram_sent: tg.ok });
    } catch (error) {
        console.error("Chat send error:", error);
        return NextResponse.json({ error: "Failed to send" }, { status: 500 });
    }
}
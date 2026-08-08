import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { businessesCollection, conversationsCollection } from "@/lib/astra";
import { sendTelegramMessage, sendTelegramPhoto } from "@/lib/telegram";
import { escapeHtml } from "@/lib/security";

export const dynamic = "force-dynamic";

export type ChatMessage = {
    id: string;
    role: "user" | "owner";
    content: string;
    at: string;
    photo?: string;
    telegram_message_id?: number;
};

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const content = String(body.message || "").trim();
        const photo = typeof body.photo === "string" && body.photo.startsWith("data:image/") ? body.photo : null;

        if ((!content && !photo) || content.length > 2000) {
            return NextResponse.json({ error: "Invalid message" }, { status: 400 });
        }
        if (photo && photo.length > 2_500_000) {
            return NextResponse.json({ error: "Photo too large (max ~2MB)" }, { status: 400 });
        }

        const business = await businessesCollection.findOne({ business_id: userId });
        if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

        const message: ChatMessage = {
            id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            role: "user",
            content: content || "📷 Photo",
            at: new Date().toISOString(),
        };
        if (photo) message.photo = photo;

        const senderName = String(business.owner_name || business.business_name || business.owner_email || "Dashboard user").trim();
        const senderEmail = business.owner_email ? String(business.owner_email) : null;
        const businessName = String(business.business_name || "Your business");

        const header =
            `📞 <b>New chat message</b>\n` +
            `<b>From:</b> ${escapeHtml(senderName)}${senderEmail ? ` (${escapeHtml(senderEmail)})` : ""}\n` +
            `<b>Business:</b> ${escapeHtml(businessName)}\n` +
            `──────────`;
        const caption = `${header}\n${escapeHtml(message.content)}\n<i>└ Reply to this message to respond</i>`;

        let tg: { ok: boolean; message_id?: number; error?: string };
        if (photo) {
            const mime = photo.split(";")[0].split(":")[1] || "image/jpeg";
            tg = await sendTelegramPhoto(caption, photo, mime);
        } else {
            tg = await sendTelegramMessage(caption);
        }
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
        return NextResponse.json({ error: `Failed to send: ${(error as Error)?.message || "unknown"}` }, { status: 500 });
    }
}
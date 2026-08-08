import { NextResponse } from "next/server";
import { conversationsCollection, webhookEventsCollection } from "@/lib/astra";
import { notifyChat } from "@/lib/pusher";
import { sendTelegramMessage, downloadTelegramPhoto } from "@/lib/telegram";
import type { ChatMessage } from "@/app/api/chat/send/route";

const OWNER_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const updateId = body?.update_id;

        if (updateId) {
            const key = `telegram:${updateId}`;
            const seen = await webhookEventsCollection.findOne({ _id: key });
            if (seen) return NextResponse.json({ ok: true, duplicate: true });
            await webhookEventsCollection.insertOne({ _id: key, provider: "telegram", event_id: String(updateId), created_at: new Date().toISOString() });
        }

        const msg = body?.message || body?.edited_message;
        const isText = typeof msg?.text === "string" && msg.text.trim().length > 0;
        const isPhoto = Array.isArray(msg?.photo) && msg.photo.length > 0;
        if (!msg || (!isText && !isPhoto)) {
            return NextResponse.json({ ok: true });
        }

        // Only the app owner can reply from Telegram
        if (!OWNER_CHAT_ID || String(msg.from?.id) !== String(OWNER_CHAT_ID)) {
            return NextResponse.json({ ok: true });
        }

        // Replies must target a specific forwarded message (reply_to_message)
        const reply = msg.reply_to_message;
        if (!reply?.message_id) {
            if (BOT_TOKEN) {
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: OWNER_CHAT_ID,
                        text: "Reply to a message to respond to that customer.",
                    }),
                }).catch(() => {});
            }
            return NextResponse.json({ ok: true });
        }

        const replyId = reply.message_id;

        let conv = null;
        try {
            conv = await conversationsCollection.findOne({ "messages.telegram_message_id": replyId });
        } catch {
            conv = null;
        }
        if (!conv) {
            const all = await conversationsCollection.find({ kind: "support" }).limit(500).toArray();
            conv = all.find((c) => Array.isArray(c.messages) && c.messages.some((m) => m.telegram_message_id === replyId)) || null;
        }
        if (!conv) {
            return NextResponse.json({ ok: true });
        }

        const replyMessage: ChatMessage = {
            id: `tg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            role: "owner",
            content: isText ? msg.text.trim() : "📷 Photo",
            at: new Date().toISOString(),
        };
        if (isPhoto && Array.isArray(msg.photo)) {
            const photo = await downloadTelegramPhoto(msg.photo[msg.photo.length - 1].file_id);
            if (photo) replyMessage.photo = photo;
        }

        const existing = Array.isArray(conv.messages) ? conv.messages : [];
        const messages = [...existing.slice(-99), replyMessage];
        await conversationsCollection.updateOne(
            { _id: conv._id },
            { $set: { messages, last_activity: replyMessage.at } }
        );

        if (conv.business_id) {
            await notifyChat(String(conv.business_id), replyMessage);
        }

        await sendTelegramMessage(`✅ Reply delivered to the dashboard${conv.business_name ? ` (${String(conv.business_name)})` : ""}.`);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Telegram webhook error:", error);
        return NextResponse.json({ ok: true }, { status: 200 });
    }
}
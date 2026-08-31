import { NextResponse } from "next/server";
import { conversationsCollection, webhookEventsCollection, saveChatPhoto } from "@/lib/astra";
import { notifyChat } from "@/lib/pusher";
import { sendTelegramMessage, downloadTelegramPhoto } from "@/lib/telegram";
import { hasValidSecret } from "@/lib/security";
import type { ChatMessage } from "@/app/api/chat/send/route";

const OWNER_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function ownerMessage(text: string) {
    if (!BOT_TOKEN || !OWNER_CHAT_ID) return;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: OWNER_CHAT_ID, text }),
    }).catch(() => {});
}

export async function POST(request: Request) {
    try {
        // Telegram sends the secret_token back in this header when the webhook
        // was registered with one. Fail closed when it's not configured, same
        // as the Meta webhook — without it anyone can forge owner replies.
        if (!hasValidSecret(request.headers.get("x-telegram-bot-api-secret-token"), process.env.TELEGRAM_WEBHOOK_SECRET)) {
            console.error("[telegram] webhook rejected: missing or invalid secret token (set TELEGRAM_WEBHOOK_SECRET and register the webhook with the same secret_token)");
            return NextResponse.json({ ok: false }, { status: 403 });
        }

        const body = await request.json();
        const updateId = body?.update_id;
        const msg = body?.message || body?.edited_message;
        const isText = typeof msg?.text === "string" && msg.text.trim().length > 0;
        const isPhoto = Array.isArray(msg?.photo) && msg.photo.length > 0;

        console.log(`[telegram] update ${updateId} from ${msg?.from?.id}: text=${isText} photo=${isPhoto} reply_to=${msg?.reply_to_message?.message_id ?? "none"}`);

        if (msg && isText && String(msg.text).startsWith("/start")) {
            await ownerMessage("✅ Telegram bridge is live! Send a message from the dashboard, then reply to it here.");
        }

        if (!msg || (!isText && !isPhoto)) {
            console.log("[telegram] no usable message, acked");
            return NextResponse.json({ ok: true });
        }

        if (updateId) {
            const key = `telegram:${updateId}`;
            const seen = await webhookEventsCollection.findOne({ _id: key });
            if (seen) return NextResponse.json({ ok: true, duplicate: true });
            await webhookEventsCollection.insertOne({ _id: key, provider: "telegram", event_id: String(updateId), created_at: new Date().toISOString() });
        }

        // Only the app owner can reply
        if (!OWNER_CHAT_ID || String(msg.from?.id) !== String(OWNER_CHAT_ID)) {
            console.log(`[telegram] ignoring non-owner ${msg.from?.id} (expected ${OWNER_CHAT_ID})`);
            await ownerMessage(`ℹ️ Received your message but your Telegram ID (${msg.from?.id}) doesn't match TELEGRAM_CHAT_ID (${OWNER_CHAT_ID}). No reply was routed.`);
            return NextResponse.json({ ok: true });
        }

        const reply = msg.reply_to_message;
        if (!reply?.message_id) {
            await ownerMessage("ℹ️ Reply to one of the dashboard messages so I know who it's for.");
            return NextResponse.json({ ok: true });
        }

        const replyId = reply.message_id;
        const replyText = typeof reply.text === "string" ? reply.text : "";

        let conv = null;
        try {
            conv = await conversationsCollection.findOne({ "messages.telegram_message_id": replyId });
        } catch (e) {
            console.error("[telegram] direct lookup failed:", e);
            conv = null;
        }
        if (!conv) {
            try {
                const all = await conversationsCollection.find({ kind: "support" }).limit(500).toArray();
                conv =
                    all.find((c) => Array.isArray(c.messages) && c.messages.some((m) => m.telegram_message_id === replyId)) ||
                    all.find((c) => Array.isArray(c.messages) && replyText && c.messages.some((m) => m.role === "user" && String(m.content) === replyText)) ||
                    (all.length === 1 ? all[0] : null);
            } catch (e) {
                console.error("[telegram] fallback scan failed:", e);
                await ownerMessage(`⚠️ Database scan failed on reply id ${replyId}: ${(e as Error)?.message}`);
                return NextResponse.json({ ok: true });
            }
        }
        if (!conv) {
            await ownerMessage(`⚠️ Could not find the conversation for message id ${replyId}. Send a NEW message from the dashboard and reply to THAT one.`);
            return NextResponse.json({ ok: true });
        }

        const replyMessage: ChatMessage = {
            id: `tg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            role: "owner",
            content: isText ? msg.text.trim() : "📷 Photo",
            at: new Date().toISOString(),
        };
        let replyPhoto: string | undefined;
        if (isPhoto && Array.isArray(msg.photo)) {
            const photo = await downloadTelegramPhoto(msg.photo[msg.photo.length - 1].file_id);
            if (photo) {
                replyMessage.photoId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                await saveChatPhoto(replyMessage.photoId, photo);
                replyPhoto = photo;
            }
        }

        const existing = Array.isArray(conv.messages) ? conv.messages : [];
        const messages = [...existing.slice(-99), replyMessage];
        await conversationsCollection.updateOne(
            { _id: conv._id },
            { $set: { messages, last_activity: replyMessage.at } }
        );

        if (conv.business_id) {
            await notifyChat(String(conv.business_id), replyPhoto ? { ...replyMessage, photo: replyPhoto } : replyMessage);
        }

        await ownerMessage(`✅ Reply delivered to dashboard${conv.business_name ? ` (${String(conv.business_name)})` : ""}.`);
        console.log(`[telegram] reply delivered for business ${conv.business_id}`);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[telegram] webhook error:", error);
        await ownerMessage(`❌ Telegram webhook error: ${(error as Error)?.message}`);
        return NextResponse.json({ ok: true }, { status: 200 });
    }
}
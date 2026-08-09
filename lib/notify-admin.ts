import { sendTelegramMessage } from "@/lib/telegram";
import { escapeHtml } from "@/lib/security";

/**
 * Pluggable admin notification helper.
 * Today it pings via Telegram; tomorrow it can also call FCM/native push —
 * swap the body of this function, nothing else changes.
 */
export async function notifyAdminChat(opts: {
    businessName: string;
    senderName: string;
    content: string;
    hasPhoto: boolean;
}): Promise<boolean> {
    const business = escapeHtml(opts.businessName);
    const sender = escapeHtml(opts.senderName);
    const snippet = opts.hasPhoto
        ? `📷 Photo attachment`
        : escapeHtml(opts.content).slice(0, 200);

    const sent = await sendTelegramMessage(
        `🔔 <b>New support message</b>\n` +
        `<b>Business:</b> ${business}\n` +
        `<b>From:</b> ${sender}\n` +
        `──────────\n` +
        `${snippet}\n` +
        `\n<i>Reply from your admin panel → /admin/chat</i>`
    );
    return sent.ok;
}
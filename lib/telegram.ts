import "server-only";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export type TelegramSendResult = {
    ok: boolean;
    message_id?: number;
    error?: string;
};

export async function sendTelegramMessage(text: string): Promise<TelegramSendResult> {
    if (!BOT_TOKEN) return { ok: false, error: "TELEGRAM_BOT_TOKEN missing" };
    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: OWNER_CHAT_ID,
                text,
                parse_mode: "HTML",
                disable_web_page_preview: true,
            }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
            return { ok: false, error: data?.description || "Telegram send failed" };
        }
        return { ok: true, message_id: data.result.message_id };
    } catch (error) {
        console.error("Telegram send error:", error);
        return { ok: false, error: "Telegram send error" };
    }
}
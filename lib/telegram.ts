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

export async function sendTelegramPhoto(caption: string, photoBase64: string, mime: string): Promise<TelegramSendResult> {
    if (!BOT_TOKEN) return { ok: false, error: "TELEGRAM_BOT_TOKEN missing" };
    try {
        const buffer = Buffer.from(photoBase64.replace(/^data:.*?;base64,/, ""), "base64");
        const form = new FormData();
        form.append("chat_id", String(OWNER_CHAT_ID));
        form.append("photo", new Blob([buffer], { type: mime }), "photo.jpg");
        if (caption) form.append("caption", caption);
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: "POST",
            body: form,
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
            return { ok: false, error: data?.description || "Telegram photo send failed" };
        }
        return { ok: true, message_id: data.result.message_id };
    } catch (error) {
        console.error("Telegram photo send error:", error);
        return { ok: false, error: "Telegram photo send error" };
    }
}

export async function downloadTelegramPhoto(fileId: string): Promise<string | null> {
    if (!BOT_TOKEN) return null;
    try {
        const info = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`).then((r) => r.json());
        const filePath = info?.result?.file_path;
        if (!filePath) return null;
        const file = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`).then((r) => r.arrayBuffer());
        return `data:image/jpeg;base64,${Buffer.from(file).toString("base64")}`;
    } catch (error) {
        console.error("Telegram photo download error:", error);
        return null;
    }
}
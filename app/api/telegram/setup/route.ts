import { NextResponse } from "next/server";

export async function GET() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!token || !appUrl) {
        return NextResponse.json({ error: "Missing TELEGRAM_BOT_TOKEN or NEXT_PUBLIC_APP_URL" }, { status: 500 });
    }

    const webhookUrl = `${appUrl}/api/webhooks/telegram`;
    const res = await fetch(
        `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=true`
    );
    const data = await res.json();
    return NextResponse.json({ webhookUrl, telegram: data });
}
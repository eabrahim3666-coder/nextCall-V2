import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!token || !appUrl) {
        return NextResponse.json({ error: "Missing TELEGRAM_BOT_TOKEN or NEXT_PUBLIC_APP_URL" }, { status: 500 });
    }

    const probeOnly = new URL(request.url).searchParams.get("probe") === "1";

    let setData: unknown = { skipped: probeOnly };
    if (!probeOnly) {
        const host = String(appUrl).replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        const wwwHost = host.startsWith("www.") ? host : `www.${host}`;
        const webhookUrl = `https://${wwwHost}/api/webhooks/telegram`;
        const setRes = await fetch(
            `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=true`
        );
        setData = await setRes.json();
    }

    const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const infoData = await infoRes.json();

    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();

    return NextResponse.json({
        probeOnly,
        setWebhook: setData,
        webhookInfo: infoData?.result || infoData,
        bot: meData?.result || meData,
        env_check: {
            botToken_set: Boolean(process.env.TELEGRAM_BOT_TOKEN),
            ownerChatId_set: Boolean(process.env.TELEGRAM_CHAT_ID),
            ownerChatId: process.env.TELEGRAM_CHAT_ID || null,
            appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
        },
    });
}
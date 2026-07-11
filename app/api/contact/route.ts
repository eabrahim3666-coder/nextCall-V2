import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { rateLimit } from "@/lib/rate-limit";

// Change this to your actual support email when you have a custom domain
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "onboarding@resend.dev";

// Helper to escape HTML and prevent script injection in emails
const escapeHtml = (unsafe: string) => String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export async function POST(req: NextRequest) {
    try {
        // Rate limit: max 3 requests per IP per minute
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        if (!rateLimit(`contact:${ip}`, 3, 60_000)) {
            return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
        }

        // Lazy initialize Resend to prevent Vercel build crashes if env var is missing
        if (!process.env.RESEND_API_KEY) {
            console.error("RESEND_API_KEY is missing.");
            return NextResponse.json({ error: "Email service is not configured." }, { status: 500 });
        }
        const resend = new Resend(process.env.RESEND_API_KEY);

        const body = await req.json();
        const { name, email, topic, message, _hp } = body;

        // Honeypot check: if filled, it's a bot
        if (_hp) {
            return NextResponse.json({ success: true });
        }

        if (!name || !email || !message) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string" || name.length > 120 || email.length > 254 || message.length > 5000 || !/^\S+@\S+\.\S+$/.test(email)) {
            return NextResponse.json({ error: "Invalid contact details" }, { status: 400 });
        }

        const topicLabels: Record<string, string> = {
            general: "General Question",
            pricing: "Pricing & Plans",
            integration: "Integrations",
            demo: "Demo Request",
            support: "Technical Support",
            partnership: "Partnership",
        };

        const { error } = await resend.emails.send({
            from: "NextCall <support@getnextcall.com>", // MUST match your verified domain!
            to: [SUPPORT_EMAIL],
             subject: `[Next Call] ${topicLabels[topic] || "New Question"} from ${escapeHtml(name)}`,
            html: `
                <div style="background:#0a0a0a;padding:32px;border-radius:16px;font-family:Inter,sans-serif;color:#fff;max-width:500px;">
                    <h2 style="margin:0 0 20px;font-size:18px;color:#fff;">New Question from Landing Page</h2>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:8px 0;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;width:100px;">Name</td>
                            <td style="padding:8px 0;color:#fff;font-size:14px;">${escapeHtml(name)}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Email</td>
                            <td style="padding:8px 0;color:#818cf8;font-size:14px;">${escapeHtml(email)}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Topic</td>
                            <td style="padding:8px 0;color:#fff;font-size:14px;">${escapeHtml(topicLabels[topic] || topic)}</td>
                        </tr>
                    </table>
                    <div style="margin-top:20px;padding:16px;background:rgba(255,255,255,0.05);border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
                        <p style="margin:0;color:#737373;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Message</p>
                        <p style="margin:0;color:#d4d4d4;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</p>
                    </div>
                    <p style="margin:20px 0 0;color:#525252;font-size:11px;">Sent from Next Call Chat landing page</p>
                </div>
            `,
        });

        if (error) {
            console.error("Email error:", error);
            return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to send email";
        console.error("Contact error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

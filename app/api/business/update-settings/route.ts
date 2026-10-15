import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { businessesCollection } from "@/lib/astra";
import { isSafeWebhookUrl } from "@/lib/security";
import { businessTimezone } from "@/lib/timezone";

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        if (body.zapier_webhook_url && !isSafeWebhookUrl(body.zapier_webhook_url)) {
            return NextResponse.json({ error: "Webhook URL must be a public HTTPS URL" }, { status: 400 });
        }
        if (body.review_link && !/^https:\/\/[^\s]+$/.test(body.review_link)) {
            return NextResponse.json({ error: "Review link must be a valid https:// URL" }, { status: 400 });
        }
        // Validate the timezone against Intl before storing (rejects typos /
        // arbitrary strings; businessTimezone falls back on invalid values).
        if (body.business_timezone && businessTimezone({ business_timezone: body.business_timezone }) !== body.business_timezone) {
            return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
        }

        const existing = await businessesCollection.findOne({ business_id: userId });
        const plan = existing?.plan_type || existing?.plan || "standard";

        // Paid-only routing rules — trial users can never enable these
        const routingRules = body.routing_rules || {
            forward_emergency: true,
            notify_hot_lead: true,
            sms_missed_call: true,
            email_followup: true,
            daily_summary: true,
            appointment_reminders: true,
            review_followup: true,
        };
        if (plan !== "premium") {
            routingRules.notify_hot_lead = false;
            routingRules.sms_missed_call = false;
        }
        if (plan === "trial") {
            routingRules.email_followup = false;
            routingRules.daily_summary = false;
        }

        // Cap user-supplied strings before they reach the DB or the voice
        // pipeline: knowledge_base_text is embedded in every Retell call
        // payload, so an oversized body must not bloat storage or calls.
        const capStr = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

        await businessesCollection.updateOne(
            { business_id: userId },
            {
                $set: {
                    business_name: capStr(body.business_name, 200),
                    business_type: capStr(body.business_type, 100),
                    service_area: capStr(body.service_area, 200),
                    owner_phone: capStr(body.owner_phone, 30),
                    business_timezone: body.business_timezone || "America/New_York",
                    // Structured knowledge fields
                    hours: capStr(body.hours, 2000),
                    services: capStr(body.services, 4000),
                    exclusions: capStr(body.exclusions, 4000),
                    pricing_rules: capStr(body.pricing_rules, 4000),
                    notes: capStr(body.notes, 4000),
                    faq: Array.isArray(body.faq) ? body.faq.slice(0, 100) : [],
                    // Greeting & Tone
                    greeting_tone: body.greeting_tone || "friendly",
                    greeting_text: capStr(body.greeting_text, 1000),
                    ai_name: capStr(body.ai_name, 60),
                    // Routing
                    routing_rules: routingRules,
                     // Emergency logic & Integrations (P0 Bug Fix)
                    emergency_definition: capStr(body.emergency_definition, 1000),
                    review_link: body.review_link || "",
                    zapier_webhook_url: plan === "premium" ? (body.zapier_webhook_url || null) : null,
                    
                    // Compiled knowledge base (what Retell reads)
                    knowledge_base_text: capStr(body.knowledge_base_text, 60000),
                    // Revenue analytics — premium only
                    avg_job_value: plan === "premium" && typeof body.avg_job_value === 'number' ? body.avg_job_value : 0,
                    updated_at: new Date().toISOString(),
                },
            }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Update settings error:", error);
        return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { businessesCollection } from "@/lib/astra";
import { isSafeWebhookUrl } from "@/lib/security";

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        if (body.zapier_webhook_url && !isSafeWebhookUrl(body.zapier_webhook_url)) {
            return NextResponse.json({ error: "Webhook URL must be a public HTTPS URL" }, { status: 400 });
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
        if (plan === "trial") {
            routingRules.notify_hot_lead = false;
            routingRules.sms_missed_call = false;
            routingRules.email_followup = false;
            routingRules.daily_summary = false;
        }

        await businessesCollection.updateOne(
            { business_id: userId },
            {
                $set: {
                    business_name: body.business_name || "",
                    business_type: body.business_type || "",
                    service_area: body.service_area || "",
                    owner_phone: body.owner_phone || "",
                    // Structured knowledge fields
                    hours: body.hours || "",
                    services: body.services || "",
                    exclusions: body.exclusions || "",
                    pricing_rules: body.pricing_rules || "",
                    notes: body.notes || "",
                    faq: body.faq || [],
                    // Greeting & Tone
                    greeting_tone: body.greeting_tone || "friendly",
                    greeting_text: body.greeting_text || "",
                    ai_name: body.ai_name || "",
                    // Routing
                    routing_rules: routingRules,
                     // Emergency logic & Integrations (P0 Bug Fix)
                    emergency_definition: body.emergency_definition || "",
                    zapier_webhook_url: plan === "premium" ? (body.zapier_webhook_url || null) : null,
                    
                    // Compiled knowledge base (what Retell reads)
                    knowledge_base_text: body.knowledge_base_text || "",
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

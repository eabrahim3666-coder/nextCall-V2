import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SettingsForm from "./_components/SettingsForm";
import { findBusinessByUserId } from "@/lib/business";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    const { userId } = await auth();
    if (!userId) redirect("/");

    const business = await findBusinessByUserId(userId);

    const initialData = {
        business_name: business?.business_name || "",
        business_type: business?.business_type || "",
        service_area: business?.service_area || "",
        business_timezone: (business as Record<string, string | null | undefined> | null)?.business_timezone || "America/New_York",
        owner_phone: business?.owner_phone || "",
        hours: business?.hours || "",
        services: business?.services || "",
        exclusions: business?.exclusions || "",
        pricing_rules: business?.pricing_rules || "",
        notes: business?.notes || "",
        faq: business?.faq || [],
        greeting_tone: business?.greeting_tone || "friendly",
        greeting_text: business?.greeting_text || "",
        ai_name: business?.ai_name || "",
        emergency_definition: business?.emergency_definition || "",
        routing_rules: business?.routing_rules || {
            forward_emergency: true,
            notify_hot_lead: true,
            sms_missed_call: true,
            email_followup: true,
            daily_summary: true,
            appointment_reminders: true,
            review_followup: true,
        },
        knowledge_base_text: business?.knowledge_base_text || "",
        referral_code: business?.referral_code || "N/A",
        bonus_minutes: business?.bonus_minutes || 0,
        plan: business?.plan_type || business?.plan || "standard",
        plan_type: business?.plan_type || business?.plan || "standard",
        twilio_numbers: business?.twilio_numbers || [],
        minutes_limit: business?.minutes_limit || 200,
        total_minutes_used: business?.total_minutes_used || 0,
        paddle_customer_id: business?.paddle_customer_id || null,
        avg_job_value: business?.avg_job_value || 0,
        // Security Fix: Only pass a boolean to the client, NEVER the actual secret token
        google_refresh_token: business?.google_refresh_token ? "connected" : null,
        google_account_email: business?.google_account_email || null,
        zapier_webhook_url: business?.zapier_webhook_url || null,
        review_link: business?.review_link || "",
        meta_page_access_token: business?.meta_page_access_token ? "connected" : null,
        meta_page_id: business?.meta_page_id ? String(business.meta_page_id) : null,
        meta_page_name: business?.meta_page_name || null,
        meta_page_picture: business?.meta_page_picture || null,
        meta_ig_business_id: business?.meta_ig_business_id ? String(business.meta_ig_business_id) : null,
        meta_ig_business_name: business?.meta_ig_business_name || null,
    };

    return (
        <div className="max-w-4xl mx-auto py-8 space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Settings</h1>
                <p className="mt-1 text-sm text-[#A7ADBB]">Configure how your AI answers the phone and qualifies leads.</p>
            </div>
            <SettingsForm initialData={initialData} userId={userId} />
        </div>
    );
}

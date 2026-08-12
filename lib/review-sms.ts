import twilioClient from "@/lib/twilio";
import { businessesCollection } from "@/lib/astra";
import { Resend } from "resend";
import { escapeHtml } from "@/lib/security";

type CallLike = {
    business_id?: string;
    business_name?: string;
    customer_phone?: string;
    customer_email?: string;
    customer_name?: string;
    call_id?: string;
};

export function asCallLike(call: Record<string, any>): CallLike {
    return {
        business_id: typeof call.business_id === "string" ? call.business_id : undefined,
        business_name: typeof call.business_name === "string" ? call.business_name : undefined,
        customer_phone: typeof call.customer_phone === "string" ? call.customer_phone : undefined,
        customer_email: typeof call.customer_email === "string" ? call.customer_email : undefined,
        customer_name: typeof call.customer_name === "string" ? call.customer_name : undefined,
        call_id: typeof call.call_id === "string" ? call.call_id : undefined,
    };
}

export async function sendReviewRequest(call: CallLike): Promise<boolean> {
    try {
        const business = await businessesCollection.findOne({ business_id: call.business_id });
        const businessName = business?.business_name || call.business_name || "us";
        const reviewLink = business?.review_link || process.env.NEXT_PUBLIC_GOOGLE_REVIEW_LINK || "https://google.com";

        // 1. Email first — if we captured the customer's email
        if (call.customer_email) {
            try {
                const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
                if (!resend) throw new Error("Resend not configured");
                await resend.emails.send({
                    from: `${businessName} <updates@${process.env.RESEND_FROM_DOMAIN || "getnextcall.com"}>`,
                    to: call.customer_email,
                    subject: `Quick question about your visit to ${businessName}`,
                    html: `
                        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                            <p style="font-size: 15px; line-height: 1.6; color: #333333; margin: 0 0 16px;">Hi${call.customer_name ? ` ${escapeHtml(call.customer_name)}` : ""},</p>
                            <p style="font-size: 15px; line-height: 1.6; color: #333333; margin: 0 0 16px;">Thank you for choosing ${escapeHtml(businessName)}. If you had a good experience, we'd appreciate it if you shared it on Google — it genuinely helps our small team.</p>
                            <p style="margin: 0 0 24px;"><a href="${reviewLink}" style="background: #1a73e8; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-size: 14px; display: inline-block;">Share your experience</a></p>
                            <p style="font-size: 13px; line-height: 1.5; color: #777777; margin: 0;">Only if you feel it's deserved — no pressure either way. If anything wasn't right, reply here and we'll make it right.</p>
                        </div>
                    `,
                });
                return true;
            } catch (emailError) {
                console.error(`[review-sms] email failed for call ${call.call_id}, falling back to SMS:`, emailError);
            }
        }

        // 2. SMS fallback — if no email or email failed
        if (!call.customer_phone) return false;
        const fromNumber =
            (Array.isArray(business?.twilio_numbers) && business.twilio_numbers[0]) ||
            business?.twilio_number ||
            process.env.TWILIO_PHONE_NUMBER;
        if (!fromNumber) return false;

        await twilioClient.messages.create({
            from: fromNumber,
            to: call.customer_phone,
            body: `Hi! Thanks for choosing ${call.business_name || "us"}. If you loved our service, would you mind leaving us a quick review? It helps us a lot! ⭐\n\n${reviewLink}`,
        });
        return true;
    } catch (error) {
        console.error(`[review-sms] send failed for call ${call.call_id}:`, error);
        return false;
    }
}

export async function recordCompletedJob(call: CallLike): Promise<void> {
    try {
        const business = await businessesCollection.findOne({ business_id: call.business_id });
        const jobs = Array.isArray(business?.jobs_completed) ? business.jobs_completed : [];
        jobs.unshift({
            call_id: call.call_id,
            customer_name: call.customer_name || null,
            customer_phone: call.customer_phone || null,
            done_at: new Date().toISOString(),
        });
        await businessesCollection.updateOne(
            { business_id: call.business_id },
            { $set: { jobs_completed: jobs.slice(0, 20) } }
        );
    } catch (error) {
        console.error(`[review-sms] recordCompletedJob failed for call ${call.call_id}:`, error);
    }
}

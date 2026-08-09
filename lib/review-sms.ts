import twilioClient from "@/lib/twilio";
import { businessesCollection } from "@/lib/astra";

type CallLike = {
    business_id?: string;
    business_name?: string;
    customer_phone?: string;
    customer_name?: string;
    call_id?: string;
};

export function asCallLike(call: Record<string, any>): CallLike {
    return {
        business_id: typeof call.business_id === "string" ? call.business_id : undefined,
        business_name: typeof call.business_name === "string" ? call.business_name : undefined,
        customer_phone: typeof call.customer_phone === "string" ? call.customer_phone : undefined,
        customer_name: typeof call.customer_name === "string" ? call.customer_name : undefined,
        call_id: typeof call.call_id === "string" ? call.call_id : undefined,
    };
}

export async function sendReviewSms(call: CallLike): Promise<boolean> {
    try {
        if (!call.customer_phone) return false;
        const business = await businessesCollection.findOne({ business_id: call.business_id });
        const fromNumber =
            (Array.isArray(business?.twilio_numbers) && business.twilio_numbers[0]) ||
            business?.twilio_number ||
            process.env.TWILIO_PHONE_NUMBER;
        if (!fromNumber) return false;

        await twilioClient.messages.create({
            from: fromNumber,
            to: call.customer_phone,
            body: `Hi! Thanks for choosing ${call.business_name || "us"}. If you loved our service, would you mind leaving us a quick review? It helps us a lot! ⭐\n\n${process.env.NEXT_PUBLIC_GOOGLE_REVIEW_LINK || "https://google.com"}`,
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

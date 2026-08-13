import { NextResponse } from 'next/server';
import { businessesCollection, conversationsCollection } from '@/lib/astra';
import { verifyTwilioRequest } from '@/lib/security';
import { isTrialExpired } from '@/lib/business';
import { handleSmsMessage, sendSmsReply } from '@/lib/sms-chat';

const MAX_MESSAGES_PER_HOUR = 25;

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const params = Object.fromEntries(formData.entries()) as Record<string, string>;

        if (!verifyTwilioRequest(request, params, request.headers.get('x-twilio-signature'))) {
            return new NextResponse('<Response></Response>', { status: 401, headers: { 'Content-Type': 'text/xml' } });
        }

        const rawFrom = formData.get('From') as string;
        const rawTo = formData.get('To') as string;
        const body = (formData.get('Body') as string || '').trim();

        if (!rawFrom || !rawTo || !body) {
            return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
        }

        const isWhatsApp = rawFrom.startsWith("whatsapp:") || rawTo.startsWith("whatsapp:");
        const channel: "SMS" | "WhatsApp" = isWhatsApp ? "WhatsApp" : "SMS";
        const from = rawFrom.replace("whatsapp:", "");
        const to = rawTo.replace("whatsapp:", "");

        const business = await businessesCollection.findOne({
            $or: [
                { twilio_numbers: to },
                { twilio_number: to },
            ]
        });

        if (!business) {
            console.error(`SMS: Business not found for number: ${to}`);
            return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
        }

        // Trial ended — the number is dead, tell the customer once
        if (isTrialExpired(business)) {
            try {
                await sendSmsReply({ from: to, to: from, reply: `Sorry, this number is no longer active. Please contact ${business.business_name || 'the business'} directly.`, channel, business });
            } catch (e) { console.error("SMS trial-expired reply failed:", e); }
            return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
        }

        // Abuse guard: cap replies per customer per hour
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const recentCount = await conversationsCollection
            .find({ business_id: business.business_id, customer_phone: from, channel, created_at: { $gte: hourAgo } })
            .toArray();

        if (recentCount.length >= MAX_MESSAGES_PER_HOUR) {
            await sendSmsReply({ from: to, to: from, reply: "We've received a lot of messages from this number today — we'll get back to you shortly!", channel, business });
            return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
        }

        const { reply } = await handleSmsMessage({ from, to, body, channel, business });
        await sendSmsReply({ from: to, to: from, reply, channel, business });

        return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
    } catch (error) {
        console.error("SMS inbound error:", error);
        return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
    }
}
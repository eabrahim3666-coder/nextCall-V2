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

        const from = formData.get('From') as string;
        const to = formData.get('To') as string;
        const body = (formData.get('Body') as string || '').trim();

        if (!from || !to || !body) {
            return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
        }

        const business = await businessesCollection.findOne({
            $or: [
                { twilio_numbers: to },
                { twilio_number: to },
            ]
        });

        if (!business) {
            console.error("SMS: Business not found for number:", to);
            return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
        }

        // Trial ended — the number is dead, tell the customer once
        if (isTrialExpired(business)) {
            try {
                const { sendSmsReply } = await import('@/lib/sms-chat');
                await sendSmsReply({ from: to, to: from, reply: `Sorry, this number is no longer active. Please contact ${business.business_name || 'the business'} directly.`, business });
            } catch (e) { console.error("SMS trial-expired reply failed:", e); }
            return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
        }

        // Abuse guard: cap replies per customer per hour
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const recentCount = await conversationsCollection
            .find({ business_id: business.business_id, customer_phone: from, channel: "SMS", created_at: { $gte: hourAgo } })
            .toArray();

        if (recentCount.length >= MAX_MESSAGES_PER_HOUR) {
            await sendSmsReply({ from: to, to: from, reply: "We've received a lot of messages from this number today — we'll get back to you shortly!", business });
            return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
        }

        // AI reply happens after we return — Twilio doesn't wait on API responses for SMS
        const { reply } = await handleSmsMessage({ from, to, body, business });
        await sendSmsReply({ from: to, to: from, reply, business });

        return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
    } catch (error) {
        console.error("SMS inbound error:", error);
        return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
    }
}
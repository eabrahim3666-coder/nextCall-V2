import { NextResponse } from 'next/server';
import { businessesCollection, conversationsCollection } from '@/lib/astra';
import { verifyTwilioRequest } from '@/lib/security';
import { isTrialExpired } from '@/lib/business';
import { handleSmsMessage, sendSmsReply } from '@/lib/sms-chat';
import { classifyOptOutKeyword, setCustomerOptedOut, clearCustomerOptOut } from '@/lib/sms-compliance';

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

        // TCPA opt-out runs FIRST — before the trial and abuse-cap gates. A
        // customer must always be able to opt out, no matter what. STOP-family
        // keywords are honored before the AI ever sees them; START-family
        // keywords resubscribe. The confirmation is sent through the same
        // gated choke point as all SMS — BEFORE the flag is set so the choke
        // point doesn't block it too (if Twilio already blacklisted the
        // number, the send just fails and is caught inside sendSmsReply).
        const optOutAction = classifyOptOutKeyword(body);
        if (optOutAction) {
            await conversationsCollection.insertOne({
                business_id: business.business_id,
                customer_phone: from,
                channel,
                message: body,
                direction: "inbound",
                created_at: new Date().toISOString(),
            }).catch(() => {});
            try {
                if (optOutAction === "opt_out") {
                    // Each step is isolated so the opt-out FLAG is always
                    // recorded even if the confirmation send fails.
                    try {
                        await sendSmsReply({ from: to, to: from, reply: "You have been unsubscribed and will receive no further messages from this number. Reply START to resubscribe.", channel, business });
                    } catch (e) { console.error("SMS opt-out confirmation failed:", e); }
                    await setCustomerOptedOut(business.business_id, from);
                } else {
                    await clearCustomerOptOut(business.business_id, from);
                    try {
                        await sendSmsReply({ from: to, to: from, reply: "You have been resubscribed and will receive messages from this number again. Reply STOP to unsubscribe at any time.", channel, business });
                    } catch (e) { console.error("SMS opt-in confirmation failed:", e); }
                }
            } catch (e) { console.error(`SMS ${optOutAction} flag update failed:`, e); }
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
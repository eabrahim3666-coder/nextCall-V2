import { NextResponse } from 'next/server';
import { businessesCollection, conversationsCollection, claimWebhookEventOnce } from '@/lib/astra';
import { verifyTelnyxWebhook } from '@/lib/security';
import { isTrialExpired } from '@/lib/business';
import { handleSmsMessage, sendSmsReply } from '@/lib/sms-chat';
import { classifyOptOutKeyword, setCustomerOptedOut, clearCustomerOptOut } from '@/lib/sms-compliance';

export const runtime = 'nodejs';

const MAX_MESSAGES_PER_HOUR = 25;

type TelnyxSmsEvent = {
  data: {
    event_type?: string; // "message.received"
    id?: string;         // event id, used for idempotency
    payload?: {
      id?: string;       // message id
      from?: { phone_number?: string };
      to?: Array<{ phone_number?: string }>;
      text?: string;
    };
  };
};

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // Ed25519 signature check — Telnyx signs `${timestamp}|${rawBody}`.
    if (!verifyTelnyxWebhook(
      rawBody,
      request.headers.get('telnyx-signature-ed25519'),
      request.headers.get('telnyx-timestamp')
    )) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as TelnyxSmsEvent;
    if (event?.data?.event_type !== 'message.received') {
      // Other message events (sent, finalized, etc.) are acknowledged silently.
      return NextResponse.json({ received: true });
    }

    const payload = event.data.payload || {};
    const rawFrom = payload.from?.phone_number || '';
    const rawTo = payload.to?.[0]?.phone_number || '';
    const body = (payload.text || '').trim();

    if (!rawFrom || !rawTo || !body) {
      return NextResponse.json({ received: true });
    }

    const from = rawFrom.replace('whatsapp:', '');
    const to = rawTo.replace('whatsapp:', '');

    // Idempotency: Telnyx retries webhooks. Claim the provider's stable event
    // id atomically, so a retry can never be processed twice (which would
    // otherwise send a duplicate reply and could double-book).
    const eventId = event.data.id || payload.id || '';
    if (eventId) {
      const claimed = await claimWebhookEventOnce(`telnyx:sms:${eventId}`, {
        provider: 'telnyx',
        event_id: eventId,
        channel: 'SMS',
        created_at: new Date().toISOString(),
      });
      if (!claimed) {
        console.log(`[sms-inbound] duplicate event id ${eventId} — retry ignored`);
        return NextResponse.json({ received: true, duplicate: true });
      }
    }

    // Search for the receiving number in the new 'telnyx_numbers' array OR the
    // legacy 'twilio_number'/'twilio_numbers' fields.
    const business = await businessesCollection.findOne({
      $or: [
        { telnyx_numbers: to },
        { telnyx_number: to },
        { twilio_numbers: to },
        { twilio_number: to },
      ],
    });

    if (!business) {
      console.error(`SMS: Business not found for number: ${to}`);
      return NextResponse.json({ received: true });
    }

    const channel: 'SMS' | 'WhatsApp' = 'SMS';

    // TCPA opt-out runs FIRST — before the trial and abuse-cap gates. A
    // customer must always be able to opt out, no matter what. STOP-family
    // keywords are honored before the AI ever sees them; START-family
    // keywords resubscribe. The confirmation is sent through the same
    // gated choke point as all SMS — BEFORE the flag is set so the choke
    // point doesn't block it too (if the carrier already blacklisted the
    // number, the send just fails and is caught inside sendSmsReply).
    const optOutAction = classifyOptOutKeyword(body);
    if (optOutAction) {
      await conversationsCollection.insertOne({
        business_id: business.business_id,
        customer_phone: from,
        channel,
        message: body,
        direction: 'inbound',
        created_at: new Date().toISOString(),
      }).catch(() => {});
      try {
        if (optOutAction === 'opt_out') {
          // Each step is isolated so the opt-out FLAG is always recorded
          // even if the confirmation send fails.
          try {
            await sendSmsReply({ from: to, to: from, reply: 'You have been unsubscribed and will receive no further messages from this number. Reply START to resubscribe.', channel, business });
          } catch (e) { console.error('SMS opt-out confirmation failed:', e); }
          await setCustomerOptedOut(business.business_id, from);
        } else {
          await clearCustomerOptOut(business.business_id, from);
          try {
            await sendSmsReply({ from: to, to: from, reply: 'You have been resubscribed and will receive messages from this number again. Reply STOP to unsubscribe at any time.', channel, business });
          } catch (e) { console.error('SMS opt-in confirmation failed:', e); }
        }
      } catch (e) { console.error(`SMS ${optOutAction} flag update failed:`, e); }
      return NextResponse.json({ received: true });
    }

    // Trial ended — the number is dead, tell the customer once
    if (isTrialExpired(business)) {
      try {
        await sendSmsReply({ from: to, to: from, reply: `Sorry, this number is no longer active. Please contact ${business.business_name || 'the business'} directly.`, channel, business });
      } catch (e) { console.error('SMS trial-expired reply failed:', e); }
      return NextResponse.json({ received: true });
    }

    // Abuse guard: cap replies per customer per hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentCount = await conversationsCollection
      .find({ business_id: business.business_id, customer_phone: from, channel, created_at: { $gte: hourAgo } })
      .toArray();

    if (recentCount.length >= MAX_MESSAGES_PER_HOUR) {
      await sendSmsReply({ from: to, to: from, reply: "We've received a lot of messages from this number today — we'll get back to you shortly!", channel, business });
      return NextResponse.json({ received: true });
    }

    const { reply } = await handleSmsMessage({ from, to, body, channel, business });
    await sendSmsReply({ from: to, to: from, reply, channel, business });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('SMS inbound error:', error);
    return NextResponse.json({ received: true });
  }
}

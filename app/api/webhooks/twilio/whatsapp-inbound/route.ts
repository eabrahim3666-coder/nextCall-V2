import { NextResponse } from 'next/server';
import twilioClient from '@/lib/twilio';
import { businessesCollection, callsCollection, conversationsCollection, notificationsCollection } from '@/lib/astra';
import { verifyTwilioRequest } from '@/lib/security';

function normalizePhone(phone: string) {
  return String(phone || '').replace(/[^\d+]/g, '');
}

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

    const senderPhone = from.replace('whatsapp:', '');
    const incomingNumber = to.replace('whatsapp:', '');

    const business = await businessesCollection.findOne({
      $or: [
        { twilio_numbers: incomingNumber },
        { twilio_number: incomingNumber },
      ]
    });

    if (!business) {
      console.error("Business not found for WhatsApp number:", incomingNumber);
      return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
    }

    const isOwner = normalizePhone(senderPhone) === normalizePhone(business.owner_phone || '');

    if (!isOwner) {
      await conversationsCollection.insertOne({
        business_id: business.business_id,
        customer_phone: senderPhone,
        channel: "WhatsApp",
        message: body,
        direction: "inbound",
        created_at: new Date().toISOString()
      });

      return new NextResponse('<Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const pendingCall = await callsCollection.findOne(
      { business_id: business.business_id, review_status: "awaiting_owner_reply" },
      { sort: { created_at: -1 } }
    );

    if (!pendingCall) {
      return new NextResponse('<Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    if (body === '1') {
      const claimed = await callsCollection.updateOne(
        { call_id: pendingCall.call_id, business_id: business.business_id, review_status: "awaiting_owner_reply" },
        { $set: { review_status: "sending_link" } }
      );
      if (claimed.matchedCount === 0) {
        return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
      }
      const fromNumber =
        (Array.isArray(business.twilio_numbers) && business.twilio_numbers[0]) ||
        business.twilio_number ||
        process.env.TWILIO_PHONE_NUMBER;

      if (!fromNumber) {
        throw new Error("Missing Twilio sender number for review request");
      }

      await twilioClient.messages.create({
        from: fromNumber,
        to: pendingCall.customer_phone,
        body: `Hi! Thanks for choosing ${pendingCall.business_name || 'us'}. If you loved our service, would you mind leaving us a quick review? It helps us a lot!\n\n${process.env.NEXT_PUBLIC_GOOGLE_REVIEW_LINK || 'https://google.com'}`
      });

      await callsCollection.updateOne(
        { call_id: pendingCall.call_id, review_status: "sending_link" },
        { $set: { review_status: "link_sent" } }
      );
    } else if (body === '2') {
      await callsCollection.updateOne(
        { call_id: pendingCall.call_id, review_status: "awaiting_owner_reply" },
        { $set: { review_status: "rejected_by_owner" } }
      );

      await notificationsCollection.insertOne({
        type: "review_declined",
        message: `Owner at ${pendingCall.business_name} declined review for ${pendingCall.customer_phone}`,
        business_id: pendingCall.business_id,
        call_id: pendingCall.call_id,
        created_at: new Date().toISOString(),
        read: false
      });
    }

    return new NextResponse('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error("Error processing WhatsApp inbound:", error);
    // Allow a failed outbound send to be retried instead of leaving the call locked.
    return new NextResponse('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

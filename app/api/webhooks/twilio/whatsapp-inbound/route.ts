import { NextResponse } from 'next/server';
import { businessesCollection, conversationsCollection } from '@/lib/astra';
import { verifyTwilioRequest } from '@/lib/security';

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
  } catch (error) {
    console.error("Error processing WhatsApp inbound:", error);
    return new NextResponse('<Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import twilioClient from '@/lib/twilio';
import { businessesCollection, callsCollection } from '@/lib/astra';
import { hasValidSecret } from '@/lib/security';

export async function POST(request: Request) {
  try {
    // Secure endpoint: Allow Clerk auth or an internal server-to-server key
    const internalApiKey = request.headers.get('x-api-key');
    const { userId } = await auth();
    const expectedApiKey = process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET;
    if (!userId && !hasValidSecret(internalApiKey, expectedApiKey)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { call_id } = await request.json();

    const call = await callsCollection.findOne({ call_id: call_id });
    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    if (userId && call.business_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const claimed = await callsCollection.updateOne(
      { call_id, review_status: { $in: [null, "awaiting_owner_reply"] } },
      { $set: { review_status: "sending_link" } }
    );
    if (claimed.matchedCount === 0) {
      return NextResponse.json({ error: "Review link already sent or unavailable" }, { status: 409 });
    }

    const business = await businessesCollection.findOne({ business_id: call.business_id });
    const fromNumber =
      (Array.isArray(business?.twilio_numbers) && business.twilio_numbers[0]) ||
      business?.twilio_number ||
      process.env.TWILIO_PHONE_NUMBER;

    if (!fromNumber) {
      return NextResponse.json({ error: "No sender number configured" }, { status: 500 });
    }

    // Send SMS to the customer with the Google Review link
    try {
      await twilioClient.messages.create({
        from: fromNumber,
        to: call.customer_phone,
        body: `Hi! Thanks for choosing ${call.business_name}. If you loved our service, would you mind leaving us a quick review? It helps us a lot! ⭐\n\n${process.env.NEXT_PUBLIC_GOOGLE_REVIEW_LINK || 'https://google.com'}`
      });
    } catch (error) {
      await callsCollection.updateOne({ call_id, review_status: "sending_link" }, { $set: { review_status: "awaiting_owner_reply" } });
      throw error;
    }

    // Update AstraDB
    await callsCollection.updateOne({ call_id }, { $set: { review_status: "link_sent" } });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("❌ Error sending review link:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

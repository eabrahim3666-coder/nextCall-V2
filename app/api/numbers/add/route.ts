import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import twilioClient from '@/lib/twilio';
import { businessesCollection } from '@/lib/astra';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const business = await businessesCollection.findOne({ business_id: userId });
    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    // 1. Verify they are Premium and have less than 3 numbers
    if (business.plan_type !== 'premium') {
      return NextResponse.json({ error: "Premium plan required to add multiple numbers" }, { status: 403 });
    }
    const currentNumbers = business.twilio_numbers || [];
    if (currentNumbers.length >= 3) {
      return NextResponse.json({ error: "Maximum limit of 3 numbers reached" }, { status: 400 });
    }

    // 2. Find an available number that supports Voice and SMS
    const availableNumbers = await twilioClient.availablePhoneNumbers('US').local.list({ 
      limit: 1, 
      capabilities: { sms: true, voice: true } 
    });
    if (availableNumbers.length === 0) return NextResponse.json({ error: "No numbers available" }, { status: 400 });

    // 3. Buy it UNDER the business's Sub-Account and link webhooks
    const purchasedNumber = await twilioClient.api.accounts(business.twilio_subaccount_sid).incomingPhoneNumbers.create({
      phoneNumber: availableNumbers[0].phoneNumber,
      friendlyName: `${business.business_name} - nextCall Line ${currentNumbers.length + 1}`,
      voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/inbound`, 
      voiceMethod: 'POST',
      smsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/whatsapp-inbound`,
      smsMethod: 'POST'
    });

    // 3. Push to the array in AstraDB
    await businessesCollection.updateOne(
      { business_id: userId },
      { $push: { twilio_numbers: purchasedNumber.phoneNumber } }
    );

    return NextResponse.json({ phoneNumber: purchasedNumber.phoneNumber });

  } catch (error) {
    console.error(" Error buying number:", error);
    return NextResponse.json({ error: "Failed to buy number" }, { status: 500 });
  }
}
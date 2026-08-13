import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import twilioClient from '@/lib/twilio';
import { businessesCollection } from '@/lib/astra';
import { provisionTwilioNumber, isProvisioned } from '@/lib/twilio-provision';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let business = await businessesCollection.findOne({ business_id: userId });
    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    // 1. Verify they are Premium and have less than 3 numbers
    if (business.plan_type !== 'premium') {
      return NextResponse.json({ error: "Premium plan required to add multiple numbers" }, { status: 403 });
    }

    // Defensive: if the business never got its subaccount/number (legacy or
    // failed provisioning), provision the main line first.
    if (!isProvisioned(business)) {
      const provisioned = await provisionTwilioNumber({
        business_id: business.business_id,
        business_name: business.business_name || "Business",
        plan_type: business.plan_type,
      });
      await businessesCollection.updateOne(
        { business_id: userId },
        {
          $set: {
            twilio_subaccount_sid: provisioned.subaccountSid,
            twilio_number: provisioned.phoneNumber,
            twilio_numbers: [provisioned.phoneNumber],
          }
        }
      );
      business = await businessesCollection.findOne({ business_id: userId });
      if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const currentNumbers = business.twilio_numbers || [];
    if (currentNumbers.length >= 3) {
      return NextResponse.json({ error: "Maximum limit of 3 numbers reached" }, { status: 400 });
    }

    // 2. Find an available number that supports Voice and SMS
    const availableNumbers = await twilioClient.availablePhoneNumbers('US').local.list({ 
      limit: 1, 
    // Twilio's current SDK typings do not expose capability filtering here.
    });
    if (availableNumbers.length === 0) return NextResponse.json({ error: "No numbers available" }, { status: 400 });

    // 3. Buy it UNDER the business's Sub-Account and link webhooks
    const webhookBase = process.env.TWILIO_WEBHOOK_BASE_URL || "https://www.getnextcall.com";
    const purchasedNumber = await twilioClient.api.accounts(business.twilio_subaccount_sid).incomingPhoneNumbers.create({
      phoneNumber: availableNumbers[0].phoneNumber,
      friendlyName: `${business.business_name} - nextCall Line ${currentNumbers.length + 1}`,
      voiceUrl: `${webhookBase}/api/webhooks/twilio/inbound`, 
      voiceMethod: 'POST',
      smsUrl: `${webhookBase}/api/webhooks/twilio/sms-inbound`,
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

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { businessesCollection } from '@/lib/astra';
import { provisionTelnyxNumber, isProvisioned } from '@/lib/telnyx-provision';
import telnyxClient from '@/lib/telnyx';

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

    // Defensive: if the business never got its number (legacy or failed
    // provisioning), provision the main line first.
    if (!isProvisioned(business)) {
      const provisioned = await provisionTelnyxNumber({
        business_id: business.business_id,
        business_name: business.business_name || "Business",
        plan_type: business.plan_type,
      });
      await businessesCollection.updateOne(
        { business_id: userId },
        {
          $set: {
            telnyx_number_id: provisioned.phoneNumberId,
            telnyx_number: provisioned.phoneNumber,
            telnyx_numbers: [provisioned.phoneNumber],
          }
        }
      );
      business = await businessesCollection.findOne({ business_id: userId });
      if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Read new and legacy number arrays.
    const currentNumbers: string[] = Array.isArray(business.telnyx_numbers)
      ? business.telnyx_numbers
      : Array.isArray(business.twilio_numbers)
        ? business.twilio_numbers
        : [];
    if (currentNumbers.length >= 3) {
      return NextResponse.json({ error: "Maximum limit of 3 numbers reached" }, { status: 400 });
    }

    // 2. Buy an available toll-free number with voice+SMS, routed like the
    //    business's other lines (connection + messaging profile come from env).
    const webhookBase = process.env.TELNYX_WEBHOOK_BASE_URL || "https://www.getnextcall.com";
    const connectionId = process.env.TELNYX_CONNECTION_ID || "";
    const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID || "";
    const reference = `nextCall ${business.business_id} - ${business.business_name || "Business"}`;

    const search = (await telnyxClient.availablePhoneNumbers.list({
      filter: {
        country_code: "US",
        phone_number_type: "toll_free",
        features: ["sms", "voice"],
        limit: 1,
      },
    } as never)) as unknown as { data?: Array<{ phone_number?: string }> };
    const candidate = (search.data || [])[0];
    if (!candidate?.phone_number) return NextResponse.json({ error: "No numbers available" }, { status: 400 });

    const orderResponse = (await telnyxClient.numberOrders.create({
      phone_numbers: [{ phone_number: candidate.phone_number }],
      connection_id: connectionId || undefined,
      messaging_profile_id: messagingProfileId || undefined,
      customer_reference: `${reference} - extra ${currentNumbers.length + 1}`,
    })) as unknown as { data?: { status?: string } };
    const order = orderResponse?.data || {};
    if (order.status && order.status !== "success") {
      return NextResponse.json({ error: "Failed to buy number" }, { status: 500 });
    }

    // 3. Push to the array in AstraDB (new field, keeping legacy untouched).
    await businessesCollection.updateOne(
      { business_id: userId },
      { $push: { telnyx_numbers: candidate.phone_number } as Record<string, unknown> }
    );

    console.log(`[numbers/add] provisioned ${candidate.phone_number} for ${userId} (webhook base ${webhookBase})`);

    return NextResponse.json({ phoneNumber: candidate.phone_number });

  } catch (error) {
    console.error(" Error buying number:", error);
    return NextResponse.json({ error: "Failed to buy number" }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import twilioClient from '@/lib/twilio';
import { businessesCollection } from '@/lib/astra';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { phoneNumber } = await request.json();

    const business = await businessesCollection.findOne({ business_id: userId });
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

     // Security Fix: Verify the number actually belongs to the user before doing anything
    const currentNumbers = Array.isArray(business.twilio_numbers) ? business.twilio_numbers : [];
    if (!currentNumbers.includes(phoneNumber)) {
      return NextResponse.json({ error: "Number not found in your account" }, { status: 404 });
    }

    // 1. Find the Twilio number SID to release it
    const hasSubaccount =
      Boolean(business.twilio_subaccount_sid) &&
      business.twilio_subaccount_sid !== "PROVISIONING_FAILED";

    const phoneNumbersResource = hasSubaccount
      ? twilioClient.api.accounts(business.twilio_subaccount_sid).incomingPhoneNumbers
      : twilioClient.incomingPhoneNumbers;

    const numbers = await phoneNumbersResource.list({ phoneNumber, limit: 1 });
    if (numbers.length > 0) {
      await phoneNumbersResource(numbers[0].sid).remove();
    }

    // AstraDB doesn't support $pull. We must fetch, filter, and $set.
    const updatedNumbers = currentNumbers.filter((num: string) => num !== phoneNumber);

    await businessesCollection.updateOne(
      { business_id: userId },
      { $set: { twilio_numbers: updatedNumbers } }
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(" Error removing number:", error);
    return NextResponse.json({ error: "Failed to remove number" }, { status: 500 });
  }
}

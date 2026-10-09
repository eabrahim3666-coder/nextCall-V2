import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { businessesCollection } from '@/lib/astra';
import telnyxClient from '@/lib/telnyx';

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
    const currentNumbers: string[] = Array.isArray(business.telnyx_numbers)
      ? business.telnyx_numbers
      : Array.isArray(business.twilio_numbers)
        ? business.twilio_numbers
        : [];
    if (!currentNumbers.includes(phoneNumber)) {
      return NextResponse.json({ error: "Number not found in your account" }, { status: 404 });
    }

    // 1. Find the Telnyx number id and release it. The main line (the first
    //    provisioned number) is kept — only extra lines can be removed.
    let numberId = "";
    try {
      const numbers = (await telnyxClient.phoneNumbers.list({
        filter: { phone_number: phoneNumber },
        "page[number]": 1,
        "page[size]": 5,
      } as never)) as unknown as { data?: Array<{ id?: string; phone_number?: string }> };
      numberId = (numbers.data || []).find((n) => n.phone_number === phoneNumber)?.id || "";
    } catch (lookupError) {
      console.error(" Telnyx number lookup failed:", lookupError);
    }

    if (numberId) {
      try {
        await telnyxClient.phoneNumbers.delete(numberId);
        console.log(`[numbers/remove] released Telnyx number ${phoneNumber} (${numberId})`);
      } catch (releaseError) {
        console.error(" Telnyx release failed:", releaseError);
        return NextResponse.json({ error: "Failed to remove number" }, { status: 500 });
      }
    } else {
      console.warn(`[numbers/remove] no Telnyx number found for ${phoneNumber} — updating DB only`);
    }

    // AstraDB doesn't support $pull. We must fetch, filter, and $set.
    // Write the result to the new telnyx_numbers field (legacy field untouched).
    const updatedNumbers = currentNumbers.filter((num: string) => num !== phoneNumber);

    await businessesCollection.updateOne(
      { business_id: userId },
      { $set: { telnyx_numbers: updatedNumbers } }
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(" Error removing number:", error);
    return NextResponse.json({ error: "Failed to remove number" }, { status: 500 });
  }
}

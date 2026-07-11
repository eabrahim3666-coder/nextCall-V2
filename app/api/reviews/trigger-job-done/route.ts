import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import twilioClient from '@/lib/twilio';
import { callsCollection, businessesCollection } from '@/lib/astra';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { call_id } = await request.json(); // We pass the call_id to mark as done
    
    
    // 1. Look up the call details in AstraDB AND verify ownership to prevent cross-business abuse
    const call = await callsCollection.findOne({ call_id: call_id, business_id: userId });
    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // 2. Fetch business to get the owner's real phone number
    const business = await businessesCollection.findOne({ business_id: call.business_id });
    if (!business || !business.owner_phone) {
      return NextResponse.json({ error: "Business or owner phone not found" }, { status: 404 });
    }

    const claimed = await callsCollection.updateOne(
      { call_id, business_id: userId, review_status: { $nin: ["sending_owner_prompt", "awaiting_owner_reply", "link_sent", "rejected_by_owner"] } },
      { $set: { review_status: "sending_owner_prompt" } }
    );
    if (claimed.matchedCount === 0) {
      return NextResponse.json({ error: "Review prompt already sent or unavailable" }, { status: 409 });
    }

    // 3. Send the "Job Done" WhatsApp message to the business owner
    try {
      await twilioClient.messages.create({
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: `whatsapp:${business.owner_phone}`,
        body: `Job with ${call.customer_phone} is marked as DONE.\n\nDid the customer have a good experience?\nReply 1 for YES (Send Review Link)\nReply 2 for NO`
      });
    } catch (error) {
      await callsCollection.updateOne(
        { call_id, business_id: userId, review_status: "sending_owner_prompt" },
        { $unset: { review_status: "" } }
      );
      throw error;
    }

    // 3. Update AstraDB to track that we asked for a review
    // Also ensure business_name is saved so we can use it in the SMS to the customer later
    await callsCollection.updateOne(
      { call_id, business_id: userId, review_status: "sending_owner_prompt" },
      { $set: { 
        review_status: "awaiting_owner_reply",
        business_name: call.business_name || 'us' // Fallback just in case
      }}
    );

    
    return NextResponse.json({ success: true, message: "Job done message sent to owner" });

  } catch (error) {
    console.error("Error triggering job done:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

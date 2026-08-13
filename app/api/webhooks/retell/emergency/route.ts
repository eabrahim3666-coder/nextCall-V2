import { NextResponse } from 'next/server';
import twilioClient from '@/lib/twilio';
import { verifyHmacSignature } from '@/lib/security';
import { notifyActivity } from '@/lib/pusher';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (!verifyHmacSignature(rawBody, request.headers.get('retell-signature'), process.env.RETELL_WEBHOOK_SECRET)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = JSON.parse(rawBody);
    console.log("Received transfer_call function request:", JSON.stringify(body, null, 2));
    
    // 1. Get the target number dynamically from the AI's function arguments
    // (The AI passes {{owner_phone}} into this argument)
    const ownerPhone = body.metadata?.owner_phone;
    const emergencyType = body.args?.emergency_type || 'an urgent issue';
    const customerName = body.args?.customer_name || 'A caller';
    
    // Use the business's Twilio number (from metadata) as the caller ID for the SMS
    const fromNumber = body.metadata?.call_source || process.env.TWILIO_PHONE_NUMBER;

    if (!ownerPhone || body.args?.target_number !== ownerPhone || !/^\+[1-9]\d{7,14}$/.test(ownerPhone)) {
      throw new Error("Missing target_number in function arguments");
    }

    // 2. Send the Urgent SMS via Twilio (Heads up to the owner before the call connects)
    if (fromNumber) {
      try {
        await twilioClient.messages.create({
          body: `EMERGENCY CALL: ${customerName} is on the line regarding ${emergencyType}. Warm transfer in progress!`,
          from: fromNumber,
          to: ownerPhone,
        });
        console.log(`Emergency SMS sent to ${ownerPhone}`);
      } catch (smsError) {
        console.error("Failed to send emergency SMS, but continuing transfer:", smsError);
      }
    }

    // 3. Live activity toast on the owner's dashboard (never blocks the transfer)
    if (body.metadata?.business_id) {
      notifyActivity(body.metadata.business_id, {
        type: "emergency",
        title: "Emergency detected",
        icon: "lucide:siren",
        status: "error",
        agent_state: "Handling Emergency",
        message: `${customerName} is on the line — warm transfer in progress`,
        href: "/dashboard/calls",
      }).catch(() => {});
    }

    // 4. CRITICAL: Bridge the live call to the owner.
    // With the dial-to-SIP method Retell cannot transfer calls natively
    // (no forward_phone_number bridge), so we update the in-progress Twilio
    // call's TwiML to dial the owner's phone directly.
    const twilioCallSid = body.args?.twilio_call_sid || body.metadata?.twilio_call_sid;
    if (!twilioCallSid) {
      console.error("Missing twilio_call_sid - cannot bridge the live call");
      return NextResponse.json({ error: "Missing twilio_call_sid" }, { status: 400 });
    }

    try {
      await twilioClient.calls(twilioCallSid).update({
        twiml: `<Response><Dial callerId="${fromNumber}">${ownerPhone}</Dial></Response>`,
      });
      console.log(`Bridged live call ${twilioCallSid} to owner ${ownerPhone}`);
    } catch (bridgeError) {
      console.error("Failed to bridge the live call:", bridgeError);
      return NextResponse.json({ error: "Failed to bridge call" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Error processing emergency handler:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import twilioClient from '@/lib/twilio';
import { businessesCollection } from '@/lib/astra';
import { verifyHmacSignature, escapeHtml } from '@/lib/security';
import { notifyActivity } from '@/lib/pusher';
import { sendBusinessSms, isSmsApproved, getBusinessClient } from '@/lib/sms-compliance';
import { sendTelegramMessage } from '@/lib/telegram';

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

    // The live call terminates on the business's own Twilio subaccount, so the
    // bridge below MUST use a subaccount-scoped client — the master client
    // cannot address a subaccount CallSid (Twilio 20404).
    const business = body.metadata?.business_id
      ? await businessesCollection.findOne({ business_id: body.metadata.business_id })
      : null;

    // 2. Send the Urgent SMS via Twilio (Heads up to the owner before the call connects).
    // Gated + subaccount-scoped — the transfer happens regardless.
    if (fromNumber) {
      try {
        const approved = business ? await isSmsApproved(business) : false;
        const smsResult = business && approved
          ? await sendBusinessSms(business, {
              to: ownerPhone,
              body: `EMERGENCY CALL: ${customerName} is on the line regarding ${emergencyType}. Warm transfer in progress!`,
            })
          : null;
        if (smsResult?.ok) {
          console.log(`Emergency SMS sent to ${ownerPhone}`);
        } else if (!business || !approved) {
          console.log("Emergency SMS skipped — business SMS not yet verified");
        } else {
          console.log("Failed to send emergency SMS, but continuing transfer:");
        }
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
      const bridgeClient = getBusinessClient(business ?? {});
      await bridgeClient.calls(twilioCallSid).update({
        twiml: `<Response><Dial callerId="${fromNumber}">${ownerPhone}</Dial></Response>`,
      });
      console.log(`Bridged live call ${twilioCallSid} to owner ${ownerPhone}`);
    } catch (bridgeError) {
      console.error("Failed to bridge the live call:", bridgeError);
      await sendTelegramMessage(
        `🚨 <b>EMERGENCY TRANSFER FAILED</b>\n` +
        `<b>Business:</b> ${escapeHtml(String(business?.business_name || body.metadata?.business_id || "unknown"))}\n` +
        `<b>Call:</b> ${escapeHtml(String(twilioCallSid))}\n` +
        `<b>Owner:</b> ${escapeHtml(String(ownerPhone))}\n` +
        `<b>Error:</b> ${escapeHtml(bridgeError instanceof Error ? bridgeError.message : String(bridgeError)).slice(0, 300)}\n` +
        `The caller was NOT connected — follow up immediately.`
      );
      return NextResponse.json({ error: "Failed to bridge call" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Error processing emergency handler:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

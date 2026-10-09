import { NextResponse } from 'next/server';
import telnyxClient from '@/lib/telnyx';
import { businessesCollection } from '@/lib/astra';
import { verifyRetellSignature, escapeHtml } from '@/lib/security';
import { notifyActivity } from '@/lib/pusher';
import { sendBusinessSms, isSmsApproved } from '@/lib/sms-compliance';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (!verifyRetellSignature(rawBody, request.headers.get('retell-signature'), [process.env.RETELL_WEBHOOK_SECRET, process.env.RETELL_API_KEY])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = JSON.parse(rawBody);
    console.log("Received transfer_call function request:", JSON.stringify(body, null, 2));

    // 1. Get the target number dynamically from the AI's function arguments
    // (The AI passes {{owner_phone}} into this argument)
    const ownerPhone = body.metadata?.owner_phone;
    const emergencyType = body.args?.emergency_type || 'an urgent issue';
    const customerName = body.args?.customer_name || 'A caller';

    // Use the business's Telnyx number (from metadata) as the caller ID for the SMS
    const fromNumber = body.metadata?.call_source || process.env.TELNYX_PHONE_NUMBER;

    if (!ownerPhone || body.args?.target_number !== ownerPhone || !/^\+[1-9]\d{7,14}$/.test(ownerPhone)) {
      throw new Error("Missing target_number in function arguments");
    }

    const business = body.metadata?.business_id
      ? await businessesCollection.findOne({ business_id: body.metadata.business_id })
      : null;

    // 2. Send the Urgent SMS via Telnyx (Heads up to the owner before the call connects).
    // Gated — the transfer happens regardless.
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
    // (no forward_phone_number bridge), so we update the in-progress TeXML
    // call's Texml to dial the owner's phone directly. The voice webhook
    // stores the provider call sid under the legacy twilio_call_sid key for
    // prompt continuity — accept both spellings.
    const callSid = body.args?.twilio_call_sid || body.metadata?.twilio_call_sid
      || body.args?.telnyx_call_sid || body.metadata?.telnyx_call_sid;
    if (!callSid) {
      console.error("Missing call sid - cannot bridge the live call");
      return NextResponse.json({ error: "Missing call sid" }, { status: 400 });
    }

    const accountSid = process.env.TELNYX_ACCOUNT_SID || "";
    if (!accountSid) {
      console.error("TELNYX_ACCOUNT_SID is not set — cannot bridge the live call");
      await sendTelegramMessage(
        `🚨 <b>EMERGENCY TRANSFER FAILED</b>\n` +
        `<b>Reason:</b> TELNYX_ACCOUNT_SID is not set — TeXML call update impossible.\n` +
        `The caller was NOT connected — follow up immediately.`
      );
      return NextResponse.json({ error: "Bridge not configured" }, { status: 500 });
    }

    try {
      await telnyxClient.texml.accounts.calls.update(callSid, {
        account_sid: accountSid,
        Texml: `<Response><Dial callerId="${fromNumber}">${ownerPhone}</Dial></Response>`,
      } as never);
      console.log(`Bridged live call ${callSid} to owner ${ownerPhone}`);
    } catch (bridgeError) {
      console.error("Failed to bridge the live call:", bridgeError);
      await sendTelegramMessage(
        `🚨 <b>EMERGENCY TRANSFER FAILED</b>\n` +
        `<b>Business:</b> ${escapeHtml(String(business?.business_name || body.metadata?.business_id || "unknown"))}\n` +
        `<b>Call:</b> ${escapeHtml(String(callSid))}\n` +
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

import { NextResponse } from 'next/server';
import { businessesCollection } from '@/lib/astra';
import { verifyTexmlFetchSecret } from '@/lib/security';
import { isTrialExpired } from '@/lib/business';
import retellClient from '@/lib/retell';
import { sendTelegramMessage } from '@/lib/telegram';

export const runtime = 'nodejs';

// Telnyx TeXML instruction-fetch webhook for inbound voice calls. The TeXML
// Application is configured (in the Telnyx portal) with a URL of the shape
// .../api/webhooks/telnyx/voice/txs_<TELNYX_TEXML_WEBHOOK_SECRET> — TeXML
// instruction fetches carry no signature headers, so the secret in the URL is
// the authentication (verified in constant time).
export async function POST(request: Request, ctx: RouteContext<'/api/webhooks/telnyx/voice/[secret]'>) {
  try {
    // Fail-fast config guard: without an agent id every inbound call fails at
    // the Retell registration step below with only a generic error message —
    // a production outage with zero diagnostics. Alert loudly instead.
    if (!process.env.RETELL_AGENT_ID) {
      console.error("FATAL: RETELL_AGENT_ID is not set — inbound calls cannot be registered with Retell");
      await sendTelegramMessage("🚨 <b>RETELL_AGENT_ID is not set</b> — every inbound call is failing. Fix the env var and redeploy.");
      const errorTexml = `<Response><Say>We're sorry, all agents are busy. Please try again shortly.</Say></Response>`;
      return new NextResponse(errorTexml, { headers: { 'Content-Type': 'text/xml' } });
    }

    const { secret: secretSegment } = await ctx.params;
    if (!verifyTexmlFetchSecret(secretSegment && secretSegment.startsWith('txs_') ? secretSegment.slice(4) : secretSegment)) {
      return new NextResponse('<Response><Say>Unauthorized request.</Say></Response>', { status: 401, headers: { 'Content-Type': 'text/xml' } });
    }

    const formData = await request.formData();
    const callerNumber = (formData.get('From') as string) || '';
    const telnyxNumber = (formData.get('To') as string) || '';
    const callSid = (formData.get('CallSid') as string) || (formData.get('CallUUID') as string) || '';

    if (!callerNumber || !telnyxNumber) {
      return new NextResponse('<Response><Say>Invalid request.</Say></Response>', { status: 400, headers: { 'Content-Type': 'text/xml' } });
    }

    // Search for the dialed number in the new 'telnyx_numbers' array OR the
    // legacy 'twilio_number'/'twilio_numbers' fields so pre-migration rows
    // keep working.
    const business = await businessesCollection.findOne({
      $or: [
        { telnyx_numbers: telnyxNumber },
        { telnyx_number: telnyxNumber },
        { twilio_numbers: telnyxNumber },
        { twilio_number: telnyxNumber }
      ]
    });

    if (!business) {
      console.error("Business not found for number:", telnyxNumber);
      const errorTexml = `<Response><Say>Sorry, this number is not configured.</Say></Response>`;
      return new NextResponse(errorTexml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // ============ TRIAL EXPIRY PROTECTION ============
    if (isTrialExpired(business)) {
      console.warn(`🛑 Call rejected for ${business.business_name}: Free trial has ended`);

      if (business.business_id) {
        try {
          const { notificationsCollection } = await import('@/lib/astra');
          await notificationsCollection.insertOne({
            business_id: business.business_id,
            type: "trial_expired",
            title: "Call Missed - Trial Ended",
            message: `You missed a call from ${callerNumber} because your free trial has ended. Choose a plan to reactivate your AI receptionist.`,
            read: false,
            created_at: new Date().toISOString(),
          });
        } catch (e) { console.error("Failed to send trial-expired notification:", e); }
      }

      const trialTexml = `<Response><Say voice="alice">The party you are calling is currently unavailable. Please try again later.</Say><Hangup /></Response>`;
      return new NextResponse(trialTexml, { headers: { 'Content-Type': 'text/xml' } });
    }


    // ============ USAGE LIMIT PROTECTION ============
    const minutesUsed = Number(business?.total_minutes_used || 0);
    const minutesLimit = Number(business?.minutes_limit || 200);

    if (minutesUsed >= minutesLimit) {
      console.warn(`🛑 Call rejected for ${business.business_name}: Minute limit reached (${minutesUsed}/${minutesLimit})`);

      // 1. Notify the business owner they missed a lead due to limits
      if (business.business_id) {
        try {
          const { notificationsCollection } = await import('@/lib/astra');
          await notificationsCollection.insertOne({
            business_id: business.business_id,
            type: "minutes_100",
            title: "Call Missed - Limit Reached",
            message: `You missed a call from ${callerNumber} because you hit your monthly minute limit. Upgrade your plan to capture every lead!`,
            read: false,
            created_at: new Date().toISOString(),
          });
        } catch (e) { console.error("Failed to send limit notification:", e); }
      }

      // 2. Play a professional message to the caller and hang up
      const limitTexml = `<Response><Say voice="alice">The party you are calling is currently unavailable. Please try again later.</Say><Hangup /></Response>`;
      return new NextResponse(limitTexml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // ============ RETELL REGISTER CALL (dial-to-SIP method) ============
    // Register the call with Retell to get a call_id, then dial it into Retell's
    // SIP server. Dynamic variables are injected into the Retell LLM prompt.
    const phoneCallResponse = await retellClient.call.registerPhoneCall({
      agent_id: process.env.RETELL_AGENT_ID as string,
      from_number: callerNumber,
      to_number: telnyxNumber,
      direction: 'inbound',
      metadata: {
        business_id: business.business_id,
        business_name: business.business_name,
        call_source: telnyxNumber,
        owner_phone: business.owner_phone || "",
        telnyx_call_sid: callSid,
      },
      retell_llm_dynamic_variables: {
        business_name: business.business_name || "",
        business_type: business.business_type || "",
        service_area: business.service_area || "",
        owner_phone: business.owner_phone || "",
        business_id: business.business_id || "",
        customer_phone: callerNumber,
        knowledge_base: business.knowledge_base_text || "",
        greeting: business.greeting_text || "",
        greeting_tone: business.greeting_tone || "friendly",
        routing_rules: JSON.stringify(business.routing_rules || {}),
        call_source: telnyxNumber,
        emergency_definition: business.emergency_definition || "a life-threatening situation or severe property damage",
        // Kept as twilio_call_sid for Retell prompt/pattern continuity.
        twilio_call_sid: callSid,
      },
    });

    const texmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Dial>
          <Sip>sip:${phoneCallResponse.call_id}@sip.retellai.com</Sip>
        </Dial>
      </Response>`;

    console.log(`Inbound call registered for ${business.business_name} (retell call ${phoneCallResponse.call_id}, telnyx sid ${callSid})`);

    return new NextResponse(texmlResponse, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error("EXACT INBOUND ERROR:", err?.response?.data || err?.message || error);
    const errorTexml = `<Response><Say>An error occurred. Please try again.</Say></Response>`;
    return new NextResponse(errorTexml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

import { NextResponse } from 'next/server';
import { businessesCollection } from '@/lib/astra';
import { verifyTwilioRequest } from '@/lib/security';
import { isTrialExpired } from '@/lib/business';
import retellClient from '@/lib/retell';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const params = Object.fromEntries(formData.entries()) as Record<string, string>;
    if (!verifyTwilioRequest(request, params, request.headers.get('x-twilio-signature'))) {
      return new NextResponse('<Response><Say>Unauthorized request.</Say></Response>', { status: 401, headers: { 'Content-Type': 'text/xml' } });
    }
    const callerNumber = formData.get('From') as string;
    const twilioNumber = formData.get('To') as string;
    const twilioCallSid = formData.get('CallSid') as string;

    // Search for the dialed number in the new 'twilio_numbers' array OR the old 'twilio_number' string
    const business = await businessesCollection.findOne({
      $or: [
        { twilio_numbers: twilioNumber },
        { twilio_number: twilioNumber }
      ]
    });
    
    if (!business) {
      console.error("Business not found for number:", twilioNumber);
      const errorTwiml = `<Response><Say>Sorry, this number is not configured.</Say></Response>`;
      return new NextResponse(errorTwiml, { headers: { 'Content-Type': 'text/xml' } });
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

      const trialTwiml = `<Response><Say voice="alice">The party you are calling is currently unavailable. Please try again later.</Say><Hangup /></Response>`;
      return new NextResponse(trialTwiml, { headers: { 'Content-Type': 'text/xml' } });
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
      const limitTwiml = `<Response><Say voice="alice">The party you are calling is currently unavailable. Please try again later.</Say><Hangup /></Response>`;
      return new NextResponse(limitTwiml, { headers: { 'Content-Type': 'text/xml' } });
    }

    // ============ RETELL REGISTER CALL (dial-to-SIP method) ============
    // Register the call with Retell to get a call_id, then dial it into Retell's
    // SIP server. Dynamic variables are injected into the Retell LLM prompt.
    const phoneCallResponse = await retellClient.call.registerPhoneCall({
      agent_id: process.env.RETELL_AGENT_ID as string,
      from_number: callerNumber,
      to_number: twilioNumber,
      direction: 'inbound',
      metadata: {
        business_id: business.business_id,
        business_name: business.business_name,
        call_source: twilioNumber,
        owner_phone: business.owner_phone || "",
        twilio_call_sid: twilioCallSid,
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
        call_source: twilioNumber,
        emergency_definition: business.emergency_definition || "a life-threatening situation or severe property damage",
        twilio_call_sid: twilioCallSid,
      },
    });

    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Dial>
          <Sip>sip:${phoneCallResponse.call_id}@sip.retellai.com</Sip>
        </Dial>
      </Response>`;

    console.log(`Inbound call registered for ${business.business_name} (retell call ${phoneCallResponse.call_id}, twilio sid ${twilioCallSid})`);

    return new NextResponse(twimlResponse, {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error("EXACT INBOUND ERROR:", err?.response?.data || err?.message || error);
    const errorTwiml = `<Response><Say>An error occurred. Please try again.</Say></Response>`;
    return new NextResponse(errorTwiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

import { NextResponse } from 'next/server';
import { businessesCollection } from '@/lib/astra';
import { verifyTwilioRequest } from '@/lib/security';
import { isTrialExpired } from '@/lib/business';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const params = Object.fromEntries(formData.entries()) as Record<string, string>;
    if (!verifyTwilioRequest(request, params, request.headers.get('x-twilio-signature'))) {
      return new NextResponse('<Response><Say>Unauthorized request.</Say></Response>', { status: 401, headers: { 'Content-Type': 'text/xml' } });
    }
    const callerNumber = formData.get('From') as string;
    const twilioNumber = formData.get('To') as string; 

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


    // Helper to safely escape XML so business names with '&' or '<' don't break the TwiML
    const escapeXml = (unsafe: string) => String(unsafe || "").replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });

    // Inject dynamic metadata natively via TwiML <Parameter> tags!
    // This is the Retell V2 way to pass variables for inbound Twilio calls without needing createPhoneCall()
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Connect>
          <Application>${process.env.TWILIO_VOICE_APP_SID}</Application>
          <Parameter name="business_name"><Value>${escapeXml(business.business_name)}</Value></Parameter>
          <Parameter name="business_type"><Value>${escapeXml(business.business_type)}</Value></Parameter>
          <Parameter name="service_area"><Value>${escapeXml(business.service_area)}</Value></Parameter>
          <Parameter name="owner_phone"><Value>${escapeXml(business.owner_phone)}</Value></Parameter>
          <Parameter name="business_id"><Value>${escapeXml(business.business_id)}</Value></Parameter>
          <Parameter name="customer_phone"><Value>${escapeXml(callerNumber)}</Value></Parameter>
          <Parameter name="knowledge_base"><Value>${escapeXml(business.knowledge_base_text || "")}</Value></Parameter>
          <Parameter name="greeting"><Value>${escapeXml(business.greeting_text || "")}</Value></Parameter>
          <Parameter name="greeting_tone"><Value>${escapeXml(business.greeting_tone || "friendly")}</Value></Parameter>
          <Parameter name="routing_rules"><Value>${escapeXml(JSON.stringify(business.routing_rules || {}))}</Value></Parameter>
          <Parameter name="call_source"><Value>${escapeXml(twilioNumber)}</Value></Parameter>
          <Parameter name="emergency_definition"><Value>${escapeXml(business.emergency_definition || "a life-threatening situation or severe property damage")}</Value></Parameter>
        </Connect>
      </Response>`;

    console.log(`Inbound call connecting for ${business.business_name} via TwiML Parameters`);

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

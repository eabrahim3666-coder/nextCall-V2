import { NextResponse } from 'next/server';
import { callsCollection, businessesCollection, notificationsCollection } from '@/lib/astra';
import openai from '@/lib/openai';
import crypto from 'crypto';
import { Resend } from 'resend';
import { google } from 'googleapis';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // SECURITY: Verify Retell Signature
    const rawBody = await request.text();
    const retellSignature = request.headers.get('retell-signature');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RETELL_WEBHOOK_SECRET || '')
      .update(rawBody)
      .digest('hex');

    if (retellSignature !== expectedSignature) {
      console.error("Invalid Retell Signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    const metadata = body.metadata || {};
    const callId = body.call_id;
    const transcript = body.transcript || "No transcript available.";
    const startTime = body.start_timestamp;
    const endTime = body.end_timestamp;
    const callDuration = Math.round((endTime - startTime) / 1000);
    const callDurationMin = Math.ceil(callDuration / 60);
    const businessId = metadata.business_id || 'unknown_business';

    // 1. Get business + routing rules
    const business = await businessesCollection.findOne({ business_id: businessId });
    const routingRules = business?.routing_rules || {};
    const minutesLimit = business?.minutes_limit || 200;
    const currentMinutes = business?.total_minutes_used || 0;
    const newTotalMinutes = currentMinutes + callDurationMin;
    const plan = business?.plan || 'standard';
    const overageRate = plan === 'premium' ? 0.40 : 0.50;

    // 2. Ask GPT for Summary, Sentiment, Lead Quality, Appointment status, and Date/Time
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a call analyst. Analyze the transcript and provide:
1. A 1-sentence summary
2. Sentiment (Positive, Neutral, or Negative)
3. Lead quality: "hot" (ready to buy/book), "warm" (interested), "cold" (just asking)
4. Appointment booked: true if an appointment was scheduled, false otherwise
5. Customer email if mentioned, or null
6. Customer name if mentioned, or null
7. Is emergency: true if the caller mentioned emergency keywords, false otherwise
8. Appointment date and time in ISO 8601 format (e.g., 2024-12-25T14:00:00) if mentioned, otherwise null. Assume the current year.
9. Appointment duration in minutes if mentioned, or 60 by default.
Output ONLY valid JSON.`
        },
        { role: "user", content: transcript }
      ],
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(completion.choices[0].message.content || "{}");
    const summary = aiResult.summary || "Summary unavailable.";
    const sentiment = aiResult.sentiment || "Neutral";
    const leadQuality = aiResult.lead_quality || "warm";
    const appointmentBooked = aiResult.appointment_booked || false;
    const customerEmail = aiResult.customer_email || null;
    const customerName = aiResult.customer_name || null;
    const isEmergency = aiResult.is_emergency || false;
    const appointmentDateTimeStr = aiResult.appointment_date_time || null;
    const appointmentDuration = aiResult.appointment_duration_minutes || 60;

    // 3. Save call record
    const callRecord = {
      business_id: businessId,
      call_id: callId,
      customer_phone: body.phone_number || 'unknown',
      customer_email: customerEmail,
      customer_name: customerName,
      transcript: transcript,
      summary: summary,
      sentiment: sentiment,
      lead_quality: leadQuality,
      appointment_booked: appointmentBooked,
      is_emergency: isEmergency,
      appointment_date_time: appointmentDateTimeStr,
      call_duration: callDuration,
      call_duration_minutes: callDurationMin,
      call_source: metadata.call_source || "unknown",
      recording_url: body.recording_url,
      business_name: metadata.business_name,
      created_at: new Date(endTime).toISOString()
    };

    await callsCollection.insertOne(callRecord);

    // 4. Update business minutes + call count
    await businessesCollection.updateOne(
      { business_id: businessId },
      {
        $set: {
          total_minutes_used: newTotalMinutes,
          total_calls_processed: (business?.total_calls_processed || 0) + 1,
          updated_at: new Date().toISOString(),
        }
      }
    );

    // ============ AUTOMATIONS ============

    // 5. GOOGLE CALENDAR INTEGRATION
    if (appointmentBooked && business?.google_refresh_token) {
      try {
        const oAuth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );
        oAuth2Client.setCredentials({ refresh_token: business.google_refresh_token });
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

        let startDateTime;
        try {
          startDateTime = appointmentDateTimeStr ? new Date(appointmentDateTimeStr) : new Date(Date.now() + 24 * 60 * 60 * 1000);
          if (isNaN(startDateTime.getTime())) startDateTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
          if (startDateTime.getHours() === 0) startDateTime.setHours(10, 0, 0);
        } catch (e) {
          startDateTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }

        const endDateTime = new Date(startDateTime.getTime() + (appointmentDuration * 60 * 1000));

        const event = {
          summary: `Appointment: ${customerName || 'New Customer'}`,
          location: business.business_name || 'Office',
          description: `Call Summary: ${summary}\n\nCustomer Phone: ${body.phone_number || 'Unknown'}\n\nTranscript Snippet: ${transcript.substring(0, 500)}...`,
          start: { dateTime: startDateTime.toISOString(), timeZone: 'America/New_York' },
          end: { dateTime: endDateTime.toISOString(), timeZone: 'America/New_York' },
        };

        await calendar.events.insert({ calendarId: 'primary', resource: event });
        console.log(`Google Calendar event created for ${business.business_name}`);
      } catch (calError) {
        console.error("Failed to create Google Calendar event:", calError);
      }
    }

    // 6. ZAPIER / WEBHOOK INTEGRATION (Premium)
    if (business?.zapier_webhook_url && plan === 'premium') {
      try {
        await fetch(business.zapier_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            call_id: callId,
            business_name: business.business_name,
            customer_name: customerName,
            customer_phone: body.phone_number || 'unknown',
            customer_email: customerEmail,
            sentiment: sentiment,
            lead_quality: leadQuality,
            appointment_booked: appointmentBooked,
            is_emergency: isEmergency,
            summary: summary,
            call_duration_minutes: callDurationMin,
            transcript_snippet: transcript.substring(0, 1000)
          }),
        });
        console.log(`Webhook fired to ${business.zapier_webhook_url}`);
      } catch (webhookError) {
        console.error("Failed to fire Zapier webhook:", webhookError);
      }
    }

    // 7. FOLLOW-UP EMAIL to customer
    if (routingRules.email_followup && customerEmail && business) {
      try {
        await resend.emails.send({
          from: "Next Call Chat <onboarding@resend.dev>",
          to: [customerEmail],
          subject: `Thanks for calling ${business.business_name || 'us'}!`,
          html: `
            <div style="background:#0a0a0a;padding:32px;border-radius:16px;font-family:Inter,sans-serif;color:#fff;max-width:500px;">
              <h2 style="margin:0 0 16px;font-size:18px;color:#fff;">Thanks for calling${customerName ? ` ${customerName}` : ''}!</h2>
              <p style="margin:0 0 16px;color:#a3a3a3;font-size:14px;line-height:1.6;">
                We received your call to <strong style="color:#fff;">${business.business_name || 'our business'}</strong>. Here's a quick summary:
              </p>
              <div style="padding:16px;background:rgba(255,255,255,0.05);border-radius:12px;border:1px solid rgba(255,255,255,0.08);margin-bottom:16px;">
                <p style="margin:0;color:#d4d4d4;font-size:14px;line-height:1.6;">${summary}</p>
              </div>
              ${appointmentBooked ? `<p style="margin:0 0 16px;color:#818cf8;font-size:14px;">Your appointment has been booked. We'll send you a reminder before your visit.</p>` : ''}
              <p style="margin:0;color:#525252;font-size:12px;">If you have any questions, just call us back or reply to this email.</p>
            </div>
          `,
        });
        console.log(`Follow-up email sent to ${customerEmail}`);
      } catch (emailError) {
        console.error("Failed to send follow-up email:", emailError);
      }
    }

    // 8. IN-APP NOTIFICATIONS (Hot lead, Emergency, Appointment, Missed call)
    if (routingRules.notify_hot_lead && leadQuality === "hot" && business) {
      try { await notificationsCollection.insertOne({ business_id: businessId, type: "hot_lead", title: "Hot Lead Detected", message: `${customerName || 'A caller'} (${body.phone_number}) is ready to buy. Call back ASAP! Summary: ${summary}`, read: false, created_at: new Date().toISOString() }); } catch (e) { console.error(e); }
      
      // 🔔 N8N BOSS ALERT: Hot Lead
      if (process.env.N8N_BOSS_ALERT_URL) {
        fetch(process.env.N8N_BOSS_ALERT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: "Hot Lead Detected",
            business_name: business.business_name || "Unknown",
            details: `Caller: ${customerName || 'Unknown'} | Summary: ${summary}`
          }),
        }).catch(e => console.error("n8n ping failed"));
      }
    }

    if (isEmergency && business) {
      try { await notificationsCollection.insertOne({ business_id: businessId, type: "emergency", title: "Emergency Call", message: `Emergency call from ${customerName || body.phone_number}: ${summary}`, read: false, created_at: new Date().toISOString() }); } catch (e) { console.error(e); }
      
      // 🔔 N8N BOSS ALERT: Emergency
      if (process.env.N8N_BOSS_ALERT_URL) {
        fetch(process.env.N8N_BOSS_ALERT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: "Emergency Transfer",
            business_name: business.business_name || "Unknown",
            details: `Caller: ${customerName || 'Unknown'} | Issue: ${summary}`
          }),
        }).catch(e => console.error("n8n ping failed"));
      }
    }

    if (appointmentBooked && business) {
      try { await notificationsCollection.insertOne({ business_id: businessId, type: "appointment", title: "New Appointment", message: `Appointment booked for ${customerName || 'a customer'}. ${summary}`, read: false, created_at: new Date().toISOString() }); } catch (e) { console.error(e); }
    }
    
    if (callDuration < 10 && routingRules.sms_missed_call && business) {
      try { await notificationsCollection.insertOne({ business_id: businessId, type: "missed_call", title: "Missed Call", message: `Brief call from ${body.phone_number} (${callDuration}s). May have hung up before AI answered.`, read: false, created_at: new Date().toISOString() }); } catch (e) { console.error(e); }
    }

    // ============ MINUTES ALERTS ============
    const usagePercent = (newTotalMinutes / minutesLimit) * 100;

    if (usagePercent >= 100 && business) {
      try {
        await resend.emails.send({ from: "Next Call Chat <onboarding@resend.dev>", to: [process.env.SUPPORT_EMAIL || "owner@business.com"], subject: `Minutes Exceeded — ${business.business_name}`, html: `<div style="background:#0a0a0a;padding:32px;border-radius:16px;font-family:Inter,sans-serif;color:#fff;max-width:500px;"><h2 style="margin:0 0 16px;font-size:18px;color:#f43f5e;">Minutes Limit Exceeded</h2><p style="margin:0 0 16px;color:#a3a3a3;font-size:14px;">${business.business_name} has used <strong style="color:#fff;">${newTotalMinutes} of ${minutesLimit} minutes</strong>. Overages at $${overageRate}/min.</p></div>` });
        await notificationsCollection.insertOne({ business_id: businessId, type: "minutes_100", title: "Minutes Exceeded", message: `You've used ${newTotalMinutes}/${minutesLimit} minutes. Overage rate: $${overageRate}/min.`, read: false, created_at: new Date().toISOString() });
      } catch (e) { console.error(e); }
    } else if (usagePercent >= 90 && business) {
      try { await notificationsCollection.insertOne({ business_id: businessId, type: "minutes_90", title: "90% Minutes Used", message: `You've used ${newTotalMinutes}/${minutesLimit} minutes. Only ${minutesLimit - newTotalMinutes} remaining.`, read: false, created_at: new Date().toISOString() }); } catch (e) { console.error(e); }
    } else if (usagePercent >= 80 && business) {
      try { await notificationsCollection.insertOne({ business_id: businessId, type: "minutes_80", title: "80% Minutes Used", message: `You've used ${newTotalMinutes}/${minutesLimit} minutes this month.`, read: false, created_at: new Date().toISOString() }); } catch (e) { console.error(e); }
    }

    console.log(`Call ${callId} processed: ${callDurationMin}min, ${sentiment}, ${leadQuality} lead${appointmentBooked ? ', APPT BOOKED' : ''}${isEmergency ? ', EMERGENCY' : ''} (${newTotalMinutes}/${minutesLimit} min used)`);

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error("Call-ended webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { callsCollection, businessesCollection, notificationsCollection, webhookEventsCollection } from '@/lib/astra';
import openai from '@/lib/openai';
import { sendBusinessSms, isSmsApproved } from '@/lib/sms-compliance';
import { Resend } from 'resend';
import { google } from 'googleapis';
import { escapeHtml, isSafeWebhookUrl, verifyHmacSignature } from '@/lib/security';
import { notifyActivity, type Activity } from '@/lib/pusher';

export async function POST(request: Request) {
  try {
    // SECURITY: Verify Retell Signature
    const rawBody = await request.text();
    const retellSignature = request.headers.get('retell-signature');
    if (!verifyHmacSignature(rawBody, retellSignature, process.env.RETELL_WEBHOOK_SECRET)) {
      console.error("Invalid Retell Signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    const metadata = body.metadata || {};
    const callId = body.call_id;
    
    if (!callId) {
      return NextResponse.json({ error: "Missing call_id" }, { status: 400 });
    }

    const eventKey = `retell:${callId}`;
    const existingEvent = await webhookEventsCollection.findOne({ _id: eventKey });
    if (existingEvent?.processed_at) return NextResponse.json({ received: true, duplicate: true });
    if (existingEvent && Date.now() - new Date(existingEvent.created_at).getTime() < 10 * 60 * 1000) {
      return NextResponse.json({ received: true, processing: true });
    }
    if (existingEvent) {
      await webhookEventsCollection.updateOne({ _id: eventKey }, { $set: { created_at: new Date().toISOString() } });
    } else {
      await webhookEventsCollection.insertOne({ _id: eventKey, provider: "retell", event_id: callId, created_at: new Date().toISOString() });
    }

    // IDEMPOTENCY CHECK: Prevent duplicate processing if Retell retries the webhook
    const existingCall = await callsCollection.findOne({ call_id: callId });
    if (existingCall) {
      console.log(`Call ${callId} already processed. Skipping duplicate webhook.`);
      await webhookEventsCollection.updateOne({ _id: eventKey }, { $set: { processed_at: new Date().toISOString() } });
      return NextResponse.json({ received: true, message: "Duplicate event ignored." });
    }

    // Lazy initialize Resend to prevent Vercel build crashes
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    const transcript = body.transcript || "No transcript available.";
    
    // Safely parse timestamps to prevent NaN crashes on bad payloads
    const startTime = Number(body.start_timestamp);
    const endTime = Number(body.end_timestamp);
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
      return NextResponse.json({ error: "Invalid call timestamps" }, { status: 400 });
    }
    const callDuration = Math.round((endTime - startTime) / 1000);
    const callDurationMin = Math.ceil(callDuration / 60);
    const businessId = metadata.business_id || 'unknown_business';

    // Live activity feed (never blocks business logic if it fails)
    const activity = (a: Omit<Activity, "created_at">) =>
      notifyActivity(businessId, a).catch(() => {});

    const caller = body.phone_number && body.phone_number !== 'unknown' ? body.phone_number : 'a caller';
    const person = (name: string | null, fallback: string) => (name ? name : fallback);
    const formatSlot = (iso: string | null) => {
      if (!iso) return 'time to be confirmed';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return 'time to be confirmed';
      const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `${date} • ${time}`;
    };

    await activity({ type: "incoming_call", title: "Incoming call received", message: `Calling from ${caller}`, icon: "lucide:phone-incoming", status: "pending", agent_state: "Answering Call", href: "/dashboard/calls" });
    await activity({ type: "ai_answered", title: "AI answered the customer", message: `Connected with ${caller}`, icon: "lucide:headset", status: "success", agent_state: "Answering Call", href: "/dashboard/calls" });
    
    // 1. Get business + routing rules
    const business = await businessesCollection.findOne({ business_id: businessId });
    if (!business) return NextResponse.json({ error: "Unknown business" }, { status: 400 });
    const routingRules = business?.routing_rules || {};
    const minutesLimit = business?.minutes_limit || 200;
    const currentMinutes = business?.total_minutes_used || 0;
    const newTotalMinutes = currentMinutes + callDurationMin;
    const plan = business?.plan_type || business?.plan || 'standard';
    const overageRate = plan === 'premium' ? 0.40 : 0.50;

    // 2. Ask GPT for Summary, Sentiment, Lead Quality, Appointment status, and Date/Time
    await activity({ type: "understanding", title: "Understanding customer request", message: "Reading the transcript and checking for appointments", icon: "lucide:file-search", status: "pending", agent_state: "Processing Call" });
    let summary = "Summary unavailable.";
    let sentiment = "Neutral";
    let leadQuality = "warm";
    let appointmentBooked = false;
    let customerEmail = null;
    let customerName = null;
    let isEmergency = false;
    let appointmentDateTimeStr = null;
    let appointmentDuration = 60;
    let quote_given = false;
    let quote_amount: string | null = null;

    try {
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
8. Appointment date and time in ISO 8601 format (e.g., 2024-12-25T14:00:00) if mentioned, otherwise null. TODAY IS ${new Date().toISOString().split('T')[0]}. Interpret relative dates like "tomorrow", "next week", "this Friday" based on TODAY. NEVER use dates in the past or from training data.
9. Appointment duration in minutes if mentioned, or 60 by default.
10. Quote given: true if a price, estimate, or price range was discussed with the customer (e.g., "$89 diagnostic", "$150-300 depending on the part"), false otherwise
11. Quote details: if a quote was given, a short string of the exact price or range discussed (e.g., "$150-300"), otherwise null
Output ONLY valid JSON.`
          },
          { role: "user", content: transcript }
        ],
        response_format: { type: "json_object" }
      });

      const aiResult = JSON.parse(completion.choices[0].message.content || "{}");
      summary = aiResult.summary || "Summary unavailable.";
      sentiment = aiResult.sentiment || "Neutral";
      leadQuality = aiResult.lead_quality || "warm";
      appointmentBooked = aiResult.appointment_booked || false;
      customerEmail = aiResult.customer_email || null;
      customerName = aiResult.customer_name || null;
      isEmergency = aiResult.is_emergency || false;
      appointmentDateTimeStr = aiResult.appointment_date_time || null;
      appointmentDuration = aiResult.appointment_duration_minutes || 60;
      quote_given = aiResult.quote_given || false;
      quote_amount = aiResult.quote_details || null;
    } catch (openAiError) {
      console.error("OpenAI analysis failed for call, using fallback values:", openAiError);
    }

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
      quote_given: quote_given,
      quote_amount: quote_amount,
      created_at: new Date(endTime).toISOString()
    };

    await callsCollection.insertOne(callRecord);

    // 4. Update business minutes + call count (Atomic increment prevents race conditions)
    await businessesCollection.updateOne(
      { business_id: businessId },
      {
        $inc: {
          total_minutes_used: callDurationMin,
          total_calls_processed: 1
        },
        $set: {
          updated_at: new Date().toISOString(),
        }
      }
    );

    // ============ AUTOMATIONS ============

    // 5. GOOGLE CALENDAR INTEGRATION (all plans — needed for AI appointment booking)
    if (appointmentBooked && business?.google_refresh_token) {
      try {
        await activity({ type: "appointment_confirmed", title: "Appointment confirmed", message: `${person(customerName, 'A customer')} • ${formatSlot(appointmentDateTimeStr)}`, icon: "lucide:calendar-check", status: "success", agent_state: "Scheduling Appointment", href: "/dashboard/calls" });
        await activity({ type: "creating_event", title: "Creating Google Calendar event...", message: `${person(customerName, 'A customer')} • ${formatSlot(appointmentDateTimeStr)}`, icon: "lucide:calendar-plus", status: "pending", agent_state: "Updating Calendar" });
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
          if (startDateTime.getTime() < Date.now()) startDateTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
          if (startDateTime.getHours() === 0) startDateTime.setHours(10, 0, 0);
        } catch {
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

        await calendar.events.insert({ calendarId: 'primary', requestBody: event });
        await activity({ type: "event_created", title: "Google Calendar updated", message: `${person(customerName, 'A customer')} • ${formatSlot(appointmentDateTimeStr)}`, icon: "lucide:calendar-check", status: "success", agent_state: "Updating Calendar", href: "/dashboard/calls" });
        console.log(`Google Calendar event created for ${business.business_name}`);
      } catch (calError) {
        await activity({ type: "event_failed", title: "Google Calendar sync failed", message: "Reconnect your calendar in Settings", icon: "lucide:calendar-x", status: "error", agent_state: "Updating Calendar", href: `/dashboard/settings?focus=integrations` });
        console.error("Failed to create Google Calendar event:", calError);
      }
    }

    // 6. ZAPIER / WEBHOOK INTEGRATION (Premium)
    if (business?.zapier_webhook_url && plan === 'premium' && isSafeWebhookUrl(business.zapier_webhook_url)) {
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

    // 7. FOLLOW-UP EMAIL to customer (Standard & Premium)
    if (routingRules.email_followup && customerEmail && business && plan !== 'trial') {
      try {
if (!resend) throw new Error("Email service is not configured");
        await activity({ type: "email_sending", title: "Sending confirmation email", message: `To ${customerEmail}`, icon: "lucide:mail", status: "pending", agent_state: "Sending Confirmation", href: "/dashboard/calls" });
        if (resend) await resend.emails.send({
from: "Next Call Chat <support@getnextcall.com>",
          to: [customerEmail],
          subject: `Thanks for calling ${business.business_name || 'us'}!`,
          html: `
            <div style="background:#0a0a0a;padding:32px;border-radius:16px;font-family:Inter,sans-serif;color:#fff;max-width:500px;">
              <h2 style="margin:0 0 16px;font-size:18px;color:#fff;">Thanks for calling${customerName ? ` ${escapeHtml(customerName)}` : ''}!</h2>
              <p style="margin:0 0 16px;color:#a3a3a3;font-size:14px;line-height:1.6;">
                We received your call to <strong style="color:#fff;">${escapeHtml(business.business_name || 'our business')}</strong>. Here's a quick summary:
              </p>
              <div style="padding:16px;background:rgba(255,255,255,0.05);border-radius:12px;border:1px solid rgba(255,255,255,0.08);margin-bottom:16px;">
                <p style="margin:0;color:#d4d4d4;font-size:14px;line-height:1.6;">${escapeHtml(summary)}</p>
              </div>
              ${appointmentBooked ? `<p style="margin:0 0 16px;color:#818cf8;font-size:14px;">Your appointment has been booked. We'll send you a reminder before your visit.</p>` : ''}
              <p style="margin:0;color:#525252;font-size:12px;">If you have any questions, just call us back or reply to this email.</p>
            </div>
          `,
        });
        await activity({ type: "email_sent", title: "Confirmation email sent", message: `To ${customerEmail}`, icon: "lucide:mail-check", status: "success" });
        console.log(`Follow-up email sent to ${customerEmail}`);
      } catch (emailError) {
        console.error("Failed to send follow-up email:", emailError);
      }
    }

    // 8. IN-APP NOTIFICATIONS (Hot lead, Emergency, Appointment, Missed call)
    if (routingRules.notify_hot_lead && leadQuality === "hot" && business && plan === 'premium') {
      try { await notificationsCollection.insertOne({ business_id: businessId, type: "hot_lead", title: "Hot Lead Detected", message: `${customerName || 'A caller'} (${body.phone_number}) is ready to buy. Call back ASAP! Summary: ${summary}`, read: false, created_at: new Date().toISOString() }); } catch (e) { console.error(e); }
      await activity({ type: "hot_lead", title: "High-value lead identified", message: `${person(customerName, 'A caller')} (${caller}) is ready to buy. ${summary.length > 90 ? summary.slice(0, 90) + '…' : summary}`, icon: "lucide:flame", status: "success", agent_state: "Following Up", href: "/dashboard/calls" });
      
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
        }).catch(() => console.error("n8n ping failed"));
      }
    }

    if (isEmergency && business) {
      try { await notificationsCollection.insertOne({ business_id: businessId, type: "emergency", title: "Emergency Call", message: `Emergency call from ${customerName || body.phone_number}: ${summary}`, read: false, created_at: new Date().toISOString() }); } catch (e) { console.error(e); }
      await activity({ type: "emergency", title: "Emergency detected", message: `${person(customerName, 'A caller')} (${caller}) — ${summary.length > 110 ? summary.slice(0, 110) + '…' : summary}`, icon: "lucide:siren", status: "error", agent_state: "Handling Emergency", href: "/dashboard/calls" });
      
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
        }).catch(() => console.error("n8n ping failed"));
      }
    }

    if (appointmentBooked && business) {
      try { await notificationsCollection.insertOne({ business_id: businessId, type: "appointment", title: "New Appointment", message: `Appointment booked for ${customerName || 'a customer'}. ${summary}`, read: false, created_at: new Date().toISOString() }); } catch (e) { console.error(e); }
    }
     if (callDuration < 10 && routingRules.sms_missed_call && business && plan === 'premium') {
      try {
        // 1. Create in-app notification for the business owner
        await notificationsCollection.insertOne({ 
          business_id: businessId, 
          type: "missed_call", 
          title: "Missed Call", 
          message: `Brief call from ${body.phone_number} (${callDuration}s). May have hung up before AI answered. Auto-SMS sent.`, 
          read: false, 
          created_at: new Date().toISOString() 
        });

        // 2. Send automatic SMS back to the customer — only if the business's
        // toll-free number has passed Twilio Toll-Free Verification
        const customerPhone = body.phone_number;

        if (customerPhone && customerPhone !== 'unknown' && await isSmsApproved(business)) {
          await activity({ type: "sms_sending", title: "Sending SMS reminder", message: `"Sorry we missed you" - ${customerPhone}`, icon: "lucide:message-square", status: "pending", agent_state: "Sending SMS", href: "/dashboard/calls" });
          const smsResult = await sendBusinessSms(business, {
            to: customerPhone,
            body: `Hi! Sorry we missed your call. We're here to help—reply to this text or call us back at ${business.twilio_number || business.twilio_numbers?.[0] || ""}. - ${business.business_name}`,
          });
          if (smsResult.ok) {
            await activity({ type: "sms_sent", title: "SMS reminder sent", message: `Auto-follow-up sent to ${customerPhone}`, icon: "lucide:check-circle", status: "success" });
            console.log(`Missed call auto-SMS sent to ${customerPhone}`);
          } else {
            await activity({ type: "missed_call", title: "Brief call missed", message: `From ${caller} (${callDuration}s) — hung up early`, icon: "lucide:phone-missed", status: "error", href: "/dashboard/calls" });
          }
        } else {
          await activity({ type: "missed_call", title: "Brief call missed", message: `From ${caller} (${callDuration}s) — hung up early`, icon: "lucide:phone-missed", status: "error", href: "/dashboard/calls" });
        }
      } catch (smsError) {
        console.error("Failed to send missed call SMS:", smsError);
      }
    }

    // ============ MINUTES ALERTS ============
    const usagePercent = (newTotalMinutes / minutesLimit) * 100;

    if (usagePercent >= 100 && business) {
      try {
         if (resend) await resend.emails.send({ from: "Next Call Chat <support@getnextcall.com>", to: [process.env.SUPPORT_EMAIL || "owner@business.com"], subject: `Minutes Exceeded — ${business.business_name}`, html: `<div style="background:#0a0a0a;padding:32px;border-radius:16px;font-family:Inter,sans-serif;color:#fff;max-width:500px;"><h2 style="margin:0 0 16px;font-size:18px;color:#f43f5e;">Minutes Limit Exceeded</h2><p style="margin:0 0 16px;color:#a3a3a3;font-size:14px;">${escapeHtml(business.business_name)} has used <strong style="color:#fff;">${newTotalMinutes} of ${minutesLimit} minutes</strong>. Overages at $${overageRate}/min.</p></div>` });
        await notificationsCollection.insertOne({ business_id: businessId, type: "minutes_100", title: "Minutes Exceeded", message: `You've used ${newTotalMinutes}/${minutesLimit} minutes. Overage rate: $${overageRate}/min.`, read: false, created_at: new Date().toISOString() });
      } catch (e) { console.error(e); }
      await activity({ type: "minutes_100", title: "Minutes limit exceeded", message: `You've used ${newTotalMinutes} of ${minutesLimit} minutes. Overage: $${overageRate}/min.`, icon: "lucide:gauge", status: "error" });
    } else if (usagePercent >= 90 && business) {
      try { await notificationsCollection.insertOne({ business_id: businessId, type: "minutes_90", title: "90% Minutes Used", message: `You've used ${newTotalMinutes}/${minutesLimit} minutes. Only ${minutesLimit - newTotalMinutes} remaining.`, read: false, created_at: new Date().toISOString() }); } catch (e) { console.error(e); }
      await activity({ type: "minutes_90", title: "90% of minutes used", message: `Only ${minutesLimit - newTotalMinutes} minutes remaining this month.`, icon: "lucide:gauge", status: "info" });
    } else if (usagePercent >= 80 && business) {
      try { await notificationsCollection.insertOne({ business_id: businessId, type: "minutes_80", title: "80% Minutes Used", message: `You've used ${newTotalMinutes}/${minutesLimit} minutes this month.`, read: false, created_at: new Date().toISOString() }); } catch (e) { console.error(e); }
      await activity({ type: "minutes_80", title: "80% of minutes used", message: `You've used ${newTotalMinutes}/${minutesLimit} minutes this month.`, icon: "lucide:gauge", status: "info" });
    }

    console.log(`Call ${callId} processed: ${callDurationMin}min, ${sentiment}, ${leadQuality} lead${appointmentBooked ? ', APPT BOOKED' : ''}${isEmergency ? ', EMERGENCY' : ''} (${newTotalMinutes}/${minutesLimit} min used)`);

    await webhookEventsCollection.updateOne({ _id: eventKey }, { $set: { processed_at: new Date().toISOString() } });
    return NextResponse.json({ received: true });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : "";
    console.error("Call-ended webhook error:", errMsg, errStack);
    return NextResponse.json({ error: "Internal Server Error", detail: errMsg }, { status: 500 });
  }
}

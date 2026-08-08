import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { businessesCollection, webhookEventsCollection } from '@/lib/astra';
import { hasValidSecret } from '@/lib/security';
import { TRIAL_DURATION_MS } from '@/lib/business';

type PaddleEventData = {
  id?: string;
  transaction_id?: string;
  subscription_id?: string;
  customer_id?: string;
  custom_data?: {
    business_name?: string;
    owner_phone?: string;
    clerk_user_id?: string;
    business_type?: string;
    service_area?: string;
    ref?: string | null;
    plan?: string;
  };
};

function generateReferralCode(businessName: string) {
  const prefix = businessName.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

function getPlanLimits(planType: string) {
  if (planType === 'premium') {
    return { minutesLimit: 500, overageRate: 0.40 };
  }

  if (planType === 'trial') {
    return { minutesLimit: 50, overageRate: 0.00 };
  }

  return { minutesLimit: 200, overageRate: 0.50 };
}

async function activateBusinessFromPaddleData(data: PaddleEventData) {
  const customData = data.custom_data || {};
  const businessName = customData.business_name || "New Business";
  const ownerPhone = customData.owner_phone;
  const clerkId = customData.clerk_user_id;
  const businessType = customData.business_type || "General";
  const serviceArea = customData.service_area || "Unknown";
  const refCode = customData.ref || null;

  if (!clerkId) {
    throw new Error("Missing clerk_user_id in Paddle custom_data");
  }

  const existingBusiness = await businessesCollection.findOne({ business_id: clerkId });
  const twilioSubAccountSid = existingBusiness?.twilio_subaccount_sid || "PROVISIONING_FAILED";
  const twilioPhoneNumber = existingBusiness?.twilio_number || "PROVISIONING_FAILED";
  const currentNumbers = Array.isArray(existingBusiness?.twilio_numbers) && existingBusiness.twilio_numbers.length > 0
    ? existingBusiness.twilio_numbers
    : [twilioPhoneNumber];
  const planType = customData.plan || existingBusiness?.plan_type || 'standard';
  const { minutesLimit, overageRate } = getPlanLimits(planType);

  const trialStart = planType === 'trial'
    ? (existingBusiness?.trial_started_at || new Date().toISOString())
    : undefined;
  const trialEnd = trialStart
    ? new Date(new Date(trialStart).getTime() + TRIAL_DURATION_MS).toISOString()
    : undefined;

  if (refCode && !existingBusiness?.referral_applied_at) {
    const referrer = await businessesCollection.findOne({ referral_code: refCode });
    if (referrer && planType !== 'trial') {
      const referralBonus = planType === 'premium' ? 70 : 40;
      await businessesCollection.updateOne(
        { _id: referrer._id },
        {
          $inc: { minutes_limit: referralBonus, bonus_minutes: referralBonus },
          $set: { updated_at: new Date().toISOString() }
        }
      );
      console.log(`${referrer.business_name} earned ${referralBonus} bonus minutes from ${planType} referral!`);
    }
  }

  await businessesCollection.updateOne(
    { business_id: clerkId },
    {
      $set: {
        business_id: clerkId,
        business_name: businessName,
        twilio_subaccount_sid: twilioSubAccountSid,
        twilio_number: twilioPhoneNumber,
        twilio_numbers: currentNumbers,
        paddle_transaction_id: data.transaction_id || data.id,
        paddle_subscription_id: data.subscription_id || data.id,
        paddle_customer_id: data.customer_id,
        status: "active",
        plan_type: planType,
        minutes_limit: minutesLimit,
        overage_rate: overageRate,
        ...(trialStart && trialEnd
          ? { trial_started_at: trialStart, trial_ends_at: trialEnd }
          : {}),
        ...(refCode ? { referral_applied_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString()
      },
      $setOnInsert: {
        owner_phone: ownerPhone || "",
        business_type: businessType,
        service_area: serviceArea,
        total_minutes_used: 0,
        total_calls_processed: 0,
        referral_code: generateReferralCode(businessName),
        created_at: new Date().toISOString()
      }
    },
    { upsert: true }
  );

  console.log(`Business ${businessName} onboarded on ${planType} plan via Paddle!`);

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    const teleMsg = `<b>New Paid User (Paddle)</b>\n\nBusiness: <b>${businessName}</b>\nPlan: ${planType}\nPhone: ${ownerPhone}`;
    fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: teleMsg, parse_mode: 'HTML' })
    }).catch(err => console.error("Telegram fetch failed:", err));
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('paddle-signature');

    if (!signatureHeader) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const parts = signatureHeader.split(';');
    const tsPart = parts.find(p => p.startsWith('ts='));
    const h1Part = parts.find(p => p.startsWith('h1='));

    if (!tsPart || !h1Part) {
      return NextResponse.json({ error: "Invalid signature format" }, { status: 401 });
    }

    const timestamp = tsPart.split('=')[1];
    const h1Signature = h1Part.split('=')[1];
    const timestampMs = Number(timestamp) * 1000;
    if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
      return NextResponse.json({ error: "Expired signature" }, { status: 401 });
    }

    if (!process.env.PADDLE_WEBHOOK_SECRET) {
      console.error("PADDLE_WEBHOOK_SECRET is not configured");
      return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
    }

    const signedPayload = `${timestamp}:${rawBody}`;
    const hmac = crypto.createHmac('sha256', process.env.PADDLE_WEBHOOK_SECRET!);
    hmac.update(signedPayload);
    const digest = hmac.digest('hex');

    if (!hasValidSecret(h1Signature, digest)) {
      console.error("Invalid Paddle Signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.event_type;
    const eventId = payload.event_id || `${eventName}:${payload.data?.id || crypto.createHash('sha256').update(rawBody).digest('hex')}`;

    const eventKey = `paddle:${eventId}`;
    const alreadyProcessed = await webhookEventsCollection.findOne({ _id: eventKey });
    if (alreadyProcessed?.processed_at) return NextResponse.json({ received: true, duplicate: true });
    if (alreadyProcessed && Date.now() - new Date(alreadyProcessed.created_at).getTime() < 10 * 60 * 1000) {
      return NextResponse.json({ received: true, processing: true });
    }
    if (alreadyProcessed) {
      await webhookEventsCollection.updateOne({ _id: eventKey }, { $set: { created_at: new Date().toISOString() } });
    } else {
      await webhookEventsCollection.insertOne({ _id: eventKey, provider: "paddle", event_id: eventId, created_at: new Date().toISOString() });
    }
    console.log(`Paddle Webhook Received: ${eventName}`);

    if (eventName === 'transaction.completed' && payload.data?.custom_data?.purpose === 'additional_minutes') {
      const minutesAdded = parseInt(payload.data.custom_data.minutes_added, 10) || 50;
      const clerkId = payload.data.custom_data.clerk_user_id;
      if (clerkId && minutesAdded > 0) {
        await businessesCollection.updateOne(
          { business_id: clerkId },
          { $inc: { minutes_limit: minutesAdded, bonus_minutes: minutesAdded }, $set: { updated_at: new Date().toISOString() } }
        );
        console.log(`Added ${minutesAdded} minutes to ${clerkId}`);
      }
    } else if (eventName === 'subscription.created' || eventName === 'subscription.activated' || eventName === 'transaction.completed') {
      try {
        await activateBusinessFromPaddleData(payload.data);
      } catch (error) {
        console.error("Error during automated onboarding:", error);
      }
    }

    if (eventName === 'subscription.canceled' || eventName === 'subscription.expired') {
      const subId = payload.data.id;
      const business = await businessesCollection.findOne({ paddle_subscription_id: subId });

      if (business) {
        await businessesCollection.updateOne(
          { _id: business._id },
          {
            $set: {
              status: "cancelled",
              cancellation_date: new Date().toISOString(),
              scheduled_deletion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }
          }
        );
      }
    }

    await webhookEventsCollection.updateOne({ _id: eventKey }, { $set: { processed_at: new Date().toISOString() } });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paddle Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

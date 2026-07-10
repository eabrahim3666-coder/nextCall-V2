import { NextResponse } from 'next/server';
import crypto from 'crypto';
import twilioClient from '@/lib/twilio';
import { businessesCollection } from '@/lib/astra';

// Helper to generate a unique referral code
function generateReferralCode(businessName: string) {
  const prefix = businessName.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

export async function POST(request: Request) {
  try {
    // 1. Get the raw body and signature header
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('paddle-signature');

    if (!signatureHeader) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    // 2. Parse the signature (ts=...;h1=...)
    const parts = signatureHeader.split(';');
    const tsPart = parts.find(p => p.startsWith('ts='));
    const h1Part = parts.find(p => p.startsWith('h1='));
    
    if (!tsPart || !h1Part) {
      return NextResponse.json({ error: "Invalid signature format" }, { status: 401 });
    }

    const timestamp = tsPart.split('=')[1];
    const h1Signature = h1Part.split('=')[1];

    // 3. Verify signature: HMAC-SHA256(ts + ":" + rawBody, secret)
    const signedPayload = `${timestamp}:${rawBody}`;
    const hmac = crypto.createHmac('sha256', process.env.PADDLE_WEBHOOK_SECRET!);
    hmac.update(signedPayload);
    const digest = hmac.digest('hex');

    console.log("Expected:", digest);
    console.log("Received:", h1Signature);
    console.log("Secret prefix used:", process.env.PADDLE_WEBHOOK_SECRET?.substring(0, 12));



    // 4. If signature doesn't match, return 401
    if (h1Signature !== digest) {
      console.error("Invalid Paddle Signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.event_type;
    console.log(`Paddle Webhook Received: ${eventName}`);

    // ==========================================
    // 1. SUBSCRIPTION CREATED (New Paid User)
    // ==========================================
    if (eventName === 'subscription.created') {
      try {
        const customData = payload.data.custom_data || {};
        const businessName = customData.business_name || "New Business";
        const ownerPhone = customData.owner_phone;
        const clerkId = customData.clerk_user_id;
        const businessType = customData.business_type || "General";
        const serviceArea = customData.service_area || "Unknown";
        const refCode = customData.ref || null;
        
        let twilioSubAccountSid = "PROVISIONING_FAILED";
        let twilioPhoneNumber = "PROVISIONING_FAILED";

        // ⚠️ UNCOMMENT THIS BLOCK WHEN GOING LIVE — purchases a real Twilio number (costs money)
        // try {
        //   const subAccount = await twilioClient.api.accounts.create({ friendlyName: businessName });
        //
        //   // Search for a number that supports BOTH Voice and SMS
        //   const availableNumbers = await twilioClient.availablePhoneNumbers('US').local.list({
        //     limit: 1,
        //     capabilities: { sms: true, voice: true }
        //   });
        //
        //   if (availableNumbers.length === 0) throw new Error("No available Twilio numbers with Voice+SMS");
        //
        //   // Purchase the number UNDER the new Sub-Account
        //   const purchasedNumber = await twilioClient.api.accounts(subAccount.sid).incomingPhoneNumbers.create({
        //     phoneNumber: availableNumbers[0].phoneNumber,
        //     friendlyName: `${businessName} nextCall Line`,
        //     voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/inbound`,
        //     voiceMethod: 'POST',
        //     smsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/whatsapp-inbound`,
        //     smsMethod: 'POST'
        //   });
        //
        //   twilioSubAccountSid = subAccount.sid;
        //   twilioPhoneNumber = purchasedNumber.phoneNumber;
        // } catch (twilioError) {
        //   console.error("TWILIO ERROR (Marking user active anyway):", twilioError);
        // }

        const planType = customData.plan || 'standard';

        let minutesLimit;
        let overageRate;

        if (planType === 'premium') {
          minutesLimit = 500;
          overageRate = 0.40;
        } else if (planType === 'trial') {
          minutesLimit = 50; 
          overageRate = 0.00; 
        } else {
          minutesLimit = 200;
          overageRate = 0.50;
        }

        // Reward the referrer!
        if (refCode) {
          const referrer = await businessesCollection.findOne({ referral_code: refCode });
          if (referrer) {
            await businessesCollection.updateOne(
              { _id: referrer._id },
              {
                $inc: { minutes_limit: 50, bonus_minutes: 50 },
                $set: { updated_at: new Date().toISOString() }
              }
            );
            console.log(`${referrer.business_name} earned 50 bonus minutes from referral!`);
          }
        }

        // UPDATE EXISTING BUSINESS IN ASTRADB!
        await businessesCollection.updateOne(
          { business_id: clerkId },
          {
            $set: {
              business_name: businessName,
              owner_phone: ownerPhone,
              business_type: businessType,
              service_area: serviceArea,
               twilio_subaccount_sid: twilioSubAccountSid,
              twilio_number: twilioPhoneNumber, // Keep for backwards compatibility
              twilio_numbers: [twilioPhoneNumber], // NEW: Array for Premium multi-number support
              paddle_subscription_id: payload.data.id,
              paddle_customer_id: payload.data.customer_id,
              status: "active",
              plan_type: planType,
              minutes_limit: minutesLimit,
              overage_rate: overageRate,
              updated_at: new Date().toISOString()
            },
            $setOnInsert: {
              total_minutes_used: 0,
              total_calls_processed: 0,
              referral_code: generateReferralCode(businessName),
              created_at: new Date().toISOString()
            }
          },
          { upsert: true }
        );

        console.log(`Business ${businessName} onboarded on ${planType} plan via Paddle!`);

        // Direct Telegram Alert (No n8n needed)
        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
          const teleMsg = `<b>New Paid User (Paddle)</b>\n\nBusiness: <b>${businessName}</b>\nPlan: ${planType}\nPhone: ${ownerPhone}`;
          fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: teleMsg, parse_mode: 'HTML' })
          }).catch(err => console.error("Telegram fetch failed:", err));
        }

      } catch (error) {
        console.error("Error during automated onboarding:", error);
      }
    }

    // ==========================================
    // 2. SUBSCRIPTION CANCELED / EXPIRED
    // ==========================================
    if (eventName === 'subscription.canceled' || eventName === 'subscription.expired') {
      const subId = payload.data.id;
      const business = await businessesCollection.findOne({ paddle_subscription_id: subId });
      
      if (business) {
        await businessesCollection.updateOne(
          { _id: business._id },
          { $set: { 
            status: "cancelled", 
            cancellation_date: new Date().toISOString(), 
            scheduled_deletion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
          }}
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paddle Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
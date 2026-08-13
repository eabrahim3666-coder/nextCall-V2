import twilioClient from '@/lib/twilio';

type ProvisionBusiness = {
  business_id: string;
  business_name: string;
  plan_type?: string;
};

export async function provisionTwilioNumber(business: ProvisionBusiness) {
  const webhookBase = process.env.TWILIO_WEBHOOK_BASE_URL || "https://www.getnextcall.com";

  // 1. Create a dedicated Twilio subaccount for this business
  const subaccount = await twilioClient.api.accounts.create({
    friendlyName: `${business.business_name} - nextCall`,
  });

  // 2. Find an available US TOLL-FREE number supporting Voice + SMS.
  //    Toll-free numbers are required for Toll-Free SMS Verification (TFV),
  //    which unlocks outbound business SMS without A2P 10DLC registration.
  const availableNumbers = await twilioClient.availablePhoneNumbers('US').tollFree.list({
    limit: 1,
  });
  if (availableNumbers.length === 0) {
    throw new Error("No available toll-free phone numbers to provision");
  }

  // 3. Buy it under the subaccount with our webhooks wired up
  const purchasedNumber = await twilioClient.api.accounts(subaccount.sid).incomingPhoneNumbers.create({
    phoneNumber: availableNumbers[0].phoneNumber,
    friendlyName: `${business.business_name} - nextCall Main Line`,
    voiceUrl: `${webhookBase}/api/webhooks/twilio/inbound`,
    voiceMethod: 'POST',
    smsUrl: `${webhookBase}/api/webhooks/twilio/sms-inbound`,
    smsMethod: 'POST',
  });

  return {
    subaccountSid: subaccount.sid,
    phoneNumber: purchasedNumber.phoneNumber,
    phoneNumberSid: purchasedNumber.sid,
  };
}

export function isProvisioned(business: Record<string, unknown>) {
  return Boolean(
    business?.twilio_subaccount_sid &&
      business?.twilio_subaccount_sid !== "PROVISIONING_FAILED" &&
      business?.twilio_number &&
      business?.twilio_number !== "PROVISIONING_FAILED"
  );
}
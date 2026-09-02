import twilioClient from '@/lib/twilio';

type ProvisionBusiness = {
  business_id: string;
  business_name: string;
  plan_type?: string;
};

export async function provisionTwilioNumber(business: ProvisionBusiness) {
  const webhookBase = process.env.TWILIO_WEBHOOK_BASE_URL || "https://www.getnextcall.com";

  // Names this business's subaccount may exist under: the deterministic new
  // format, plus the legacy format for businesses provisioned before this.
  const subaccountNames = [
    `nextCall ${business.business_id} - ${business.business_name}`,
    `${business.business_name} - nextCall`,
  ];

  // 1. Reuse an existing subaccount for this business when possible. A failed
  //    activation (subaccount created, number purchase failed, nothing
  //    persisted) used to orphan that subaccount forever and a retry would
  //    create a SECOND one — each billing monthly. Best-effort: on list
  //    failure we fall through to creating a fresh subaccount.
  let subaccountSid: string | null = null;
  let createdFresh = false;
  try {
    const existingAccounts = await twilioClient.api.accounts.list({ status: 'active', limit: 1000 });
    const match = existingAccounts.find((a: { friendlyName?: string }) =>
      a.friendlyName && subaccountNames.includes(a.friendlyName)
    );
    if (match) subaccountSid = (match as { sid: string }).sid;
  } catch (listError) {
    console.warn('[provision] Subaccount reuse lookup failed, creating fresh:', listError);
  }

  // 2. If we resolved an existing subaccount, check whether it already owns a
  //    number — concurrent activation events would otherwise each buy one.
  if (subaccountSid) {
    try {
      const existingNumbers = await twilioClient.api.accounts(subaccountSid).incomingPhoneNumbers.list({ limit: 2 });
      if (existingNumbers.length > 0) {
        console.log(`[provision] Reusing existing subaccount ${subaccountSid} with number ${existingNumbers[0].phoneNumber}`);
        return {
          subaccountSid,
          phoneNumber: existingNumbers[0].phoneNumber,
          phoneNumberSid: existingNumbers[0].sid,
        };
      }
      console.log(`[provision] Reusing existing subaccount ${subaccountSid} (no number yet)`);
    } catch (numError) {
      console.warn('[provision] Existing-number lookup failed, continuing with purchase:', numError);
    }
  } else {
    // 3. No existing subaccount — create a dedicated one for this business
    //    (deterministic name so future retries can find and reuse it).
    const subaccount = await twilioClient.api.accounts.create({
      friendlyName: `nextCall ${business.business_id} - ${business.business_name}`,
    });
    subaccountSid = subaccount.sid;
    createdFresh = true;
  }

  // 4. Find an available US TOLL-FREE number supporting Voice + SMS.
  //    Toll-free numbers are required for Toll-Free SMS Verification (TFV),
  //    which unlocks outbound business SMS without A2P 10DLC registration.
  let availableNumbers;
  try {
    availableNumbers = await twilioClient.availablePhoneNumbers('US').tollFree.list({ limit: 1 });
  } catch (searchError) {
    // Freshly created subaccount (this run) with no number yet — close it so a
    // failed purchase doesn't leave an orphaned, monthly-billed subaccount.
    if (createdFresh) await closeSubaccountQuietly(subaccountSid);
    throw searchError;
  }
  if (availableNumbers.length === 0) {
    if (createdFresh) await closeSubaccountQuietly(subaccountSid);
    throw new Error("No available toll-free phone numbers to provision");
  }

  // 5. Buy it under the subaccount with our webhooks wired up. On failure,
  //    close a freshly created subaccount (reuse-lookups keep existing ones —
  //    the business may retry later and we want the same subaccount back).
  let purchasedNumber;
  try {
    purchasedNumber = await twilioClient.api.accounts(subaccountSid).incomingPhoneNumbers.create({
      phoneNumber: availableNumbers[0].phoneNumber,
      friendlyName: `${business.business_name} - nextCall Main Line`,
      voiceUrl: `${webhookBase}/api/webhooks/twilio/inbound`,
      voiceMethod: 'POST',
      smsUrl: `${webhookBase}/api/webhooks/twilio/sms-inbound`,
      smsMethod: 'POST',
    });
  } catch (purchaseError) {
    if (createdFresh) await closeSubaccountQuietly(subaccountSid);
    throw purchaseError;
  }

  return {
    subaccountSid,
    phoneNumber: purchasedNumber.phoneNumber,
    phoneNumberSid: purchasedNumber.sid,
  };
}

/** Best-effort close so failed provisioning doesn't leak a billed subaccount. */
async function closeSubaccountQuietly(sid: string) {
  try {
    await twilioClient.api.accounts(sid).update({ status: 'closed' });
    console.log(`[provision] Closed orphaned subaccount ${sid} after failed provisioning`);
  } catch (closeError) {
    console.warn(`[provision] Failed to close orphaned subaccount ${sid}:`, closeError);
  }
}

export function isProvisioned(business: Record<string, unknown>) {
  return Boolean(
    business?.twilio_subaccount_sid &&
      business?.twilio_subaccount_sid !== "PROVISIONING_FAILED" &&
      business?.twilio_number &&
      business?.twilio_number !== "PROVISIONING_FAILED"
  );
}
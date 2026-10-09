import telnyxClient from "@/lib/telnyx";

type ProvisionBusiness = {
  business_id: string;
  business_name: string;
  plan_type?: string;
};

// Deterministic per-business reference so a retried provisioning can find the
// number it bought before failing (replaces the Twilio subaccount-reuse trick
// — Telnyx has no subaccounts, so the number itself is the unit of isolation).
function customerReference(business: ProvisionBusiness): string {
  return `nextCall ${business.business_id} - ${business.business_name}`;
}

async function findOwnedNumber(reference: string) {
  // Look through numbers we already own for this business's reference.
  for (let page = 1; page <= 10; page++) {
    const numbers = await telnyxClient.phoneNumbers.list({
      filter: { customer_reference: reference },
      "page[number]": page,
      "page[size]": 100,
    } as never);
    const match = (numbers.data || []).find(
      (n: { customer_reference?: string | null }) =>
        n.customer_reference === reference
    );
    if (match) return match;
    const totalPages = (numbers.meta as { total_pages?: number } | undefined)
      ?.total_pages;
    if (totalPages && page >= totalPages) break;
    if (!numbers.data || numbers.data.length === 0) break;
  }
  return null;
}

/**
 * Provision a dedicated US toll-free number for a business (voice + SMS),
 * wired to the nextCall webhooks. Idempotent: if a number with this
 * business's customer_reference already exists it is reused, never duplicated.
 */
export async function provisionTelnyxNumber(business: ProvisionBusiness) {
  const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID || "";
  const connectionId = process.env.TELNYX_CONNECTION_ID || "";
  const reference = customerReference(business);

  // 1. Reuse an existing number for this business when possible — a failed
  //    run (number bought, DB write failed, retried) must not buy a SECOND
  //    monthly-billed number.
  const existing = await findOwnedNumber(reference).catch((e) => {
    console.warn("[provision] owned-number lookup failed:", e);
    return null;
  });
  if (existing) {
    console.log(
      `[provision] Reusing existing number ${existing.phone_number} for ${business.business_id}`
    );
    return {
      phoneNumber: existing.phone_number as string,
      phoneNumberId: existing.id as string,
    };
  }

  // 2. Search inventory for an available US toll-free number with voice+SMS.
  const search = (await telnyxClient.availablePhoneNumbers.list({
    filter: {
      country_code: "US",
      phone_number_type: "toll_free",
      features: ["sms", "voice"],
      limit: 1,
    },
  } as never)) as unknown as { data?: Array<{ phone_number?: string; id?: string }> };
  const candidate = (search.data || [])[0];
  if (!candidate) {
    throw new Error("No available toll-free phone numbers to provision");
  }

  // 3. Buy it, tagging the order with the business reference and attaching
  //    voice (TeXML connection) + SMS (messaging profile) routing in one shot.
  const orderResponse = (await telnyxClient.numberOrders.create({
    phone_numbers: [{ phone_number: candidate.phone_number as string }],
    connection_id: connectionId || undefined,
    messaging_profile_id: messagingProfileId || undefined,
    customer_reference: reference,
  })) as unknown as {
    data?: { id?: string; status?: string; phone_numbers?: Array<{ phone_number?: string }> };
  };
  const order = orderResponse?.data || {};
  if (order.status && order.status !== "success") {
    // US toll-free numbers have no regulatory requirements, so a non-success
    // status here means the order failed outright — surface it.
    throw new Error(
      `Number order for ${candidate.phone_number} ended with status ${order.status}`
    );
  }

  // 4. Configure webhooks on the number (some paths purchase numbers through
  //    the portal, where order-time wiring isn't available).
  const owned = await findOwnedNumber(reference);
  if (owned) {
    try {
      await telnyxClient.phoneNumbers.update(owned.id, {
        connection_id: connectionId || undefined,
        tags: [reference],
      });
    } catch (configError) {
      console.warn("[provision] number configure failed:", configError);
    }
  }

  const phoneNumber =
    owned?.phone_number || (candidate.phone_number as string);
  const phoneNumberId = owned?.id || order.id || "";

  // TELNYX_TEXML_WEBHOOK_SECRET is used by the voice webhook route to
  // authenticate TeXML instruction fetches; provisioning itself doesn't need
  // it (kept only for parity with the TeXML application setup).
  console.log(
    `[provision] Provisioned toll-free ${phoneNumber} for ${business.business_id}`
  );
  return { phoneNumber, phoneNumberId };
}

export function isProvisioned(business: Record<string, unknown>) {
  return Boolean(
    business?.telnyx_number_id &&
      business?.telnyx_number_id !== "PROVISIONING_FAILED" &&
      business?.telnyx_number &&
      business?.telnyx_number !== "PROVISIONING_FAILED"
  );
}

import Twilio from "twilio";
import twilioClient from "@/lib/twilio";
import { smsComplianceCollection, businessesCollection } from "@/lib/astra";
import { TollfreeVerificationStatus } from "twilio/lib/rest/messaging/v1/tollfreeVerification";
import { executeWithRecovery } from "@/lib/recovery/engine";
import { registerOperationExecutor, registerRecoveryActionExecutor } from "@/lib/recovery/registry";

export type SmsComplianceStatus = "none" | "pending" | "approved" | "rejected" | "error";

const INTERNAL_STATUS: Record<TollfreeVerificationStatus, SmsComplianceStatus> = {
  PENDING_REVIEW: "pending",
  IN_REVIEW: "pending",
  TWILIO_APPROVED: "approved",
  TWILIO_REJECTED: "rejected",
};

// The exact shape we store in the `sms_compliance` collection.
export type SmsComplianceRecord = {
  business_id: string;
  status: SmsComplianceStatus;
  twilio_status?: TollfreeVerificationStatus;
  verification_sid?: string;
  sms_tollfree_number?: string;
  sms_tollfree_sid?: string;
  rejection_reasons?: Array<string>;
  rejection_reason?: string;
  edit_allowed?: boolean;
  edit_expiration?: string;
  last_submitted?: Record<string, unknown>;
  submission_count?: number;
  last_error?: string;
  submitted_at?: string;
  updated_at?: string;
  last_sync_at?: string;
};

const TOLLFREE_PREFIX = /^\+?1?(800|833|844|855|866|877|888)/;
const isTollFreeNumber = (n: string) => TOLLFREE_PREFIX.test(n.replace(/[\s-]/g, ""));

const webhookBase = () => process.env.TWILIO_WEBHOOK_BASE_URL || "https://www.getnextcall.com";

async function ensureComplianceCollection(): Promise<boolean> {
  try {
    await smsComplianceCollection.findOne({ business_id: "" });
    return true;
  } catch (err: any) {
    const msg = err?.message || "";
    if (msg.includes("does not exist") || msg.includes("collection") || msg.includes("COLLECTION")) {
      try {
        await db_create();
        return true;
      } catch {
        console.error("[sms-compliance] could not create sms_compliance collection");
        return false;
      }
    }
    return true;
  }
}

async function db_create(): Promise<void> {
  const db = (await import("@/lib/astra")).default;
  await db.createCollection("sms_compliance");
}

// ---------------------------------------------------------------------------
// Record helpers
// ---------------------------------------------------------------------------

export async function getComplianceRecord(businessId: string): Promise<SmsComplianceRecord | null> {
  try {
    const doc = (await smsComplianceCollection.findOne({ business_id: businessId })) as SmsComplianceRecord | null;
    return doc || null;
  } catch (err) {
    await ensureComplianceCollection();
    try {
      return ((await smsComplianceCollection.findOne({ business_id: businessId })) as SmsComplianceRecord) || null;
    } catch (e) {
      console.error("[sms-compliance] record read failed:", e);
      return null;
    }
  }
}

async function upsertComplianceRecord(businessId: string, patch: Partial<SmsComplianceRecord>): Promise<void> {
  await smsComplianceCollection.updateOne(
    { business_id: businessId },
    { $set: { ...patch, updated_at: new Date().toISOString() } },
    { upsert: true }
  );
}

// ---------------------------------------------------------------------------
// Client helpers
// ---------------------------------------------------------------------------

// Sending must happen from the business's own subaccount — a master-scoped
// client sending from a subaccount number fails with Twilio error 21660.
export function getBusinessClient(business: Record<string, any>) {
  const subaccountSid = business?.twilio_subaccount_sid;
  if (subaccountSid && subaccountSid !== "PROVISIONING_FAILED") {
    return Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN, {
      accountSid: subaccountSid as string,
    });
  }
  return twilioClient;
}

// ---------------------------------------------------------------------------
// Recovery integration (lib/recovery)
// ---------------------------------------------------------------------------

// Registered recovery action: when a parent-scoped TFV call fails with an
// auth/authorization error, re-run the operation scoped to the business's own
// subaccount (master credentials + accountSid — no new secrets stored).
// The actual switch happens inside the execute() closure via `shared`.
registerRecoveryActionExecutor("TWILIO_USE_SUBACCOUNT_AUTH", async (ctx) => {
  ctx.shared.useSubaccountAuth = true;
  return {
    ok: true,
    detail: "Switched to subaccount-scoped Twilio client for retry.",
  };
});

async function runTfvOperation<T>(
  business: Record<string, any>,
  op: "create_tollfree_verification" | "update_tollfree_verification",
  tollfreeNumber: string,
  run: (client: typeof twilioClient) => Promise<T>
): Promise<T> {
  return executeWithRecovery({
    provider: "twilio",
    operation: op,
    businessId: String(business.business_id),
    userId: String(business.business_id),
    // TFV is idempotent in practice: Twilio rejects a second verification for
    // the same number with a duplicate error, and we reconcile via
    // externalReferenceId. Safe to retry.
    idempotent: true,
    // Duplicate verifications are handled gracefully by the existing
    // reconciliation below — no need to raise an incident for them.
    suppressCategories: ["DUPLICATE"],
    context: {
      businessName: business.business_name || "",
      tollfreeNumber,
    },
    execute: async (shared) => {
      const client = shared.useSubaccountAuth ? getBusinessClient(business) : twilioClient;
      return run(client);
    },
  });
}

// Admin-manual-retry path for TFV submissions. It reconciles first (the
// verification may actually exist), and only re-submits when none exists —
// with the same subaccount-scope fallback the automatic recovery uses.
registerOperationExecutor("twilio", "create_tollfree_verification", async (ctx) => {
  const businessId = ctx.businessId;
  if (!businessId) return { ok: false, detail: "missing business_id" };
  try {
    const business = await businessesCollection.findOne({ business_id: businessId });
    if (!business) return { ok: false, detail: "business not found" };

    const record = await getComplianceRecord(businessId);
    if (record?.status === "approved") {
      return { ok: true, detail: "Verification already approved." };
    }

    const reconcile = await twilioClient.messaging.v1.tollfreeVerifications.list({
      externalReferenceId: businessId,
      includeSubAccounts: true,
      limit: 1,
    });
    if (reconcile.length > 0) {
      const status = String(reconcile[0].status);
      if (status === "TWILIO_APPROVED") {
        await upsertComplianceRecord(businessId, { status: "approved", twilio_status: status, verification_sid: reconcile[0].sid });
        return { ok: true, detail: `Verification ${reconcile[0].sid} is approved.` };
      }
      return { ok: false, detail: `Verification ${reconcile[0].sid} exists with status ${status} — no re-submission needed.` };
    }

    const form = (ctx.context?.form as TfvForm | undefined) || (record?.last_submitted as unknown as TfvForm | undefined);
    if (!form) return { ok: false, detail: "No stored TFV form available for re-submission." };

    const { number, sid } = await ensureTollfreeNumber(business, record);
    const parms = buildCreateParams(business, form, number, sid);

    const attemptWith = async (client: typeof twilioClient) => {
      const created = await client.messaging.v1.tollfreeVerifications.create(parms);
      await upsertComplianceRecord(businessId, {
        status: INTERNAL_STATUS[created.status] || "pending",
        twilio_status: created.status,
        verification_sid: created.sid,
        submitted_at: new Date().toISOString(),
        last_error: "",
      });
      return { ok: true as const, detail: `Re-submitted TFV ${created.sid} — status ${created.status}.` };
    };

    try {
      return await attemptWith(twilioClient);
    } catch (err: unknown) {
      const e = err as { code?: unknown; status?: unknown };
      const code = String(e?.code ?? "");
      const status = Number(e?.status ?? 0);
      if (code === "20003" || code === "20103" || status === 401 || status === 403) {
        try {
          return await attemptWith(getBusinessClient(business));
        } catch (subErr) {
          return { ok: false, detail: `Subaccount-scoped retry failed: ${(subErr as Error)?.message?.slice(0, 300)}` };
        }
      }
      return { ok: false, detail: (err as Error)?.message?.slice(0, 300) || "verification failed" };
    }
  } catch (err) {
    return { ok: false, detail: (err as Error)?.message?.slice(0, 300) || "unexpected failure" };
  }
});

// ---------------------------------------------------------------------------
// Gating + sending
// ---------------------------------------------------------------------------

// A business may only send outbound SMS once its toll-free number has been
// approved by Twilio. Inbound SMS, voice, webhooks and OTP are NOT affected.
export async function isSmsApproved(business: Record<string, any>): Promise<boolean> {
  const businessId = business?.business_id;
  if (!businessId) return false;
  const record = await getComplianceRecord(businessId);
  return record?.status === "approved";
}

export type SendSmsResult =
  | { ok: true; sid: string }
  | { ok: false; reason: "not_approved" | "no_number" | "error"; detail?: string };

export async function sendBusinessSms(
  business: Record<string, any>,
  opts: { to: string; body: string; channel?: "SMS" | "WhatsApp" }
): Promise<SendSmsResult> {
  try {
    const businessId = business?.business_id;
    if (!businessId) return { ok: false, reason: "no_number" };

    const record = await getComplianceRecord(businessId);
    if (record?.status !== "approved") {
      console.log(`[sms-compliance] blocked outbound SMS for ${businessId} — verification not approved`);
      return { ok: false, reason: "not_approved" };
    }

    const from = record.sms_tollfree_number || business.twilio_number;
    if (!from || from === "PROVISIONING_FAILED") return { ok: false, reason: "no_number" };

    const client = getBusinessClient(business);
    const message = await client.messages.create({
      from,
      to: opts.channel === "WhatsApp" ? `whatsapp:${opts.to}` : opts.to,
      body: opts.body,
    });
    return { ok: true, sid: message.sid };
  } catch (err) {
    console.error("[sms-compliance] send failed:", err);
    return { ok: false, reason: "error", detail: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// Toll-free number handling
// ---------------------------------------------------------------------------

// Verifications only apply to toll-free numbers. If the business's main line is
// local (legacy/hand-provisioned) we buy a toll-free number in their subaccount
// when they enable Business SMS, and remember it on the compliance record.
export async function ensureTollfreeNumber(
  business: Record<string, any>,
  record: SmsComplianceRecord | null
): Promise<{ number: string; sid: string }> {
  const businessId = business?.business_id;
  if (!businessId) throw new Error("Missing business_id");

  if (record?.sms_tollfree_number && record?.sms_tollfree_sid) {
    return { number: record.sms_tollfree_number, sid: record.sms_tollfree_sid };
  }

  const subaccountSid = business?.twilio_subaccount_sid;
  if (!subaccountSid || subaccountSid === "PROVISIONING_FAILED") {
    throw new Error("Your phone line was never set up. Contact support to enable Business SMS.");
  }

  const mainNumber = typeof business?.twilio_number === "string" ? business.twilio_number : "";
  if (mainNumber && isTollFreeNumber(mainNumber)) {
    const existing = await twilioClient.api.accounts(subaccountSid).incomingPhoneNumbers.list({
      phoneNumber: mainNumber,
      limit: 1,
    });
    if (existing.length > 0) {
      await upsertComplianceRecord(businessId, {
        sms_tollfree_number: existing[0].phoneNumber,
        sms_tollfree_sid: existing[0].sid,
      });
      return { number: existing[0].phoneNumber, sid: existing[0].sid };
    }
  }

  const available = await twilioClient.availablePhoneNumbers("US").tollFree.list({ limit: 1 });
  if (available.length === 0) {
    throw new Error("No toll-free numbers currently available. Please try again later.");
  }

  const purchased = await twilioClient.api.accounts(subaccountSid).incomingPhoneNumbers.create({
    phoneNumber: available[0].phoneNumber,
    friendlyName: `${business?.business_name || "Business"} - nextCall SMS Line`,
    voiceUrl: `${webhookBase()}/api/webhooks/twilio/inbound`,
    voiceMethod: "POST",
    smsUrl: `${webhookBase()}/api/webhooks/twilio/sms-inbound`,
    smsMethod: "POST",
  });

  await upsertComplianceRecord(businessId, {
    sms_tollfree_number: purchased.phoneNumber,
    sms_tollfree_sid: purchased.sid,
  });

  console.log(`[sms-compliance] bought toll-free ${purchased.phoneNumber} for ${businessId}`);
  return { number: purchased.phoneNumber, sid: purchased.sid };
}

// ---------------------------------------------------------------------------
// TFV submission
// ---------------------------------------------------------------------------

export type TfvForm = {
  businessName: string;
  doingBusinessAs?: string;
  businessWebsite: string;
  businessType: string;
  registrationNumber?: string;
  registrationAuthority?: string;
  registrationCountry?: string;
  streetAddress: string;
  city: string;
  stateProvinceRegion: string;
  postalCode: string;
  country: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
  notificationEmail: string;
  useCaseCategories: string[];
  useCaseSummary: string;
  productionMessageSample: string;
  optInType: string;
  optInImageUrls: string[];
  messageVolume: string;
  privacyPolicyUrl: string;
  termsAndConditionsUrl: string;
  additionalInformation?: string;
  editReason?: string;
};

export type SubmitResult =
  | { status: "pending"; verificationSid?: string; message?: string }
  | { status: "approved"; verificationSid?: string }
  | { status: "error"; verificationSid?: string; message: string };

function buildCreateParams(business: Record<string, any>, form: TfvForm, number: string, sid: string) {
  return {
    tollfreePhoneNumberSid: sid,
    businessName: form.businessName,
    businessWebsite: form.businessWebsite,
    notificationEmail: form.notificationEmail,
    useCaseCategories: form.useCaseCategories,
    useCaseSummary: form.useCaseSummary,
    productionMessageSample: form.productionMessageSample,
    optInImageUrls: form.optInImageUrls,
    optInType: form.optInType as any,
    messageVolume: form.messageVolume,
    businessStreetAddress: form.streetAddress,
    businessCity: form.city,
    businessStateProvinceRegion: form.stateProvinceRegion,
    businessPostalCode: form.postalCode,
    businessCountry: form.country,
    businessContactFirstName: form.contactFirstName,
    businessContactLastName: form.contactLastName,
    businessContactEmail: form.contactEmail,
    businessContactPhone: form.contactPhone,
    businessType: form.businessType as any,
    doingBusinessAs: form.doingBusinessAs || undefined,
    additionalInformation: form.additionalInformation || undefined,
    privacyPolicyUrl: form.privacyPolicyUrl,
    termsAndConditionsUrl: form.termsAndConditionsUrl,
    externalReferenceId: business?.business_id,
    ...(form.businessType !== "SOLE_PROPRIETOR"
      ? {
          businessRegistrationNumber: form.registrationNumber,
          businessRegistrationAuthority: form.registrationAuthority as any,
          businessRegistrationCountry: form.registrationCountry,
        }
      : {}),
    ...(process.env.TWILIO_TFV_CUSTOMER_PROFILE_SID
      ? { customerProfileSid: process.env.TWILIO_TFV_CUSTOMER_PROFILE_SID }
      : {}),
  };
}

export async function submitTollfreeVerification(
  business: Record<string, any>,
  form: TfvForm
): Promise<SubmitResult> {
  const businessId = business?.business_id;
  if (!businessId) throw new Error("Missing business_id");

  const record = await getComplianceRecord(businessId);
  const currentStatus = record?.status;

  // Idempotency: never double-submit while a verification is in flight.
  if (currentStatus === "pending") {
    return { status: "pending", verificationSid: record?.verification_sid };
  }
  if (currentStatus === "approved") {
    return { status: "approved", verificationSid: record?.verification_sid };
  }

  const { number, sid } = await ensureTollfreeNumber(business, record);
  const parms = buildCreateParams(business, form, number, sid);

  try {
    const canEdit =
      currentStatus === "rejected" &&
      record?.edit_allowed !== false &&
      (!record?.edit_expiration || new Date(record.edit_expiration).getTime() > Date.now());

    if (canEdit && record?.verification_sid) {
      const updated = await runTfvOperation(
        business,
        "update_tollfree_verification",
        number,
        (client) =>
          client.messaging.v1.tollfreeVerifications(record.verification_sid!).update({
            ...parms,
            editReason: form.editReason || "Information corrected — please re-review",
          })
      );
      await upsertComplianceRecord(businessId, {
        status: INTERNAL_STATUS[updated.status] || "pending",
        twilio_status: updated.status,
        verification_sid: updated.sid,
        rejection_reasons: [],
        rejection_reason: "",
        edit_allowed: false,
        last_submitted: form as unknown as Record<string, unknown>,
        submission_count: (record?.submission_count || 0) + 1,
      });
      return { status: "pending", verificationSid: updated.sid };
    }

    const created = await runTfvOperation(
      business,
      "create_tollfree_verification",
      number,
      (client) => client.messaging.v1.tollfreeVerifications.create(parms)
    );
    await upsertComplianceRecord(businessId, {
      status: INTERNAL_STATUS[created.status] || "pending",
      twilio_status: created.status,
      verification_sid: created.sid,
      rejection_reasons: [],
      rejection_reason: "",
      edit_allowed: false,
      last_submitted: form as unknown as Record<string, unknown>,
      submission_count: (record?.submission_count || 0) + 1,
      submitted_at: new Date().toISOString(),
      last_error: "",
    });
    return { status: "pending", verificationSid: created.sid };
  } catch (err: any) {
    // A create can fail because a verification already exists for this number —
    // reconcile via our externalReferenceId instead of surfacing the error.
    const msg = err?.message || String(err);
    console.error(`[sms-compliance] TFV submit failed for ${businessId}:`, msg);
    if (!record?.verification_sid) {
      try {
        const existing = await twilioClient.messaging.v1.tollfreeVerifications.list({
          externalReferenceId: businessId,
          includeSubAccounts: true,
          limit: 1,
        });
        if (existing.length > 0) {
          const mapped = INTERNAL_STATUS[existing[0].status];
          await upsertComplianceRecord(businessId, {
            status: mapped || "pending",
            twilio_status: existing[0].status,
            verification_sid: existing[0].sid,
          });
          return {
            status: mapped === "approved" ? "approved" : "pending",
            verificationSid: existing[0].sid,
          };
        }
      } catch (listErr) {
        console.error("[sms-compliance] TFV reconciliation failed:", listErr);
      }
    }
    await upsertComplianceRecord(businessId, { status: "error", last_error: msg });
    return {
      status: "error",
      verificationSid: record?.verification_sid,
      message: "We couldn't submit your verification right now. Please try again in a few minutes.",
    };
  }
}

// ---------------------------------------------------------------------------
// Status refresh
// ---------------------------------------------------------------------------

// Twilio notifies by email; we also re-sync lazily (LOG_REFRESH_MS window) so
// results show up in-app without requiring a cron.
const LOG_REFRESH_MS = 6 * 60 * 60 * 1000;

export async function refreshComplianceStatus(business: Record<string, any>): Promise<SmsComplianceRecord | null> {
  const businessId = business?.business_id;
  if (!businessId) return null;

  const record = await getComplianceRecord(businessId);
  if (!record?.verification_sid) return record;

  if (record.last_sync_at && Date.now() - new Date(record.last_sync_at).getTime() < LOG_REFRESH_MS) {
    return record;
  }

  try {
    const fetched = await twilioClient.messaging.v1.tollfreeVerifications(record.verification_sid).fetch();
    const status = INTERNAL_STATUS[fetched.status] || "pending";
    const rejectionReasons = Array.isArray(fetched.rejectionReasons)
      ? fetched.rejectionReasons
          .map((r: any) => (typeof r === "string" ? r : r?.message || r?.type || JSON.stringify(r)))
          .filter(Boolean)
      : [];
    const patch: Partial<SmsComplianceRecord> = {
      status,
      twilio_status: fetched.status,
      last_sync_at: new Date().toISOString(),
    };
    if (fetched.rejectionReason) patch.rejection_reason = fetched.rejectionReason;
    if (rejectionReasons.length > 0) patch.rejection_reasons = rejectionReasons;
    if (typeof fetched.editAllowed === "boolean") patch.edit_allowed = fetched.editAllowed;
    if (fetched.editExpiration) patch.edit_expiration = fetched.editExpiration.toISOString();
    if (fetched.tollfreePhoneNumber) patch.sms_tollfree_number = fetched.tollfreePhoneNumber;
    await upsertComplianceRecord(businessId, patch);
    return { ...record, ...patch };
  } catch (err) {
    console.error(`[sms-compliance] status refresh failed for ${businessId}:`, err);
    return record;
  }
}

// Strips internal fields before anything is returned to the client.
export function publicComplianceView(record: SmsComplianceRecord | null) {
  if (!record) return null;
  return {
    status: record.status,
    twilio_status: record.twilio_status || null,
    tollfree_number: record.sms_tollfree_number || null,
    rejection_reasons: record.rejection_reasons || [],
    rejection_reason: record.rejection_reason || null,
    edit_allowed: record.edit_allowed ?? null,
    edit_expiration: record.edit_expiration || null,
    submitted_at: record.submitted_at || null,
    last_submitted: record.last_submitted || null,
    submission_count: record.submission_count || 0,
  };
}
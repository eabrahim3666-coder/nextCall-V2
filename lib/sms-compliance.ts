import telnyxClient from "@/lib/telnyx";
import { provisionTelnyxNumber } from "@/lib/telnyx-provision";
import { smsComplianceCollection, smsOptoutsCollection, businessesCollection } from "@/lib/astra";
import { executeWithRecovery } from "@/lib/recovery/engine";
import { registerOperationExecutor } from "@/lib/recovery/registry";

// Telnyx Toll-Free Verification status values (see
// node_modules/telnyx/src/resources/messaging-tollfree/verification/requests.ts).
// Declared locally instead of deep-importing SDK internals.
type TfVerificationStatus =
  | "Verified"
  | "Rejected"
  | "Waiting For Vendor"
  | "Waiting For Customer"
  | "Waiting For Telnyx"
  | "In Progress";

export type SmsComplianceStatus = "none" | "pending" | "approved" | "rejected" | "error";

const INTERNAL_STATUS: Record<TfVerificationStatus, SmsComplianceStatus> = {
  "Verified": "approved",
  "Rejected": "rejected",
  "Waiting For Vendor": "pending",
  "Waiting For Customer": "pending",
  "Waiting For Telnyx": "pending",
  "In Progress": "pending",
};

// The exact shape we store in the `sms_compliance` collection.
// `twilio_status` is kept as the field name for UI/DB continuity — since the
// Telnyx switch it carries Telnyx's verification status instead.
export type SmsComplianceRecord = {
  business_id: string;
  status: SmsComplianceStatus;
  twilio_status?: TfVerificationStatus | string;
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

const webhookBase = () => process.env.TELNYX_WEBHOOK_BASE_URL || "https://www.getnextcall.com";

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

async function db_createCollection(name: string): Promise<void> {
  const db = (await import("@/lib/astra")).default;
  await db.createCollection(name);
}

// ---------------------------------------------------------------------------
// Record helpers
// ---------------------------------------------------------------------------

export async function getComplianceRecord(businessId: string): Promise<SmsComplianceRecord | null> {
  try {
    const doc = (await smsComplianceCollection.findOne({ business_id: businessId })) as SmsComplianceRecord | null;
    return doc || null;
  } catch {
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
// Number lookup helpers (Telnyx has no subaccounts — the number itself is the
// unit of isolation, tagged with a deterministic customer_reference).
// ---------------------------------------------------------------------------

// The business's main line: new telnyx_number field, falling back to the
// legacy twilio_number field so pre-migration records keep working.
function businessMainNumber(business: Record<string, any>): string {
  const n = business?.telnyx_number ?? business?.twilio_number;
  return typeof n === "string" ? n : "";
}

async function findOwnedNumberByE164(e164: string): Promise<{ id: string; phone_number: string } | null> {
  const numbers = await telnyxClient.phoneNumbers.list({
    filter: { phone_number: e164 },
    "page[number]": 1,
    "page[size]": 25,
  } as never);
  const hit = (numbers.data || [])[0] as { id?: string; phone_number?: string } | undefined;
  if (hit?.id && hit?.phone_number) return { id: hit.id, phone_number: hit.phone_number };
  return null;
}

// ---------------------------------------------------------------------------
// Recovery integration (lib/recovery)
// ---------------------------------------------------------------------------

async function runTfvOperation<T>(
  business: Record<string, any>,
  op: "create_tollfree_verification" | "update_tollfree_verification",
  tollfreeNumber: string,
  run: () => Promise<T>
): Promise<T> {
  return executeWithRecovery({
    provider: "telnyx",
    operation: op,
    businessId: String(business.business_id),
    userId: String(business.business_id),
    // TFV is idempotent in practice: Telnyx rejects a duplicate verification
    // request for the same number, and we reconcile via the stored request id
    // / phone-number lookup. Safe to retry.
    idempotent: true,
    // Duplicate verifications are handled gracefully by the existing
    // reconciliation below — no need to raise an incident for them.
    suppressCategories: ["DUPLICATE"],
    context: {
      businessName: business.business_name || "",
      tollfreeNumber,
    },
    execute: async () => run(),
  });
}

// Admin-manual-retry path for TFV submissions. It reconciles first (the
// request may actually exist), and only re-submits when none exists.
registerOperationExecutor("telnyx", "create_tollfree_verification", async (ctx) => {
  const businessId = ctx.businessId;
  if (!businessId) return { ok: false, detail: "missing business_id" };
  try {
    const business = await businessesCollection.findOne({ business_id: businessId });
    if (!business) return { ok: false, detail: "business not found" };

    const record = await getComplianceRecord(businessId);
    if (record?.status === "approved") {
      return { ok: true, detail: "Verification already approved." };
    }

    // Reconcile: a request may exist for the toll-free number even when our
    // last submission attempt errored.
    const tollfree = record?.sms_tollfree_number;
    if (tollfree) {
      const reconcile = (await telnyxClient.messagingTollfree.verification.requests.list({
        phone_number: tollfree,
        page: 1,
        page_size: 10,
      } as never)) as unknown as { data?: Array<{ id?: string; verificationStatus?: TfVerificationStatus }> };
      const existing = (reconcile.data || []).find((r) => r.id);
      if (existing?.id) {
        const status = existing.verificationStatus || "In Progress";
        if (status === "Verified") {
          await upsertComplianceRecord(businessId, { status: "approved", twilio_status: status, verification_sid: existing.id });
          return { ok: true, detail: `Verification request ${existing.id} is approved.` };
        }
        if (status === "Rejected") {
          await upsertComplianceRecord(businessId, { status: "rejected", twilio_status: status, verification_sid: existing.id });
          return { ok: false, detail: `Verification request ${existing.id} was rejected — fix the issues and resubmit.` };
        }
        await upsertComplianceRecord(businessId, { status: "pending", twilio_status: status, verification_sid: existing.id });
        return { ok: false, detail: `Verification request ${existing.id} exists with status "${status}" — no re-submission needed.` };
      }
    }

    const form = (ctx.context?.form as TfvForm | undefined) || (record?.last_submitted as unknown as TfvForm | undefined);
    if (!form) return { ok: false, detail: "No stored verification form available for re-submission." };

    const { number } = await ensureTollfreeNumber(business, record);
    const params = buildCreateParams(business, form, number);

    const created = (await telnyxClient.messagingTollfree.verification.requests.create(
      params as never
    )) as unknown as { id?: string; verificationStatus?: TfVerificationStatus };

    const status = created.verificationStatus || "In Progress";
    await upsertComplianceRecord(businessId, {
      status: INTERNAL_STATUS[status] || "pending",
      twilio_status: status,
      verification_sid: created.id || "",
      submitted_at: new Date().toISOString(),
      last_error: "",
    });
    return { ok: true, detail: `Re-submitted verification request ${created.id} — status ${status}.` };
  } catch (err) {
    return { ok: false, detail: (err as Error)?.message?.slice(0, 300) || "unexpected failure" };
  }
});

// ---------------------------------------------------------------------------
// Gating + sending
// ---------------------------------------------------------------------------

// A business may only send outbound SMS once its toll-free number has been
// verified ("Verified") on Telnyx. Inbound SMS, voice, webhooks and OTP are
// NOT affected.
export async function isSmsApproved(business: Record<string, any>): Promise<boolean> {
  const businessId = business?.business_id;
  if (!businessId) return false;
  const record = await getComplianceRecord(businessId);
  return record?.status === "approved";
}

// ---------------------------------------------------------------------------
// Per-recipient opt-out (TCPA / carrier A2P compliance)
// ---------------------------------------------------------------------------
// Carriers block sends to numbers that texted STOP, but the AI chat would
// still generate replies, reminders would error, and nothing in-app honored
// the opt-out. This makes opt-out a first-class, enforced state at the
// sendBusinessSms choke point.

// Deliberately narrow: an AI chat where customers book/cancel appointments
// means ambiguous words like CANCEL/END/QUIT would opt out customers who were
// just trying to cancel an appointment. Only unambiguous opt-out words.
const OPT_OUT_KEYWORDS = ["stop", "stopall", "unsubscribe"];
const OPT_IN_KEYWORDS = ["start", "unstop"];

export function classifyOptOutKeyword(body: string): "opt_out" | "opt_in" | null {
  const normalized = body.trim().toLowerCase().replace(/[^\w]/g, "");
  if (!normalized) return null;
  if (OPT_OUT_KEYWORDS.includes(normalized)) return "opt_out";
  if (OPT_IN_KEYWORDS.includes(normalized)) return "opt_in";
  return null;
}

// The sms_optouts collection may not exist yet on an established database —
// create it lazily on first miss (same pattern as ensureComplianceCollection).
async function ensureOptoutsCollection(): Promise<void> {
  try {
    await db_createCollection("sms_optouts");
  } catch {
    // Already exists or creation raced — either way the next write/read works.
  }
}

function isMissingCollectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("does not exist") || msg.includes("COLLECTION") || msg.includes("collection");
}

export async function isCustomerOptedOut(businessId: string, phone: string): Promise<boolean> {
  if (!businessId || !phone) return false;
  try {
    const doc = await smsOptoutsCollection.findOne({ business_id: businessId, customer_phone: phone });
    return Boolean(doc?.opted_out && !doc?.opted_in_at);
  } catch (err) {
    // A missing collection simply means no opt-outs have ever been recorded
    // (fail open, then create it so the next call succeeds). Any other storage
    // error fails CLOSED — never text a possibly opted-out customer.
    if (isMissingCollectionError(err)) {
      await ensureOptoutsCollection();
      return false;
    }
    console.error("[sms-compliance] opt-out lookup failed:", err);
    return true;
  }
}

export async function setCustomerOptedOut(businessId: string, phone: string): Promise<void> {
  if (!businessId || !phone) return;
  try {
    await smsOptoutsCollection.updateOne(
      { business_id: businessId, customer_phone: phone },
      {
        $set: {
          opted_out: true,
          opted_out_at: new Date().toISOString(),
          opted_in_at: null,
        },
      },
      { upsert: true }
    );
  } catch (err) {
    if (isMissingCollectionError(err)) {
      await ensureOptoutsCollection();
      await smsOptoutsCollection.updateOne(
        { business_id: businessId, customer_phone: phone },
        {
          $set: {
            opted_out: true,
            opted_out_at: new Date().toISOString(),
            opted_in_at: null,
          },
        },
        { upsert: true }
      );
      return;
    }
    throw err;
  }
}

export async function clearCustomerOptOut(businessId: string, phone: string): Promise<void> {
  if (!businessId || !phone) return;
  try {
    await smsOptoutsCollection.updateOne(
      { business_id: businessId, customer_phone: phone },
      {
        $set: {
          opted_out: false,
          opted_in_at: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
  } catch (err) {
    if (isMissingCollectionError(err)) {
      await ensureOptoutsCollection();
      await smsOptoutsCollection.updateOne(
        { business_id: businessId, customer_phone: phone },
        {
          $set: {
            opted_out: false,
            opted_in_at: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
      return;
    }
    throw err;
  }
}

export type SendSmsResult =
  | { ok: true; sid: string }
  | { ok: false; reason: "not_approved" | "opted_out" | "no_number" | "error"; detail?: string };

export async function sendBusinessSms(
  business: Record<string, any>,
  opts: { to: string; body: string; channel?: "SMS" | "WhatsApp" }
): Promise<SendSmsResult> {
  try {
    const businessId = business?.business_id;
    if (!businessId) return { ok: false, reason: "no_number" };

    const phone = opts.to.replace("whatsapp:", "");

    // TCPA: never text a customer who replied STOP — applies to every
    // outbound path (AI replies, reminders, review requests, missed-call SMS).
    if (await isCustomerOptedOut(businessId, phone)) {
      console.log(`[sms-compliance] blocked outbound SMS for ${businessId} — ${phone} opted out`);
      return { ok: false, reason: "opted_out" };
    }

    const record = await getComplianceRecord(businessId);
    if (record?.status !== "approved") {
      console.log(`[sms-compliance] blocked outbound SMS for ${businessId} — verification not approved`);
      return { ok: false, reason: "not_approved" };
    }

    const from = record.sms_tollfree_number || businessMainNumber(business);
    if (!from || from === "PROVISIONING_FAILED") return { ok: false, reason: "no_number" };

    const message = await telnyxClient.messages.send({
      from,
      to: opts.channel === "WhatsApp" ? opts.to : phone,
      text: opts.body,
    });
    const sid = (message as unknown as { data?: { id?: string } })?.data?.id || "";
    return { ok: true, sid };
  } catch (err) {
    console.error("[sms-compliance] send failed:", err);
    return { ok: false, reason: "error", detail: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// Toll-free number handling
// ---------------------------------------------------------------------------

// Verifications only apply to toll-free numbers. If the business's main line
// is local (legacy/hand-provisioned) we buy a toll-free number for them when
// they enable Business SMS, and remember it on the compliance record.
export async function ensureTollfreeNumber(
  business: Record<string, any>,
  record: SmsComplianceRecord | null
): Promise<{ number: string; sid: string }> {
  const businessId = business?.business_id;
  if (!businessId) throw new Error("Missing business_id");

  if (record?.sms_tollfree_number && record?.sms_tollfree_sid) {
    return { number: record.sms_tollfree_number, sid: record.sms_tollfree_sid };
  }

  const mainNumber = businessMainNumber(business);
  if (mainNumber && isTollFreeNumber(mainNumber)) {
    const existing = await findOwnedNumberByE164(mainNumber).catch(() => null);
    if (existing) {
      await upsertComplianceRecord(businessId, {
        sms_tollfree_number: existing.phone_number,
        sms_tollfree_sid: existing.id,
      });
      return { number: existing.phone_number, sid: existing.id };
    }
  }

  // Buy a dedicated toll-free line (idempotent per business) and remember it.
  const provisioned = await provisionTelnyxNumber({
    business_id: businessId,
    business_name: business?.business_name || "Business",
    plan_type: business?.plan_type,
  });
  await upsertComplianceRecord(businessId, {
    sms_tollfree_number: provisioned.phoneNumber,
    sms_tollfree_sid: provisioned.phoneNumberId,
  });
  console.log(`[sms-compliance] provisioned toll-free ${provisioned.phoneNumber} for ${businessId}`);
  return { number: provisioned.phoneNumber, sid: provisioned.phoneNumberId };
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

// Telnyx takes ONE use-case label per request. Map the dashboard's multi-select
// (Twilio-style codes) onto Telnyx's UseCaseCategories union; anything unmapped
// collapses to "Mixed".
const USE_CASE_MAP: Record<string, string> = {
  CUSTOMER_CARE: "Chatbot",
  ACCOUNT_NOTIFICATIONS: "Appointments",
  DELIVERY_NOTIFICATIONS: "Order Notifications",
  MARKETING: "General Marketing",
  EVENTS: "Events & Planning",
};

function mapUseCase(categories: string[]): string {
  for (const c of categories) {
    if (USE_CASE_MAP[c]) return USE_CASE_MAP[c];
  }
  return "Mixed";
}

// Telnyx's messageVolume enum is a sparse list of strings
// ('10' | '100' | '1,000' | '10,000' | ...). Snap the dashboard's value up to
// the nearest bucket.
function mapVolume(v: string): string {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return "1,000";
  if (n <= 10) return "10";
  if (n <= 100) return "100";
  if (n <= 1000) return "1,000";
  if (n <= 10000) return "10,000";
  if (n <= 100000) return "100,000";
  if (n <= 250000) return "250,000";
  if (n <= 500000) return "500,000";
  if (n <= 750000) return "750,000";
  if (n <= 1000000) return "1,000,000";
  return "5,000,000+";
}

const OPT_IN_WORKFLOW_TEXT: Record<string, string> = {
  VERBAL: "Customers opt in verbally — they agree during a phone call with the business.",
  WEB_FORM: "Customers opt in through a web form on the business's website.",
  PAPER_FORM: "Customers opt in by signing a paper or tablet form in person.",
  VIA_TEXT: "Customers opt in by texting a keyword to the business's number.",
  MOBILE_QR_CODE: "Customers opt in by scanning a QR code that opens the consent form.",
  IMPORT: "Contacts were imported with prior documented consent to receive texts.",
};

function buildOptInWorkflow(form: TfvForm): string {
  const base = OPT_IN_WORKFLOW_TEXT[form.optInType] || "Customers opt in by explicit consent.";
  const urls = form.optInImageUrls?.length ? ` Opt-in proof: ${form.optInImageUrls.join(", ")}.` : "";
  return `${base}${urls}`;
}

function buildCreateParams(business: Record<string, any>, form: TfvForm, number: string) {
  return {
    businessName: form.businessName,
    corporateWebsite: form.businessWebsite,
    businessAddr1: form.streetAddress,
    businessCity: form.city,
    businessState: form.stateProvinceRegion,
    businessZip: form.postalCode,
    businessContactFirstName: form.contactFirstName,
    businessContactLastName: form.contactLastName,
    businessContactEmail: form.contactEmail,
    businessContactPhone: form.contactPhone,
    doingBusinessAs: form.doingBusinessAs || undefined,
    additionalInformation: form.additionalInformation || "",
    privacyPolicyURL: form.privacyPolicyUrl,
    termsAndConditionURL: form.termsAndConditionsUrl,
    useCase: mapUseCase(form.useCaseCategories),
    useCaseSummary: form.useCaseSummary,
    productionMessageContent: form.productionMessageSample,
    messageVolume: mapVolume(form.messageVolume),
    optInWorkflow: buildOptInWorkflow(form),
    optInWorkflowImageURLs: (form.optInImageUrls || []).map((url) => ({ url })),
    phoneNumbers: [{ phoneNumber: number }],
    webhookUrl: `${webhookBase()}/api/webhooks/telnyx/sms-inbound`,
    ...(form.businessType !== "SOLE_PROPRIETOR"
      ? {
          businessRegistrationNumber: form.registrationNumber,
          businessRegistrationType: form.registrationAuthority,
          businessRegistrationCountry: form.registrationCountry,
        }
      : {}),
    // Telnyx TFV has no external-reference field; the phone number itself is
    // the reconciliation key (see the reconciliation lookups above).
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

  const { number } = await ensureTollfreeNumber(business, record);
  const params = buildCreateParams(business, form, number);

  try {
    // Telnyx has no edit-window concept: while a request is not Verified you
    // can update it, so treat a rejected request as editable unless the admin
    // disabled edits locally.
    const canEdit =
      currentStatus === "rejected" &&
      record?.edit_allowed !== false &&
      record?.verification_sid &&
      Boolean(form.editReason);

    if (canEdit && record?.verification_sid) {
      const updated = (await runTfvOperation(
        business,
        "update_tollfree_verification",
        number,
        () =>
          telnyxClient.messagingTollfree.verification.requests.update(
            record.verification_sid!,
            params as never,
          )
      )) as unknown as { id?: string; verificationStatus?: TfVerificationStatus };

      const status = updated.verificationStatus || "In Progress";
      await upsertComplianceRecord(businessId, {
        status: INTERNAL_STATUS[status] || "pending",
        twilio_status: status,
        verification_sid: updated.id || record.verification_sid,
        rejection_reasons: [],
        rejection_reason: "",
        last_submitted: form as unknown as Record<string, unknown>,
        submission_count: (record?.submission_count || 0) + 1,
        last_error: "",
      });
      return { status: "pending", verificationSid: updated.id || record.verification_sid };
    }

    const created = (await runTfvOperation(
      business,
      "create_tollfree_verification",
      number,
      () => telnyxClient.messagingTollfree.verification.requests.create(params as never)
    )) as unknown as { id?: string; verificationStatus?: TfVerificationStatus };

    const status = created.verificationStatus || "In Progress";
    await upsertComplianceRecord(businessId, {
      status: INTERNAL_STATUS[status] || "pending",
      twilio_status: status,
      verification_sid: created.id || "",
      rejection_reasons: [],
      rejection_reason: "",
      last_submitted: form as unknown as Record<string, unknown>,
      submission_count: (record?.submission_count || 0) + 1,
      submitted_at: new Date().toISOString(),
      last_error: "",
    });
    return { status: "pending", verificationSid: created.id };
  } catch (err: any) {
    // A create can fail because a verification request already exists for this
    // number — reconcile via our phone-number lookup instead of surfacing it.
    const msg = err?.message || String(err);
    console.error(`[sms-compliance] TFV submit failed for ${businessId}:`, msg);
    if (!record?.verification_sid) {
      try {
        const reconcile = (await telnyxClient.messagingTollfree.verification.requests.list({
          phone_number: number,
          page: 1,
          page_size: 10,
        } as never)) as unknown as { data?: Array<{ id?: string; verificationStatus?: TfVerificationStatus }> };
        const existing = (reconcile.data || []).find((r) => r.id);
        if (existing?.id) {
          const mapped = INTERNAL_STATUS[existing.verificationStatus || "In Progress"];
          await upsertComplianceRecord(businessId, {
            status: mapped,
            twilio_status: existing.verificationStatus || "In Progress",
            verification_sid: existing.id,
          });
          return {
            status: mapped === "approved" ? "approved" : "pending",
            verificationSid: existing.id,
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

// Telnyx notifies by email; we also re-sync lazily (LOG_REFRESH_MS window) so
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
    const fetched = (await telnyxClient.messagingTollfree.verification.requests.retrieve(
      record.verification_sid
    )) as unknown as {
      id?: string;
      verificationStatus?: TfVerificationStatus;
      reason?: string;
    };
    const status = INTERNAL_STATUS[fetched.verificationStatus || "In Progress"] || "pending";
    const rejectionReason = fetched.verificationStatus === "Rejected" ? fetched.reason || "" : "";
    const rejectionReasons = rejectionReason ? [rejectionReason] : [];
    const patch: Partial<SmsComplianceRecord> = {
      status,
      twilio_status: fetched.verificationStatus || "In Progress",
      last_sync_at: new Date().toISOString(),
    };
    if (rejectionReason) patch.rejection_reason = rejectionReason;
    if (rejectionReasons.length > 0) patch.rejection_reasons = rejectionReasons;
    // Telnyx lets you resubmit freely while not Verified.
    patch.edit_allowed = fetched.verificationStatus !== "Verified";
    await upsertComplianceRecord(businessId, patch);
    return { ...record, ...patch };
  } catch (err) {
    // A 404 means the request was deleted server-side — stop polling it.
    const status = (err as { status?: number })?.status;
    if (status === 404) {
      await upsertComplianceRecord(businessId, { status: "error", last_error: "Verification request no longer exists" });
      return { ...record, status: "error" };
    }
    console.error(`[sms-compliance] status refresh failed for ${businessId}:`, err);
    return record;
  }
}

// Strips internal fields before anything is returned to the client.
export function publicComplianceView(record: SmsComplianceRecord | null) {
  if (!record) return null;
  return {
    status: record.status,
    // Legacy field name — carries the provider's verification status
    // (Telnyx since the Telnyx migration).
    twilio_status: record.twilio_status || null,
    provider_status: record.twilio_status || null,
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

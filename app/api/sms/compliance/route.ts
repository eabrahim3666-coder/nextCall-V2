import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { findBusinessByUserId } from "@/lib/business";
import {
  getComplianceRecord,
  refreshComplianceStatus,
  submitTollfreeVerification,
  publicComplianceView,
  TfvForm,
} from "@/lib/sms-compliance";

const OPT_IN_TYPES = ["VERBAL", "WEB_FORM", "PAPER_FORM", "VIA_TEXT", "MOBILE_QR_CODE", "IMPORT"];
const BUSINESS_TYPES = ["PRIVATE_PROFIT", "PUBLIC_PROFIT", "SOLE_PROPRIETOR", "NON_PROFIT", "GOVERNMENT"];
const REGISTRATION_AUTHORITIES = [
  "EIN", "CBN", "CRN", "PROVINCIAL_NUMBER", "VAT", "ACN", "ABN", "BRN", "SIREN",
  "SIRET", "NZBN", "USt-IdNr", "CIF", "NIF", "CNPJ", "UID", "NEQ", "OTHER",
];

const isValidUrl = (v: string) => {
  try {
    const url = new URL(v);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const isValidPhone = (v: string) => /^\+[1-9]\d{7,14}$/.test(v.replace(/[\s()-]/g, ""));

type FieldError = { field: string; message: string };

function validateForm(body: Record<string, unknown>): { form?: TfvForm; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");
  const arr = (k: string) => Array.isArray(body[k]) ? (body[k] as unknown[]).filter((x) => typeof x === "string" && x) as string[] : [];

  const form: TfvForm = {
    businessName: str("businessName"),
    doingBusinessAs: str("doingBusinessAs") || undefined,
    businessWebsite: str("businessWebsite"),
    businessType: str("businessType").toUpperCase(),
    registrationNumber: str("registrationNumber") || undefined,
    registrationAuthority: str("registrationAuthority").toUpperCase() || undefined,
    registrationCountry: str("registrationCountry").toUpperCase() || undefined,
    streetAddress: str("streetAddress"),
    city: str("city"),
    stateProvinceRegion: str("stateProvinceRegion"),
    postalCode: str("postalCode"),
    country: str("country").toUpperCase(),
    contactFirstName: str("contactFirstName"),
    contactLastName: str("contactLastName"),
    contactEmail: str("contactEmail"),
    contactPhone: str("contactPhone"),
    notificationEmail: str("notificationEmail"),
    useCaseCategories: arr("useCaseCategories"),
    useCaseSummary: str("useCaseSummary"),
    productionMessageSample: str("productionMessageSample"),
    optInType: str("optInType").toUpperCase(),
    optInImageUrls: arr("optInImageUrls"),
    messageVolume: str("messageVolume"),
    privacyPolicyUrl: str("privacyPolicyUrl"),
    termsAndConditionsUrl: str("termsAndConditionsUrl"),
    additionalInformation: str("additionalInformation") || undefined,
    editReason: str("editReason") || undefined,
  };

  const required = [
    ["businessName", "Business name"],
    ["businessWebsite", "Business website"],
    ["useCaseSummary", "What you text customers about"],
    ["productionMessageSample", "Sample message"],
    ["streetAddress", "Street address"],
    ["city", "City"],
    ["stateProvinceRegion", "State / Province"],
    ["postalCode", "ZIP / Postal code"],
    ["country", "Country"],
    ["contactFirstName", "Contact first name"],
    ["contactLastName", "Contact last name"],
    ["contactEmail", "Contact email"],
    ["contactPhone", "Contact phone"],
    ["notificationEmail", "Notification email"],
    ["privacyPolicyUrl", "Privacy Policy URL"],
    ["termsAndConditionsUrl", "Terms & Conditions URL"],
  ] as const;

  for (const [key, label] of required) {
    if (!form[key as keyof TfvForm]) errors.push({ field: key, message: `${label} is required.` });
  }

  if (form.businessWebsite && !isValidUrl(form.businessWebsite)) {
    errors.push({ field: "businessWebsite", message: "Enter a valid website URL (starting with http:// or https://)." });
  }
  if (form.privacyPolicyUrl && !isValidUrl(form.privacyPolicyUrl)) {
    errors.push({ field: "privacyPolicyUrl", message: "Enter a valid Privacy Policy URL." });
  }
  if (form.termsAndConditionsUrl && !isValidUrl(form.termsAndConditionsUrl)) {
    errors.push({ field: "termsAndConditionsUrl", message: "Enter a valid Terms & Conditions URL." });
  }
  if (!BUSINESS_TYPES.includes(form.businessType)) {
    errors.push({ field: "businessType", message: "Select the type that best describes your business." });
  }
  if (form.businessType && form.businessType !== "SOLE_PROPRIETOR") {
    if (!form.registrationNumber) errors.push({ field: "registrationNumber", message: "Business registration number is required for this business type." });
    if (!form.registrationAuthority || !REGISTRATION_AUTHORITIES.includes(form.registrationAuthority)) errors.push({ field: "registrationAuthority", message: "Select the registration authority." });
    if (!form.registrationCountry) errors.push({ field: "registrationCountry", message: "Registration country is required." });
  }
  if (!form.contactEmail || !isValidEmail(form.contactEmail)) errors.push({ field: "contactEmail", message: "Enter a valid contact email." });
  if (!form.notificationEmail || !isValidEmail(form.notificationEmail)) errors.push({ field: "notificationEmail", message: "Enter a valid notification email." });
  if (!form.contactPhone || !isValidPhone(form.contactPhone)) errors.push({ field: "contactPhone", message: "Enter a valid phone number with country code, e.g. +12125550123." });
  if (form.useCaseCategories.length === 0) errors.push({ field: "useCaseCategories", message: "Select at least one way you text customers." });
  if (form.useCaseSummary.length < 20) errors.push({ field: "useCaseSummary", message: "Give us 2–3 sentences so reviewers understand how you text customers (min 20 characters)." });
  if (form.productionMessageSample.length < 10) errors.push({ field: "productionMessageSample", message: "Paste a realistic example of a message you send." });
  if (!OPT_IN_TYPES.includes(form.optInType)) errors.push({ field: "optInType", message: "Select how your customers agree to receive texts." });
  if (form.optInImageUrls.length === 0 || form.optInImageUrls.some((u) => !isValidUrl(u))) {
    errors.push({ field: "optInImageUrls", message: "Provide a public URL showing how customers opt in (e.g. a screenshot hosted on Google Drive)." });
  }
  if (!form.messageVolume) errors.push({ field: "messageVolume", message: "Estimate how many texts you send per month." });

  return { form, errors };
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const business = await findBusinessByUserId(userId);
    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const record = await refreshComplianceStatus(business);
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress || "";

    return NextResponse.json({
      compliance: publicComplianceView(record),
      prefill: {
        businessName: business.business_name || "",
        businessType: "",
        doingBusinessAs: business.business_name || "",
        serviceArea: business.service_area || "",
        ownerPhone: business.owner_phone || "",
        notificationEmail: userEmail,
        contactEmail: userEmail,
        contactFirstName: user?.firstName || "",
        contactLastName: user?.lastName || "",
        country: "US",
        tollfreeNumber: record?.sms_tollfree_number || business.twilio_number || null,
        suggestedUseCaseSummary:
          `We use an AI receptionist over text: booking and reminding customers about appointments, replying to their questions, following up after missed calls, and asking for reviews after completed work.`,
        suggestedSampleMessage:
          `Reminder: You have an appointment with ${business.business_name || "us"} at 2:30 PM today. Reply 1 to confirm, 2 to reschedule, or 3 to cancel.`,
      },
    });
  } catch (error) {
    console.error("[sms/compliance] GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const business = await findBusinessByUserId(userId);
    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { form, errors } = validateForm(body);
    if (errors.length > 0) {
      return NextResponse.json({ error: "Please fix the highlighted fields.", fields: errors }, { status: 400 });
    }

    const result = await submitTollfreeVerification(business, form as TfvForm);

    if (result.status === "error") {
      return NextResponse.json({ error: result.message, status: result.status }, { status: 502 });
    }
    if (result.status === "pending") {
      return NextResponse.json({
        status: "pending",
        message: result.message || "Verification submitted! Twilio typically reviews in 2–3 business days.",
      });
    }
    return NextResponse.json({ status: "approved", message: "Your SMS is already verified and active." });
  } catch (error) {
    console.error("[sms/compliance] POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
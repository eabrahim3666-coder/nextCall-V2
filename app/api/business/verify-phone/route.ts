import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import twilioClient from "@/lib/twilio";
import { businessesCollection } from "@/lib/astra";
import crypto from "crypto";

interface OtpData {
    phone: string;
    code: string;
    expires: number;
    lastSent: number;
    sendCount: number;
    verifyAttempts: number;
}

const MAX_SENDS = 4;
const WARNING_SENDS = 3;
const COOLDOWN_MS = 60_000;
const EXPIRY_MS = 5 * 60_000;
const RESET_MS = 30 * 60_000;

function normalizePhone(phone: string) {
    return String(phone || "").replace(/[^\d+]/g, "");
}

export async function POST(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { phone, code, action } = body;
        const normalizedPhone = normalizePhone(phone);
        const business = await businessesCollection.findOne({ business_id: userId });
        const existingVerification = business?.pending_phone_verification as OtpData | undefined;

        if (action === "send") {
            if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
                return NextResponse.json({ error: "Use a valid international phone number" }, { status: 400 });
            }

            let data: OtpData =
                !existingVerification || existingVerification.phone !== normalizedPhone
                    ? {
                        phone: normalizedPhone,
                        code: "",
                        expires: 0,
                        lastSent: 0,
                        sendCount: 0,
                        verifyAttempts: 0,
                    }
                    : existingVerification;

            if (data.lastSent && Date.now() - data.lastSent > RESET_MS) {
                data = {
                    ...data,
                    phone: normalizedPhone,
                    sendCount: 0,
                    verifyAttempts: 0,
                };
            }

            if (data.sendCount >= MAX_SENDS) {
                return NextResponse.json({
                    error: "Too many attempts. This number is temporarily locked. Try again in 30 minutes.",
                    banned: true,
                }, { status: 429 });
            }

            if (data.lastSent && Date.now() - data.lastSent < COOLDOWN_MS) {
                const waitSeconds = Math.ceil((COOLDOWN_MS - (Date.now() - data.lastSent)) / 1000);
                return NextResponse.json({
                    error: `Please wait ${waitSeconds}s before resending`,
                    cooldown: waitSeconds,
                }, { status: 429 });
            }

            const otp = crypto.randomInt(100000, 1000000).toString();

            if (process.env.NODE_ENV !== "development" && !process.env.TWILIO_PHONE_NUMBER) {
                return NextResponse.json({ error: "Phone verification is not configured" }, { status: 503 });
            }

            if (process.env.NODE_ENV !== "development") {
                await twilioClient.messages.create({
                    body: `Your nextCall code is: ${otp}. It expires in 5 minutes.`,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: normalizedPhone,
                });
            }

            const verificationPayload: OtpData = {
                phone: normalizedPhone,
                code: otp,
                expires: Date.now() + EXPIRY_MS,
                lastSent: Date.now(),
                sendCount: data.sendCount + 1,
                verifyAttempts: 0,
            };

            await businessesCollection.updateOne(
                { business_id: userId },
                {
                    $set: {
                        pending_phone_verification: verificationPayload,
                        updated_at: new Date().toISOString(),
                    }
                },
                { upsert: true }
            );

            const response: Record<string, string | number | boolean> = { success: true };
            if (process.env.NODE_ENV === "development") {
                response.dev_otp = otp;
            }

            if (verificationPayload.sendCount >= WARNING_SENDS) {
                response.warning = "This is your last resend attempt. One more will lock this number for 30 minutes.";
            }

            response.sends_remaining = MAX_SENDS - verificationPayload.sendCount;
            return NextResponse.json(response);
        }

        if (action === "verify") {
            if (!existingVerification || existingVerification.phone !== normalizedPhone) {
                return NextResponse.json({ success: false, verified: false, error: "No code found. Request a new one." }, { status: 400 });
            }

            if (Date.now() > existingVerification.expires) {
                await businessesCollection.updateOne(
                    { business_id: userId },
                    { $unset: { pending_phone_verification: "" } }
                );
                return NextResponse.json({ success: false, verified: false, error: "Code expired. Request a new one." }, { status: 400 });
            }

            if (existingVerification.verifyAttempts >= 5) {
                await businessesCollection.updateOne(
                    { business_id: userId },
                    { $unset: { pending_phone_verification: "" } }
                );
                return NextResponse.json({ success: false, verified: false, error: "Too many wrong attempts. Request a new code." }, { status: 400 });
            }

            if (existingVerification.code === code) {
                await businessesCollection.updateOne(
                    { business_id: userId },
                    {
                        $set: {
                            owner_phone: normalizedPhone,
                            phone: normalizedPhone,
                            phone_verified_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        },
                        $unset: { pending_phone_verification: "" }
                    }
                );
                return NextResponse.json({ success: true, verified: true });
            }

            const updatedVerification = {
                ...existingVerification,
                verifyAttempts: existingVerification.verifyAttempts + 1,
            };

            await businessesCollection.updateOne(
                { business_id: userId },
                { $set: { pending_phone_verification: updatedVerification } }
            );

            const remaining = 5 - updatedVerification.verifyAttempts;
            return NextResponse.json({
                success: false,
                verified: false,
                error: `Invalid code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
            }, { status: 400 });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Verify error:", error);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

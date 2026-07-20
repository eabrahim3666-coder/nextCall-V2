import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { businessesCollection } from "@/lib/astra";

function generateReferralCode(businessName: string) {
    const prefix = (businessName || "BIZ").replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${suffix}`;
}

export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const business = await businessesCollection.findOne({ business_id: userId });
        if (!business) {
            return NextResponse.json({ error: "Business not found" }, { status: 404 });
        }

        const biz = business as Record<string, unknown>;
        if (biz.referral_code) {
            return NextResponse.json({ referral_code: biz.referral_code });
        }

        const code = generateReferralCode((biz.business_name as string) || "BIZ");
        await businessesCollection.updateOne(
            { business_id: userId },
            { $set: { referral_code: code } }
        );

        return NextResponse.json({ referral_code: code });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

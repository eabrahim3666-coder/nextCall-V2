import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { businessesCollection } from "@/lib/astra";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { title, description } = await req.json();
        if (!title?.trim() || !description?.trim()) {
            return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
        }

        const business = await businessesCollection.findOne({ clerk_user_id: userId });

        const featureRequest = {
            title: title.trim(),
            description: description.trim(),
            submitted_at: new Date().toISOString(),
            clerk_user_id: userId,
            business_name: (business as Record<string, unknown>)?.business_name || "Unknown",
        };

        await businessesCollection.updateOne(
            { clerk_user_id: userId },
            { $push: { feature_requests: featureRequest } as unknown as Record<string, unknown> }
        );

        try {
            const { Resend } = await import("resend");
            const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
            if (resend) {
                const supportEmail = process.env.SUPPORT_EMAIL || "support@getnextcall.com";
                await resend.emails.send({
                    from: "NextCall <support@getnextcall.com>",
                    to: [supportEmail],
                    subject: `Feature Request: ${featureRequest.title}`,
                    html: `<div style="background:#0a0a0a;padding:32px;border-radius:16px;font-family:Inter,sans-serif;color:#fff;max-width:500px;">
                        <h2 style="margin:0 0 16px;font-size:18px;color:#818cf8;">New Feature Request</h2>
                        <p style="margin:0 0 8px;color:#a3a3a3;font-size:14px;"><strong style="color:#fff;">Business:</strong> ${featureRequest.business_name}</p>
                        <p style="margin:0 0 8px;color:#a3a3a3;font-size:14px;"><strong style="color:#fff;">User:</strong> ${userId}</p>
                        <p style="margin:0 0 16px;color:#a3a3a3;font-size:14px;"><strong style="color:#fff;">Feature:</strong> ${featureRequest.title}</p>
                        <p style="margin:0;color:#a3a3a3;font-size:14px;white-space:pre-wrap;">${featureRequest.description}</p>
                    </div>`,
                });
            }
        } catch {
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Feature request error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

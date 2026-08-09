import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { callsCollection, businessesCollection } from "@/lib/astra";
import { sendReviewSms, recordCompletedJob, asCallLike } from "@/lib/review-sms";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { call_id, action } = await request.json();
        if (!call_id || !["done", "no_show"].includes(action)) {
            return NextResponse.json({ error: "call_id and action (done | no_show) required" }, { status: 400 });
        }

        const call = await callsCollection.findOne({ call_id, business_id: userId });
        if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });

        const business = await businessesCollection.findOne({ business_id: userId });
        if (!business || (business.plan_type || "standard") === "trial") {
            return NextResponse.json({ error: "Available on paid plans" }, { status: 403 });
        }

        if (action === "no_show") {
            await callsCollection.updateOne(
                { call_id, business_id: userId },
                { $set: { job_status: "no_show", job_done_at: new Date().toISOString() } }
            );
            return NextResponse.json({ success: true, job_status: "no_show" });
        }

        const existing = await callsCollection.findOne({ call_id, business_id: userId, job_status: { $in: ["done", "auto_done"] } });
        if (existing) return NextResponse.json({ error: "Job already marked done" }, { status: 409 });

        await callsCollection.updateOne(
            { call_id, business_id: userId },
            { $set: { job_status: "done", job_done_at: new Date().toISOString() } }
        );

        // Notify the AI agent's context — completed jobs are stored on the business
        await recordCompletedJob(asCallLike(call));

        const smsSent = await sendReviewSms(asCallLike(call));
        if (smsSent) {
            await callsCollection.updateOne(
                { call_id, business_id: userId },
                { $set: { review_status: "link_sent", review_sms_sent_at: new Date().toISOString() } }
            );
        }

        return NextResponse.json({ success: true, job_status: "done", review_sms_sent: smsSent });
    } catch (error) {
        console.error("Mark job error:", error);
        return NextResponse.json({ error: "Failed to mark job" }, { status: 500 });
    }
}

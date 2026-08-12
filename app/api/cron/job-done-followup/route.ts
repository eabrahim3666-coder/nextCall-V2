import { NextResponse } from "next/server";
import { callsCollection, businessesCollection } from "@/lib/astra";
import { hasValidSecret } from "@/lib/security";
import { sendReviewRequest, recordCompletedJob, asCallLike } from "@/lib/review-sms";

const FOLLOWUP_HOURS = 24;

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (!hasValidSecret(authHeader, process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const cutoff = new Date(Date.now() - FOLLOWUP_HOURS * 60 * 60 * 1000).toISOString();

        const candidates = await callsCollection.find({
            appointment_booked: true,
            appointment_date_time: { $lte: cutoff },
            job_status: { $in: [null, "pending"] },
            customer_phone: { $nin: [null, ""] },
        }).limit(100).toArray();

        if (candidates.length === 0) {
            return NextResponse.json({ message: "No jobs pending follow-up." });
        }

        let sent = 0;

        for (const call of candidates) {
            try {
                const business = await businessesCollection.findOne({ business_id: call.business_id });
                if (!business) continue;
                if ((business.plan_type || "standard") === "trial") continue;
                if (business.routing_rules?.review_followup === false) continue;
                if (call.review_sms_sent_at || call.review_status === "link_sent") continue;

                const smsSent = await sendReviewRequest(asCallLike(call));
                if (smsSent) {
                    await callsCollection.updateOne(
                        { call_id: call.call_id },
                        {
                            $set: {
                                job_status: "auto_done",
                                job_done_at: new Date().toISOString(),
                                review_status: "link_sent",
                                review_sms_sent_at: new Date().toISOString(),
                            },
                        }
                    );
                    await recordCompletedJob(asCallLike(call));
                    sent++;
                }
            } catch (callError) {
                console.error(`[job-done-followup] failed for call ${call.call_id}:`, callError);
            }
        }

        return NextResponse.json({ success: true, followupsSent: sent });
    } catch (error) {
        console.error("Job done followup cron error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

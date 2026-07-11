import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { businessesCollection } from "@/lib/astra";
import { findBusinessByUserId } from "@/lib/business";

function paddleApiBase() {
    return process.env.PADDLE_API_KEY?.startsWith("pdl_sdbx_")
        ? "https://sandbox-api.paddle.com"
        : "https://api.paddle.com";
}

async function verifyPaidTransaction(transactionId: string, userId: string) {
    if (!process.env.PADDLE_API_KEY) return null;

    const response = await fetch(
        `${paddleApiBase()}/transactions/${encodeURIComponent(transactionId)}`,
        {
            headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY}` },
            cache: "no-store",
        },
    );

    if (!response.ok) return null;

    const result = await response.json();
    const transaction = result.data;
    const customData = transaction?.custom_data || {};

    // Never activate a business from an untrusted redirect alone.
    if (customData.clerk_user_id !== userId || transaction.status !== "completed") {
        return null;
    }

    return transaction;
}

function getPlanLimits(plan: string) {
    if (plan === "premium") {
        return { minutes_limit: 500, overage_rate: 0.40 };
    }

    if (plan === "trial") {
        return { minutes_limit: 50, overage_rate: 0 };
    }

    return { minutes_limit: 200, overage_rate: 0.50 };
}

export async function GET(request: Request) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let business = await findBusinessByUserId(userId);

    if (business?.status !== "active") {
        const transactionId = new URL(request.url).searchParams.get("transaction_id");
        if (transactionId) {
            try {
                const transaction = await verifyPaidTransaction(transactionId, userId);
                if (transaction) {
                    const customData = transaction.custom_data || {};
                    const plan = customData.plan || business?.plan_type || business?.plan || "standard";
                    const limits = getPlanLimits(plan);
                    const businessName = customData.business_name || business?.business_name || "New Business";

                    await businessesCollection.updateOne(
                        { business_id: userId },
                        {
                            $set: {
                                business_id: userId,
                                business_name: businessName,
                                status: "active",
                                plan_type: plan,
                                paddle_transaction_id: transaction.id,
                                paddle_subscription_id: transaction.subscription_id,
                                paddle_customer_id: transaction.customer_id,
                                ...limits,
                                updated_at: new Date().toISOString(),
                            },
                            $setOnInsert: {
                                created_at: new Date().toISOString(),
                                total_calls_processed: 0,
                                total_minutes_used: 0,
                                twilio_subaccount_sid: "PROVISIONING_FAILED",
                                twilio_number: "PROVISIONING_FAILED",
                                twilio_numbers: ["PROVISIONING_FAILED"],
                            },
                        },
                        { upsert: true },
                    );
                    business = await findBusinessByUserId(userId);
                }
            } catch (error) {
                console.error("Paddle transaction verification failed:", error);
            }
        }
    }

    return NextResponse.json({ status: business?.status || "pending" });
}

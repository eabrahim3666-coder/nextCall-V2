import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { findBusinessByUserId } from "@/lib/business";

export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const business = await findBusinessByUserId(userId);
        if (!business?.paddle_customer_id) {
            return NextResponse.json({ error: "No billing account found" }, { status: 404 });
        }

        const paddleApiBase = process.env.PADDLE_API_KEY?.startsWith("pdl_sdbx_")
            ? "https://sandbox-api.paddle.com"
            : "https://api.paddle.com";

        const response = await fetch(`${paddleApiBase}/customers/${business.paddle_customer_id}/portal-sessions`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                subscription_ids: business.paddle_subscription_id ? [business.paddle_subscription_id] : [],
            }),
        });

        const data = await response.json();

        if (data.data?.urls?.general?.overview) {
            return NextResponse.json({ url: data.data.urls.general.overview });
        }

        console.error("Paddle Portal Error:", data);
        throw new Error("Failed to generate Paddle portal link");
    } catch (error) {
        console.error("Billing Portal Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

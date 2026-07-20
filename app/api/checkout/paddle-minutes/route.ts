import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { businessesCollection } from '@/lib/astra';

const BATCH_SIZE = 50;

function getLimits(planType: string) {
    if (planType === 'premium') return { maxBatch: 500, priceEnv: 'NEXT_PUBLIC_PADDLE_PREMIUM_MINUTES_PRICE_ID' };
    return { maxBatch: 200, priceEnv: 'NEXT_PUBLIC_PADDLE_STANDARD_MINUTES_PRICE_ID' };
}

export async function POST(request: Request) {
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
        const planType = (biz.plan_type as string) || 'standard';
        const { maxBatch, priceEnv } = getLimits(planType);

        const priceId = process.env[priceEnv];
        if (!priceId) {
            return NextResponse.json({ error: "Minute packs not configured yet. Contact support." }, { status: 501 });
        }

        const body = await request.json();
        const requestedMinutes = parseInt(body.minutes, 10);
        if (!Number.isFinite(requestedMinutes) || requestedMinutes < BATCH_SIZE || requestedMinutes > maxBatch) {
            return NextResponse.json(
                { error: `Purchase between ${BATCH_SIZE} and ${maxBatch} minutes.` },
                { status: 400 }
            );
        }

        const quantity = Math.floor(requestedMinutes / BATCH_SIZE);

        const paddleApiBase = process.env.PADDLE_API_KEY?.startsWith('pdl_sdbx_')
            ? 'https://sandbox-api.paddle.com'
            : 'https://api.paddle.com';

        const response = await fetch(`${paddleApiBase}/transactions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: [{ price_id: priceId, quantity }],
                custom_data: {
                    clerk_user_id: userId,
                    purpose: 'additional_minutes',
                    minutes_added: quantity * BATCH_SIZE,
                }
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("Paddle API Error:", data.error);
            return NextResponse.json({ error: data.error || "Failed to create checkout" }, { status: 400 });
        }

        return NextResponse.json({ transactionId: data.data.id });
    } catch (error) {
        console.error("Minutes checkout error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

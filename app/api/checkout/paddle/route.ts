import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Security Fix: Map the requested plan to the secure environment variable priceId
    // This prevents users from passing a cheaper priceId to the backend
    const priceIdMap = {
      trial: process.env.NEXT_PUBLIC_PADDLE_TRIAL_PRICE_ID,
      standard: process.env.NEXT_PUBLIC_PADDLE_STANDARD_PRICE_ID,
      premium: process.env.NEXT_PUBLIC_PADDLE_PREMIUM_PRICE_ID
    };
    
    const securePriceId = priceIdMap[body.plan as 'trial' | 'standard' | 'premium'];

    if (!securePriceId) {
      return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
    }

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
        items: [{ price_id: securePriceId, quantity: 1 }],
        custom_data: {
          clerk_user_id: userId, // Security Fix: Use the secure server-side userId, not the client value
          business_name: body.business_name || "New Business",
          plan: body.plan,
          ...(body.ref ? { ref: body.ref } : {})
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Paddle API Error:", data.error);
      return NextResponse.json({ error: data.error || "Failed to create Paddle checkout" }, { status: 400 });
    }

    // Return the transaction ID — frontend opens this via Paddle.js overlay
    return NextResponse.json({ transactionId: data.data.id });

  } catch (error) {
    console.error("Checkout API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
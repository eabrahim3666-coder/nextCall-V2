import { NextResponse } from 'next/server';
import openai from '@/lib/openai';
import { auth } from '@clerk/nextjs/server';
import { businessesCollection } from '@/lib/astra';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const business = await businessesCollection.findOne({ business_id: userId });
    const name = business?.business_name || "Farjana Refrigeration";
    const type = business?.business_type || "refrigeration and AC parts store";
    const area = business?.service_area || "the local market";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You generate realistic Google reviews for a business. 
The review should sound like a real customer wrote it — include both positive and constructive feedback.
Keep it 2-4 sentences. Do not use markdown. Do not wrap in quotes.`
        },
        {
          role: "user",
          content: `Generate a Google review for ${name}, a ${type} in ${area}. The customer bought a product or service. Mention something specific they purchased, something they liked, and something that could be improved (e.g., wait time, service, pricing).`
        }
      ],
    });

    const reviewText = completion.choices[0].message.content || "";

    return NextResponse.json({ success: true, review: reviewText });
  } catch (error) {
    console.error("Error generating review text:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

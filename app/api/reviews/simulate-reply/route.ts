import { NextResponse } from 'next/server';
import openai from '@/lib/openai';
import { auth } from '@clerk/nextjs/server';
import { businessesCollection } from '@/lib/astra';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { review_text, review_stars } = await request.json();
    if (!review_text) return NextResponse.json({ error: "review_text is required" }, { status: 400 });

    const business = await businessesCollection.findOne({ business_id: userId });
    if (!business || (business.plan_type || 'standard') === 'trial') {
      return NextResponse.json({ error: "Available on paid plans" }, { status: 403 });
    }
    const name = business?.business_name || "Farjana Refrigeration";
    const type = business?.business_type || "business";
    const area = business?.service_area || "your area";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a review response assistant for ${name}, a ${type} in ${area}. 
Write a short, grateful reply to the customer's review. 
If the review is positive (4-5 stars), thank them warmly. 
If the review mentions any complaint, apologize briefly and mention you're working on it.
Keep it under 4 sentences. Do not use markdown.`
        },
        {
          role: "user",
          content: `Customer left a ${review_stars}-star review. Here is what they said: "${review_text}"`
        }
      ],
    });

    const aiReply = completion.choices[0].message.content || "";

    return NextResponse.json({ success: true, reply: aiReply });
  } catch (error) {
    console.error("Error generating simulate reply:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

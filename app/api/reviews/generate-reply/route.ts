import { NextResponse } from 'next/server';
import openai from '@/lib/openai';
import { businessesCollection } from '@/lib/astra';
import { hasValidSecret } from '@/lib/security';

export async function POST(request: Request) {
  try {
    // Secure endpoint: Require n8n API Key
    const apiKey = request.headers.get('x-api-key');
    if (!hasValidSecret(apiKey, process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { business_id, review_text, review_stars } = await request.json();

    // 1. Look up the business details to know the SEO keywords and name
    const business = await businessesCollection.findOne({ business_id: business_id });
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // 2. Prompt GPT-4o-mini to write the perfect SEO reply
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a review response assistant for ${business.business_name}, a ${business.business_type} in ${business.service_area}. 
          Your goal is to write a short, grateful reply to the customer's review. 
          CRITICAL RULE: You must naturally include the phrase "Best ${business.business_type} in ${business.service_area}" in the response if it makes sense, to boost local SEO. 
          If the review is negative, apologize and ask them to contact the office. Keep it under 3 sentences.`
        },
        {
          role: "user",
          content: `Customer left a ${review_stars}-star review. Here is what they said: "${review_text}"`
        }
      ],
    });

    const aiReply = completion.choices[0].message.content;

    // 3. Return the reply back to n8n so it can post it to Google
    return NextResponse.json({ 
      success: true, 
      reply: aiReply 
    });

  } catch (error) {
    console.error("Error generating AI review reply:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

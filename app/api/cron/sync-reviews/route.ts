import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { businessesCollection } from '@/lib/astra';
import openai from '@/lib/openai';
import { hasValidSecret } from '@/lib/security';

export async function GET(request: Request) {
  // 1. Verify Vercel Cron Secret to prevent unauthorized runs
  const authHeader = request.headers.get('authorization');
  if (!hasValidSecret(authHeader, process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  try {
    // 2. Find all businesses that have connected their Google Account
    const businesses = await businessesCollection.find({
      google_business_connected: true,
      google_refresh_token: { $exists: true }
    }).toArray();

    let totalRepliesPosted = 0;

    for (const business of businesses) {
      try {
        // Skip trial users — Google Reviews are a paid feature
        if ((business.plan_type || 'standard') === 'trial') continue;

        // 3. Refresh the Google Access Token using their refresh token
        oauth2Client.setCredentials({ refresh_token: business.google_refresh_token });
        const { token } = await oauth2Client.getAccessToken();
        if (!token) {
          console.error(`Could not get access token for ${business.business_name}`);
          continue; // Skip this business
        }
        
        const authHeaders = { Authorization: `Bearer ${token}` };

        // 4. Get the Business's Google Account ID
        const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', { headers: authHeaders });
        const accountsData = await accountsRes.json();
        
        if (!accountsData.accounts || accountsData.accounts.length === 0) continue;
        const accountName = accountsData.accounts[0].name; // e.g., accounts/123456

        // 5. Get the Business Location ID
        const locationsRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`, { headers: authHeaders });
        const locationsData = await locationsRes.json();
        
        if (!locationsData.locations || locationsData.locations.length === 0) continue;
        const locationName = locationsData.locations[0].name; // e.g., accounts/123456/locations/789

        // 6. Fetch Reviews for this Location
        const reviewsRes = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/reviews`, { headers: authHeaders });
        const reviewsData = await reviewsRes.json();

        if (!reviewsData.reviews) continue; // No reviews exist

        // 7. Filter for UNREPLIED reviews
        const unrepliedReviews = reviewsData.reviews.filter((r: { reviewReply?: unknown }) => !r.reviewReply);

        for (const review of unrepliedReviews) {
          // 8. Generate the AI Reply (Bringing your existing logic in-house)
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
                content: `Customer left a ${review.starRating}-star review. Here is what they said: "${review.comment}"`
              }
            ],
          });

          const aiReply = completion.choices[0].message.content;

          // 9. Post the AI Reply directly to Google Maps
          await fetch(`https://mybusiness.googleapis.com/v4/${review.name}/reply`, {
            method: 'PUT',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: aiReply })
          });

          totalRepliesPosted++;
        }

        // Update last sync timestamp in AstraDB
        await businessesCollection.updateOne(
          { _id: business._id },
          { $set: { last_review_sync: new Date().toISOString() } }
        );

      } catch (bizError) {
        console.error(`Error syncing reviews for ${business.business_name}:`, bizError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      businessesChecked: businesses.length,
      repliesPosted: totalRepliesPosted 
    });

  } catch (error) {
    console.error("Cron Job Fatal Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

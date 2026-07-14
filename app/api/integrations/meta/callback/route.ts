import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { businessesCollection } from '@/lib/astra';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const { userId } = await auth();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!userId) {
        return NextResponse.redirect(new URL('/dashboard/settings?focus=integrations&meta_error=auth_required', request.url));
    }

    if (!code || !state) {
        return NextResponse.redirect(new URL('/dashboard/settings?focus=integrations&meta_error=missing_params', request.url));
    }

    // Security Fix: Validate the secure state cookie to prevent CSRF attacks
    const cookieStore = await cookies();
    const savedState = cookieStore.get('oauth_state')?.value;

    if (!savedState || state !== savedState) {
        return NextResponse.redirect(new URL('/dashboard/settings?focus=integrations&meta_error=invalid_state', request.url));
    }

    // Clear the state cookie so it can't be reused
    cookieStore.delete('oauth_state');

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/meta/callback`;

    try {
        // 1. Exchange the code for a short-lived User Access Token
        const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`);
        const tokenData = await tokenRes.json();

        if (tokenData.error) {
            console.error("Meta Token Exchange Error:", tokenData.error);
            throw new Error(tokenData.error.message);
        }

        const shortLivedToken = tokenData.access_token;

        // 2. Exchange the short-lived token for a long-lived User Access Token (lasts 60 days)
        const longLivedRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`);
        const longLivedData = await longLivedRes.json();

        if (longLivedData.error) {
            console.error("Meta Long-Lived Token Error:", longLivedData.error);
            throw new Error(longLivedData.error.message);
        }

        const longLivedToken = longLivedData.access_token;

        // 3. Get the User's Pages (We need the Page Access Token to read/send messages)
        let pagesData: { data?: { id: string; name: string; access_token: string }[]; error?: { message: string } };
        const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`);
        pagesData = await pagesRes.json();

        // 4. If no personal pages, try fetching pages via Business Portfolio
        if (!pagesData.data || pagesData.data.length === 0) {
            console.log("No personal pages found. Trying Business Portfolio...");
            const bizRes = await fetch(`https://graph.facebook.com/v19.0/me/businesses?access_token=${longLivedToken}`);
            const bizData = await bizRes.json();

            if (bizData.data && bizData.data.length > 0) {
                for (const business of bizData.data) {
                    const ownedRes = await fetch(`https://graph.facebook.com/v19.0/${business.id}/owned_pages?access_token=${longLivedToken}&fields=id,name,access_token`);
                    const ownedData = await ownedRes.json();
                    if (ownedData.data && ownedData.data.length > 0) {
                        pagesData = { data: ownedData.data };
                        break;
                    }
                }
            }
        }

        if (pagesData.error) {
            console.error("Meta Pages Fetch Error:", pagesData.error);
            throw new Error(pagesData.error.message);
        }

        if (!pagesData.data || pagesData.data.length === 0) {
            return NextResponse.redirect(new URL('/dashboard/settings?focus=integrations&meta_error=no_pages', request.url));
        }

        // 5. Grab the first Page's token and ID (For V1, we assume they connect their primary page)
        const page = pagesData.data[0];
        const pageAccessToken = page.access_token;
        const pageId = page.id;
        const pageName = page.name || "Unknown Page";

        // 6. Get the Instagram Business Account linked to this Page (Optional but recommended for IG DMs)
        let igBusinessId = null;
        let igBusinessName = null;
        try {
            const igRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account{id,name}&access_token=${pageAccessToken}`);
            const igData = await igRes.json();
            if (igData.instagram_business_account) {
                igBusinessId = igData.instagram_business_account.id;
                igBusinessName = igData.instagram_business_account.name || null;
            }
        } catch {
            console.log("No IG account linked, skipping IG ID.");
        }

        // 6. Fetch the Page's profile picture
        let pagePicture = null;
        try {
            const picRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/picture?type=large&redirect=false&access_token=${pageAccessToken}`);
            const picData = await picRes.json();
            if (picData.data?.url) {
                pagePicture = picData.data.url;
            }
        } catch {
            console.log("Could not fetch page picture.");
        }

        // 7. Save to AstraDB (Force pageId to String to prevent DB type mismatch lookups)
        await businessesCollection.updateOne(
            { business_id: userId },
            {
                $set: {
                    meta_page_access_token: pageAccessToken,
                    meta_page_id: String(pageId),
                    meta_page_name: pageName,
                    meta_page_picture: pagePicture,
                    meta_ig_business_id: igBusinessId ? String(igBusinessId) : null,
                    meta_ig_business_name: igBusinessName,
                    updated_at: new Date().toISOString()
                }
            }
        );

        // 7. Redirect back to settings with success message
        return NextResponse.redirect(new URL('/dashboard/settings?focus=integrations&meta_success=true', request.url));

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Meta Callback Error:", message, error instanceof Error ? error.stack : "");
        console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        return NextResponse.redirect(new URL(`/dashboard/settings?focus=integrations&meta_error=${encodeURIComponent(message)}`, request.url));
    }
}

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const appId = process.env.META_APP_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/meta/callback`;

    const scopes = [
        'pages_show_list',
        'pages_messaging',
        'instagram_manage_messages',
        'pages_read_engagement',
        'business_management'
    ].join(',');

    // Security Fix: Generate a secure random nonce for CSRF protection
    const state = crypto.randomUUID();

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scopes}&state=${state}&response_type=code`;

    const response = NextResponse.redirect(authUrl);
    // Save the secure state in a short-lived, HTTP-only cookie
    response.cookies.set('oauth_state', state, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax', 
        path: '/', 
        maxAge: 600 // Expires in 10 minutes
    });
    
    return response;
}
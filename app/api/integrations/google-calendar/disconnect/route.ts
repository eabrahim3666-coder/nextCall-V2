import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { businessesCollection } from '@/lib/astra';

export async function POST() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await businessesCollection.updateOne(
        { business_id: userId },
        {
            $set: {
                google_refresh_token: null,
                google_account_email: null,
                google_business_connected: false,
                review_link: "",
                updated_at: new Date().toISOString()
            }
        }
    );

    return NextResponse.json({ success: true });
}

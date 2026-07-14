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
                meta_page_access_token: null,
                meta_page_id: null,
                meta_page_name: null,
                meta_page_picture: null,
                meta_ig_business_id: null,
                meta_ig_business_name: null,
                updated_at: new Date().toISOString()
            }
        }
    );

    return NextResponse.json({ success: true });
}

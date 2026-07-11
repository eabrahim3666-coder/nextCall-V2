import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { callsCollection } from '@/lib/astra';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

     const { call_id, is_flagged } = await request.json(); // Accept the exact boolean from the client
    
    // Update the call with the exact requested state to prevent double-click race conditions
    const result = await callsCollection.updateOne(
      { call_id: call_id, business_id: userId },
      { $set: { is_flagged: is_flagged } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, is_flagged: is_flagged });
} catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
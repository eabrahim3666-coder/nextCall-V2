import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { businessesCollection } from '@/lib/astra';
import { findBusinessByUserId } from '@/lib/business';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Knowledge base training is a paid feature
    const business = await findBusinessByUserId(userId);
    if (!business || (business.plan_type || 'standard') === 'trial') {
      return NextResponse.json({ error: "Available on paid plans" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('pdf') as File | null;
    const businessId = formData.get('business_id') as string;

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: "Missing file or business ID" }, { status: 400 });
    }

    if (file.type !== 'application/pdf' || file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Only PDF files up to 5MB are supported" }, { status: 413 });
    }

    if (businessId && businessId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. Extract text from PDF (Dynamic import + 'any' cast to bypass TS strictness)
    const pdfModule = await import('pdf-parse');
    const pdf = (pdfModule as any).default || pdfModule;
    const data = await pdf(buffer);
    const extractedText = data.text;
    if (typeof extractedText !== 'string' || extractedText.length > 100_000) {
      return NextResponse.json({ error: "The PDF contains too much text" }, { status: 413 });
    }

    // 3. Save to AstraDB
    await businessesCollection.updateOne(
      { business_id: userId },
      {
        $set: {
          knowledge_base_text: extractedText,
          updated_at: new Date().toISOString(),
        }
      }
    );

    console.log(`Knowledge base updated for business ${userId}`);

    return NextResponse.json({ success: true, textLength: extractedText.length });

  } catch (error) {
    console.error("Error parsing PDF:", error);
    return NextResponse.json({ error: "Failed to process PDF" }, { status: 500 });
  }
}

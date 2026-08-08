import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { businessesCollection } from '@/lib/astra';

export async function GET(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Not signed in" }, { status: 401 });
        }

        const touch = new URL(request.url).searchParams.get("fix") === "1";
        let writeResult: Record<string, unknown> | null = null;

        if (touch) {
            const doc = await businessesCollection.findOne({ _id: userId });
            if (doc) {
                await businessesCollection.updateOne(
                    { _id: userId },
                    {
                        $set: {
                            business_id: userId,
                            status: doc.status || "active",
                            plan_type: doc.plan_type || "premium",
                            plan: doc.plan || "premium",
                            updated_at: new Date().toISOString(),
                        },
                    }
                );
            }
            const after = await businessesCollection.findOne({ business_id: userId });
            writeResult = {
                doc_exists_by__id: Boolean(doc),
                business_id_match_after_write: Boolean(after),
                status: after?.status ?? null,
                plan: after?.plan_type || after?.plan || null,
            };
        }

        const user = await currentUser();
        const business = await businessesCollection.findOne({ business_id: userId });
        const byIdDoc = await businessesCollection.findOne({ _id: userId });
        let allDocs = [] as { _id: unknown; business_id?: unknown; status?: unknown }[];
        try {
            allDocs = (await businessesCollection.find({}).limit(10).toArray()).map(b => ({
                _id: String(b._id),
                business_id: b.business_id,
                status: b.status,
            }));
        } catch (e) {
            allDocs = [{ _id: `QUERY FAILED: ${(e as Error)?.message}`, business_id: undefined, status: undefined }];
        }
        const rawDoc = allDocs[0] ? await businessesCollection.findOne({}) : null;
        const encode = (s: unknown) => Buffer.from(String(s ?? "")).toString("base64");

        return NextResponse.json({
            astra_db_id: process.env.ASTRA_DB_ID,
            astra_keyspace: process.env.ASTRA_DB_KEYSPACE,
            your_user_id: userId,
            user_id_len: userId.length,
            user_id_b64: encode(userId),
            your_email: user?.emailAddresses?.[0]?.emailAddress || null,
            business_found: Boolean(business),
            business_status: business?.status ?? null,
            business_plan: business?.plan_type || business?.plan || null,
            found_by__id: Boolean(byIdDoc),
            doc_business_id_b64: rawDoc ? encode(rawDoc.business_id) : null,
            doc__id_b64: rawDoc ? encode(rawDoc._id) : null,
            docs_in_collection: allDocs.length,
            docs_sample: allDocs,
            fix_attempt: writeResult,
        });
    } catch (error) {
        console.error("Debug my-business error:", error);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}
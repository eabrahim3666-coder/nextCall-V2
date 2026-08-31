import { NextResponse } from "next/server";
import { conversationsCollection, getChatPhoto } from "@/lib/astra";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const adminId = await requireAdmin();
        if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const businessId = new URL(request.url).searchParams.get("business_id");
        if (!businessId) return NextResponse.json({ error: "business_id required" }, { status: 400 });

        const conv = await conversationsCollection.findOne({ business_id: businessId, kind: "support" });
        const messages = (Array.isArray(conv?.messages) ? conv.messages : []).map((m) => ({ ...(m as object) }));

        const withPhotos = await Promise.all(
            messages.map(async (m: Record<string, unknown>) => {
                const photoId = m.photoId;
                if (typeof photoId === "string") {
                    const photo = await getChatPhoto(photoId);
                    if (photo) m.photo = photo;
                }
                const { photoId: _pid, telegram_message_id: _tg, ...rest } = m as { photoId?: string; telegram_message_id?: number };
                void _pid; void _tg;
                return rest;
            })
        );

        // Mark thread as read when the admin opens it
        await conversationsCollection.updateOne(
            { business_id: businessId, kind: "support" },
            { $set: { read_by_admin_at: new Date().toISOString() } }
        );

        return NextResponse.json({ messages: withPhotos });
    } catch (error) {
        console.error("Admin chat messages error:", error);
        return NextResponse.json({ error: "Failed to load messages" }, { status: 502 });
    }
}
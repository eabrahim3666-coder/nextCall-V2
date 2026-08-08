import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { conversationsCollection, getChatPhoto } from "@/lib/astra";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const conv = await conversationsCollection.findOne({ business_id: userId, kind: "support" });
        const messages = (Array.isArray(conv?.messages) ? conv.messages : []).map((m) => ({ ...(m as object) }));

        const withPhotos = await Promise.all(
            messages.map(async (m: Record<string, unknown>) => {
                const photoId = m.photoId;
                if (typeof photoId === "string") {
                    const photo = await getChatPhoto(photoId);
                    if (photo) m.photo = photo;
                }
                return m;
            })
        );

        return NextResponse.json({ messages: withPhotos });
    } catch (error) {
        console.error("Chat history error:", error);
        return NextResponse.json({ messages: [] });
    }
}
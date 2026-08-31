import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { businessesCollection, conversationsCollection, saveChatPhoto } from "@/lib/astra";
import { notifyAdminChat } from "@/lib/notify-admin";

export const dynamic = "force-dynamic";

export type ChatMessage = {
    id: string;
    role: "user" | "owner";
    content: string;
    at: string;
    photo?: string;
    photoId?: string;
    sender?: "business" | "admin";
    telegram_message_id?: number;
};

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const content = String(body.message || "").trim();
        const photo = typeof body.photo === "string" && body.photo.startsWith("data:image/") ? body.photo : null;

        if ((!content && !photo) || content.length > 2000) {
            return NextResponse.json({ error: "Invalid message" }, { status: 400 });
        }
        if (photo && photo.length > 2_500_000) {
            return NextResponse.json({ error: "Photo too large (max ~2MB)" }, { status: 400 });
        }

        const business = await businessesCollection.findOne({ business_id: userId });
        if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

        const message: ChatMessage = {
            id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            role: "user",
            sender: "business",
            content: content || "📷 Photo",
            at: new Date().toISOString(),
        };
        const photoForReply = photo;
        if (photo) {
            message.photoId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const saved = await saveChatPhoto(message.photoId, photo);
            if (!saved) return NextResponse.json({ error: "Failed to store photo. Try again." }, { status: 500 });
        }

        const filter = { business_id: userId, kind: "support" };
        const conv = await conversationsCollection.findOne(filter);
        const existing = Array.isArray(conv?.messages) ? conv.messages : [];
        const messages = [...existing.slice(-99), message];

        await conversationsCollection.updateOne(
            filter,
            {
                $set: {
                    business_id: userId,
                    kind: "support",
                    messages,
                    last_activity: message.at,
                    // New business message = unread for the admin
                    read_by_admin_at: null,
                    // The business is actively chatting right now
                    read_by_business_at: new Date().toISOString(),
                },
            },
            { upsert: true }
        );

        // Notify the admin (admin panel realtime + Telegram pinger, pluggable)
        const senderName = String(business.owner_name || business.business_name || business.owner_email || "Dashboard user").trim();
        const businessName = String(business.business_name || "Your business");
        const adminPing = await notifyAdminChat({
            businessName,
            senderName,
            content: content || "📷 Photo",
            hasPhoto: Boolean(photo),
        });
        if (!adminPing.ok) {
            console.error("Admin Telegram ping failed for chat message:", adminPing.error);
        }
        const { notifyChatAdmins } = await import("@/lib/pusher");
        await notifyChatAdmins({
            message: photoForReply ? { ...message, photo: photoForReply } : message,
            business_name: businessName,
            sender_name: senderName,
            business_id: userId,
        }).catch((e) => console.error("Admin realtime push failed for chat message:", e));

        return NextResponse.json({ ok: true, message: photoForReply ? { ...message, photo: photoForReply } : message });
    } catch (error) {
        console.error("Chat send error:", error);
        return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
    }
}
import { NextResponse } from "next/server";
import { conversationsCollection, businessesCollection } from "@/lib/astra";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const adminId = await requireAdmin();
        if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const convs = await conversationsCollection
            .find({ kind: "support" })
            .sort({ last_activity: -1 })
            .limit(100)
            .toArray();

        const list = await Promise.all(
            convs.map(async (conv) => {
                const messages = Array.isArray(conv.messages) ? conv.messages : [];
                const last = messages[messages.length - 1];
                const readAt = typeof conv.read_by_admin_at === "string" ? conv.read_by_admin_at : null;
                const unread = readAt
                    ? messages.filter((m) => {
                          const mAt = typeof m.at === "string" ? m.at : "";
                          return (m.sender !== "admin") && mAt > readAt;
                      }).length
                    : messages.filter((m) => (m.sender !== "admin")).length;

                return {
                    business_id: conv.business_id,
                    last_message: last?.content ? String(last.content) : "", 
                    last_from: last?.sender === "admin" ? "you" : "business",
                    last_at: last?.at || conv.last_activity || null,
                    unread: unread || 0,
                };
            })
        );

        const withNames = await Promise.all(
            list.map(async (c) => {
                if (c.business_id) {
                    const b = await businessesCollection.findOne({ business_id: c.business_id });
                    return {
                        ...c,
                        business_name: String(b?.business_name || "Unnamed business"),
                        owner_name: String(b?.owner_name || ""),
                        plan: String(b?.plan_type || b?.plan || "standard"),
                    };
                }
                return { ...c, business_name: "Unknown", owner_name: "", plan: "" };
            })
        );

        return NextResponse.json({ conversations: withNames });
    } catch (error) {
        console.error("Admin chat list error:", error);
        return NextResponse.json({ conversations: [] });
    }
}
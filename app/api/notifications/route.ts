import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { notificationsCollection } from "@/lib/astra";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const notifications = await notificationsCollection
      .find({ business_id: userId })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();

    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    // Mark all as read
    if (body.action === "mark_all_read") {
      await notificationsCollection.updateMany(
        { business_id: userId, read: false },
        { $set: { read: true } }
      );
      return NextResponse.json({ success: true });
    }

    // Mark single as read
    if (body.action === "mark_read" && body.notification_id) {
      await notificationsCollection.updateOne(
        { business_id: userId, _id: body.notification_id },
        { $set: { read: true } }
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.notification_id) {
      return NextResponse.json({ error: "Missing notification_id" }, { status: 400 });
    }

    await notificationsCollection.deleteOne({
      business_id: userId,
      _id: body.notification_id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications DELETE error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
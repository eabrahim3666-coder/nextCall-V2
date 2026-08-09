import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import Pusher from "pusher";
import { findBusinessByUserId } from "@/lib/business";

function getPusher(): Pusher | null {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET || !process.env.PUSHER_CLUSTER) {
    return null;
  }
  return new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true,
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pusher = getPusher();
  if (!pusher) return NextResponse.json({ error: "Realtime not configured" }, { status: 503 });

  const form = await request.formData();
  const socketId = String(form.get("socket_id") || "");
  const channelName = String(form.get("channel_name") || "");

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
  }

  if (channelName === "private-admin-chat") {
    const user = await currentUser();
    const isAdminByRole = user?.publicMetadata?.role === "admin" || user?.privateMetadata?.role === "admin";
    const bossEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
    const currentEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
    if (!isAdminByRole && !bossEmails.includes(currentEmail || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const adminAuth = pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(adminAuth);
  }

  const expectedChannel = `private-business-${userId}`;
  if (channelName !== expectedChannel) {
    return NextResponse.json({ error: "Forbidden channel" }, { status: 403 });
  }

  const business = await findBusinessByUserId(userId);
  if (!business) return NextResponse.json({ error: "No business" }, { status: 403 });

  const authResponse = pusher.authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}

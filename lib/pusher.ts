import Pusher from "pusher";

export interface Activity {
  type: string;
  title: string;
  icon: string;
  status: "pending" | "success" | "error" | "info";
  message?: string;
  /** What the AI status header should say while this runs (e.g. "Answering Call"). */
  agent_state?: string;
  /** Optional dashboard route the activity links to. */
  href?: string;
  created_at: string;
}

let pusherInstance: Pusher | null = null;

function getPusher(): Pusher | null {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET || !process.env.PUSHER_CLUSTER) {
    return null;
  }
  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return pusherInstance;
}

/**
 * Push a live activity toast to the business owner's dashboard.
 * Safe to call anywhere on the server — never throws and never
 * blocks business logic if Pusher is misconfigured or down.
 */
export async function notifyActivity(
  businessId: string,
  activity: Omit<Activity, "created_at">
): Promise<void> {
  const pusher = getPusher();
  if (!pusher) {
    console.log(`[activity] Pusher not configured, skipping (${businessId}):`, activity.title);
    return;
  }
  try {
    await pusher.trigger(`private-business-${businessId}`, "activity:new", {
      ...activity,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[activity] Failed to push activity to ${businessId}:`, error);
  }
}

/**
 * Push a new chat message to the business owner's dashboard.
 * Never throws and never blocks business logic if Pusher is down.
 */
export async function notifyChat(
  businessId: string,
  message: Record<string, unknown>
): Promise<void> {
  const pusher = getPusher();
  if (!pusher) {
    console.log(`[chat] Pusher not configured, skipping (${businessId})`);
    return;
  }
  try {
    await pusher.trigger(`private-business-${businessId}`, "chat:new", message);
  } catch (error) {
    console.error(`[chat] Failed to push message to ${businessId}:`, error);
  }
}

/**
 * Push a realtime event to the admin support-chat panel.
 * Safe to call anywhere on the server — never throws.
 */
export async function notifyChatAdmins(payload: Record<string, unknown>): Promise<void> {
  const pusher = getPusher();
  if (!pusher) {
    console.log("[chat] Pusher not configured, skipping admin push");
    return;
  }
  try {
    await pusher.trigger("private-admin-chat", "chat:new", payload);
  } catch (error) {
    console.error("[chat] Failed to push message to admin panel:", error);
  }
}

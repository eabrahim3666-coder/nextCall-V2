import Pusher from "pusher-js";

let pusherClient: Pusher | null = null;

/**
 * Singleton Pusher client for the dashboard.
 * Returns null (no realtime) when NEXT_PUBLIC_PUSHER_KEY/CLUSTER are not set.
 */
export function getPusherClient(): Pusher | null {
  if (typeof window === "undefined") return null;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;
  if (pusherClient) return pusherClient;
  pusherClient = new Pusher(key, {
    cluster,
    forceTLS: true,
    channelAuthorization: {
      endpoint: "/api/pusher/auth",
      transport: "ajax",
    },
  });
  return pusherClient;
}

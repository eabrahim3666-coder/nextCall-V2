import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 1. Define which routes are public (don't require login)
const isPublicRoute = createRouteMatcher([
  "/", 
  "/privacy",           // Public legal page
  "/terms",             // Public legal page
  "/pricing-policy",    // Public pricing policy page (Required for Paddle)
  "/api/webhooks/(.*)", // Retell, Stripe, and Twilio webhooks must be public!
  "/api/cron/(.*)",     // Cron jobs need to be public so Vercel/curl can trigger them!
  "/api/test/(.*)",     // Test routes
  "/api/reviews/(.*)",  // n8n & Google hit these routes without auth cookies!
  "/api/pusher/(.*)",   // Pusher channel auth (route validates Clerk session itself)
  "/api/contact",
]);

// 2. Use Clerk Middleware (Exported as default for proxy.ts)
export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

// 3. Keep the same matcher config
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
  "/api/contact",
]);

// 2. Define admin routes (Matches both /admin and /admin/anything)
const isAdminRoute = createRouteMatcher(["/admin", "/admin/(.*)"]);


// 3. Use Clerk Middleware (Exported as default for proxy.ts)
export default clerkMiddleware(async (auth, request) => {
  // If the route is NOT public, force the user to log in
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Protect Admin routes
  if (isAdminRoute(request)) {
    const { sessionClaims } = await auth();
    const claims = sessionClaims as {
      metadata?: { role?: string };
      publicMetadata?: { role?: string };
      email?: string;
    } | null;
    
    // Check both metadata and publicMetadata to be safe across Clerk versions
    const isAdmin = claims?.metadata?.role === "admin" || claims?.publicMetadata?.role === "admin";
    
    // SECURE BOSS BYPASS: Check against ADMIN_EMAILS environment variable
    const bossEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim().toLowerCase()) || [];
    const currentEmail = claims?.email?.toLowerCase();
    const isBoss = bossEmails.includes(currentEmail || "");

    // If they are not an admin, kick them back to the main dashboard
    if (!isAdmin && !isBoss) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }
});

// 4. Keep the same matcher config
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};

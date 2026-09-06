import { auth, currentUser } from "@clerk/nextjs/server";

export async function requireAdmin(): Promise<string | null> {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await currentUser();

    // Only backend-controlled signals grant admin: privateMetadata (set via
    // the Clerk backend API) or the ADMIN_EMAILS allowlist. publicMetadata is
    // client-readable and potentially client-updatable, so it is never a
    // trust anchor.
    const isAdminByRole = user?.privateMetadata?.role === "admin";
    if (isAdminByRole) return userId;

    const bossEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
    const currentEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
    return bossEmails.includes(currentEmail || "") ? userId : null;
}
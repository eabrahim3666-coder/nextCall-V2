import { auth, currentUser } from "@clerk/nextjs/server";

export async function requireAdmin(): Promise<string | null> {
    const { userId } = await auth();
    if (!userId) return null;

    const user = await currentUser();
    const isAdminByRole = user?.publicMetadata?.role === "admin" || user?.privateMetadata?.role === "admin";
    if (isAdminByRole) return userId;

    const bossEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
    const currentEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
    return bossEmails.includes(currentEmail || "") ? userId : null;
}
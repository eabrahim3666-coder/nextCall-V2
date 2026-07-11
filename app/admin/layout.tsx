import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const { userId } = await auth();
    if (!userId) redirect("/");

    const user = await currentUser();

    // Check both public and private metadata
    const isAdmin = user?.publicMetadata?.role === "admin" || user?.privateMetadata?.role === "admin";

    // SECURE BOSS BYPASS: Check against ADMIN_EMAILS environment variable
    const bossEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim().toLowerCase()) || [];
    const currentEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
    const isBoss = bossEmails.includes(currentEmail || "");

    // If they are not an admin, kick them out
    if (!isAdmin && !isBoss) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-[#050505] grain">
            <nav className="bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06] px-6 py-3 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-8">
                    <Link href="/admin" className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="Next Call" className="h-7 w-auto" />
                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">Admin</span>
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-xs text-neutral-400 hover:text-white transition-colors">
                        Back to User Dashboard →
                    </Link>
                    <span className="text-sm text-neutral-400 hidden sm:block">
                        {user?.firstName || user?.username}
                    </span>
                </div>
            </nav>

            <main className="p-6 min-h-[calc(100vh-56px)]">
                {children}
            </main>
        </div>
    );
}
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { conversationsCollection } from "@/lib/astra";

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

    // Unread support conversations for the nav badge
    const unreadChats = await conversationsCollection
        .countDocuments({ kind: "support", read_by_admin_at: null }, 1000)
        .catch(() => 0);

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
                    <Link href="/admin/chat" className="relative inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-3 py-1.5 text-xs font-medium hover:bg-indigo-500/20 transition-colors">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        Support Chat
                        {unreadChats > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 border border-[#0a0a0a] text-white text-[9px] font-bold flex items-center justify-center">
                                {unreadChats > 9 ? "9+" : unreadChats}
                            </span>
                        )}
                    </Link>
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
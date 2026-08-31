import NotificationBell from "./_components/NotificationBell";
import ActivityFeed from "./_components/ActivityFeed";
import ChatWidget from "./_components/ChatWidget";
import { auth, currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import Link from "next/link";
import AIStatusPill from "./_components/AIStatusPill";
import NavLinks from "./_components/NavLinks";
import MobileNav from "./_components/MobileNav";
import MinutesCounter from "./_components/MinutesCounter";
import DashboardAccessGate from "./_components/DashboardAccessGate";
import { findBusinessByUserId, isTrialExpired } from "@/lib/business";
import DisableLenis from "./_components/DisableLenis";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();
    if (!userId) redirect("/");

    const user = await currentUser();
    const business = await findBusinessByUserId(userId);
    const isActiveBusiness = business?.status === "active";
    const isAIActive = isActiveBusiness && Number(business?.total_minutes_used || 0) < Number(business?.minutes_limit || 200);

    return (
        <div className="min-h-screen overflow-x-clip bg-black dashboard-root">
            <DisableLenis />
            <nav className="bg-black/40 backdrop-blur-xl border-b border-white/10 px-6 py-3 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="flex items-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="Next Call" className="h-7 w-auto" />
                    </Link>
                    <div className="md:hidden ml-2">
                        {isActiveBusiness && (
                            <MobileNav planType={String(business?.plan_type || business?.plan || "standard")} />
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    {isActiveBusiness && <NotificationBell />}
                    {isActiveBusiness && business && (
                        <MinutesCounter
                            used={Number(business?.total_minutes_used || 0)}
                            limit={Number(business?.minutes_limit || 200)}
                            planType={String(business?.plan_type || business?.plan || "standard")}
                            paddleCustomerId={business?.paddle_customer_id || null}
                        />
                    )}
                    {isActiveBusiness && (
                        <div className="hidden sm:flex"><AIStatusPill isActive={isAIActive} /></div>
                    )}
                    <span className="text-sm text-[#C3C9D6] hidden lg:block">
                        {user?.firstName || user?.username}&apos;s Dashboard
                    </span>
                    <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
                </div>
            </nav>

            <div className="flex min-h-[calc(100vh-56px)]">
                {/* Left sidebar — desktop */}
                <aside className="hidden md:flex w-64 shrink-0 border-r border-white/5 bg-black/20 p-4 sticky top-[56px] h-[calc(100vh-56px)] flex-col">
                    {isActiveBusiness && (
                        <NavLinks
                            vertical
                            planType={String(business?.plan_type || business?.plan || "standard")}
                        />
                    )}
                </aside>

                <main className="flex-1 p-6 pb-0 flex flex-col min-w-0">
                    <div className="flex-1">
                        <DashboardAccessGate
                            hasBusiness={Boolean(business)}
                            isActiveBusiness={isActiveBusiness}
                            isTrialEnded={business ? isTrialExpired(business) : false}
                        >
                            {children}
                        </DashboardAccessGate>
                    </div>

                {isActiveBusiness && (
                    <div className="mt-12 pt-6 pb-4 border-t border-white/5">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-neutral-600">
                            <p>© {new Date().getFullYear()} nextCall. All rights reserved.</p>
                            <div className="flex gap-4">
                                <Link href="/dashboard/docs" className="hover:text-white transition-colors">Documentation</Link>
                                <Link href="/dashboard/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                                <Link href="/dashboard/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                                <Link href="/dashboard/support" className="hover:text-white transition-colors">Support</Link>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            </div>

            {isActiveBusiness && (business?.plan === "premium" || business?.plan_type === "premium") && (
                <ChatWidget businessId={userId} />
            )}

            {isActiveBusiness && business && <ActivityFeed businessId={userId} />}
        </div>
    );
}

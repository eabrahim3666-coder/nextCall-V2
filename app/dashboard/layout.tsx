import NotificationBell from "./_components/NotificationBell";
import TawkWidget from "./_components/TawkWidget";
import { auth, currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import Link from "next/link";
import { businessesCollection } from "@/lib/astra";
import Paywall from "./_components/Paywall";
import AIStatusPill from "./_components/AIStatusPill";
import NavLinks from "./_components/NavLinks";
import OnboardingFlow from "./_components/OnboardingFlow";
import PaddleSuccessWaiting from "./_components/PaddleSuccessWaiting";

export const dynamic = 'force-dynamic';



export default async function DashboardLayout({
    children,
    searchParams,
}: {
    children: React.ReactNode;
    searchParams?: { [key: string]: string | string[] | undefined };
}) {
    const { userId } = await auth();
    if (!userId) redirect("/");

    const user = await currentUser();

    // Bulletproof AstraDB Lookup (Bypasses indexing bugs)
    const allBusinesses = await businessesCollection.find({ business_id: { $exists: true } }).toArray();
    const business = allBusinesses.find(b => String(b.business_id) === userId);
    const isActiveBusiness = business && business.status === "active";

    const isAIActive = isActiveBusiness && Number(business?.total_minutes_used || 0) < Number(business?.minutes_limit || 200);


    // RACE CONDITION FIX: Check URL for ?paddle=success
    const isPaddleSuccess = searchParams?.paddle === 'success';

    return (
        <div className="min-h-screen bg-[#050505] grain">
            <nav className="bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06] px-6 py-3 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-8">
                    <Link href="/dashboard" className="flex items-center">
                        <img src="/logo.png" alt="Next Call" className="h-7 w-auto" />
                    </Link>
                    {isActiveBusiness && <NavLinks />}
                </div>

                <div className="flex items-center gap-4">
                    {isActiveBusiness && <NotificationBell />}
                    {isActiveBusiness && <AIStatusPill isActive={isAIActive} />}
                    <span className="text-sm text-neutral-400 hidden sm:block">
                        {user?.firstName || user?.username}&apos;s Dashboard
                    </span>
                    <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
                </div>
            </nav>

            <main className="p-6 pb-0 min-h-[calc(100vh-56px)] flex flex-col">
                <div className="flex-1">
                    {isActiveBusiness ? children : isPaddleSuccess ? (
                        <PaddleSuccessWaiting />
                    ) : business ? <Paywall /> : <OnboardingFlow />}
                </div>

                {isActiveBusiness && (
                    <div className="mt-12 pt-6 pb-4 border-t border-white/[0.06]">
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

            {/* Tawk.to chat — Premium users only */}
            {isActiveBusiness && business?.plan === 'premium' && process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID && (
                <TawkWidget propertyId={process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID} widgetId={process.env.NEXT_PUBLIC_TAWK_WIDGET_ID || 'default'} />
            )}
        </div>
    );
}
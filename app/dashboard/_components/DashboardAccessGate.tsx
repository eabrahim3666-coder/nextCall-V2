"use client";

import { useSearchParams } from "next/navigation";
import OnboardingFlow from "./OnboardingFlow";
import PaddleSuccessWaiting from "./PaddleSuccessWaiting";
import Paywall from "./Paywall";

type DashboardAccessGateProps = {
    children: React.ReactNode;
    hasBusiness: boolean;
    isActiveBusiness: boolean;
};

export default function DashboardAccessGate({
    children,
    hasBusiness,
    isActiveBusiness,
}: DashboardAccessGateProps) {
    const searchParams = useSearchParams();
    const hasPaddleSuccess =
        searchParams.getAll("paddle").includes("success") || searchParams.has("ptxn");

    if (isActiveBusiness) {
        return <>{children}</>;
    }

    if (hasBusiness && hasPaddleSuccess) {
        return <PaddleSuccessWaiting />;
    }

    if (hasBusiness) {
        return <Paywall />;
    }

    return <OnboardingFlow />;
}

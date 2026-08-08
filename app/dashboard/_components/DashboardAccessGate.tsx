"use client";

import { useSearchParams } from "next/navigation";
import OnboardingFlow from "./OnboardingFlow";
import PaddleSuccessWaiting from "./PaddleSuccessWaiting";
import Paywall from "./Paywall";
import TrialEndedScreen from "./TrialEndedScreen";

type DashboardAccessGateProps = {
    children: React.ReactNode;
    hasBusiness: boolean;
    isActiveBusiness: boolean;
    isTrialEnded?: boolean;
};

export default function DashboardAccessGate({
    children,
    hasBusiness,
    isActiveBusiness,
    isTrialEnded = false,
}: DashboardAccessGateProps) {
    const searchParams = useSearchParams();
    const paddleTransactionId =
        searchParams.get("_ptxn") ||
        searchParams.get("ptxn") ||
        searchParams.get("transaction_id");
    const hasPaddleSuccess =
        searchParams.getAll("paddle").includes("success") || Boolean(paddleTransactionId);

    if (isActiveBusiness) {
        return <>{children}</>;
    }

    if (hasBusiness && hasPaddleSuccess) {
        return <PaddleSuccessWaiting transactionId={paddleTransactionId} />;
    }

    if (hasBusiness && isTrialEnded) {
        return <TrialEndedScreen refCode={searchParams.get("ref") || ""} />;
    }

    if (hasBusiness) {
        return <Paywall refCode={searchParams.get("ref") || ""} />;
    }

    return <OnboardingFlow />;
}

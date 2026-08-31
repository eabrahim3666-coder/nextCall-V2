"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import Paywall from "./Paywall";

export default function TrialEndedScreen({ refCode = "" }: { refCode?: string }) {
    const [showPlans, setShowPlans] = useState(false);

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-2xl text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
                    <Icon icon="lucide:power" className="text-rose-400" width={24} />
                </div>

                <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
                    Your Free Trial Has{" "}
                    <span className="bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
                        Ended
                    </span>
                </h2>

                <p className="text-sm text-[#A7ADBB] mt-3 max-w-md mx-auto leading-relaxed">
                    Your AI receptionist is currently{" "}
                    <span className="text-rose-400 font-medium">inactive</span>.
                    Your calls, settings and knowledge base are safe — nothing was
                    deleted. Choose a plan to reactivate your AI and keep answering
                    calls.
                </p>

                <button
                    onClick={() => setShowPlans(true)}
                    className="mt-8 bg-white text-black text-sm font-medium px-8 py-3.5 rounded-full hover:bg-neutral-200 transition-colors"
                >
                    View Plans & Reactivate →
                </button>
            </div>

            {showPlans && (
                <div className="w-full max-w-4xl mt-12">
                    <Paywall allowTrial={false} refCode={refCode} />
                </div>
            )}
        </div>
    );
}

import { Icon } from "@iconify/react";

const DEMO_PHONE = process.env.NEXT_PUBLIC_DEMO_NUMBER || "";

export function DemoCall() {
    return (
        <section id="demo" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-500/10 via-white/[0.03] to-amber-500/10 border border-white/[0.08]">
                <div className="px-6 py-16 sm:px-16 flex flex-col items-center text-center">
                    <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-indigo-300 mb-6">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        Live AI — no signup needed
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight max-w-2xl">
                        Hear your receptionist before you buy.
                    </h2>
                    <p className="mt-4 text-neutral-400 max-w-xl text-lg">
                        Call our demo number right now. Ask about services, pricing, or an appointment — and test the owner alert that fires the moment you hang up.
                    </p>
                    {DEMO_PHONE ? (
                        <a
                            href={`tel:${DEMO_PHONE}`}
                            className="mt-8 inline-flex items-center gap-3 bg-white text-black font-semibold px-8 py-4 rounded-full text-base hover:bg-neutral-200 transition-colors"
                        >
                            <Icon icon="lucide:phone-call" className="w-5 h-5" />
                            Call the AI — {DEMO_PHONE}
                        </a>
                    ) : (
                        <a
                            href="#contact"
                            className="mt-8 inline-flex items-center gap-3 bg-white text-black font-semibold px-8 py-4 rounded-full text-base hover:bg-neutral-200 transition-colors"
                        >
                            <Icon icon="lucide:calendar-clock" className="w-5 h-5" />
                            Book a live demo
                        </a>
                    )}
                    <p className="mt-4 text-xs text-neutral-500">60 seconds. It answers like a real employee, because it is one.</p>
                </div>
            </div>
        </section>
    );
}
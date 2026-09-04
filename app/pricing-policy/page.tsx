import Link from "next/link";

export default function PricingPolicyPage() {
    return (
        <div className="min-h-screen bg-[#0C0C0C] text-white">
            <div className="max-w-4xl mx-auto px-6 py-24">
                <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300 mb-8 inline-block">
                    &larr; Back to Home
                </Link>

                <h1 className="text-3xl font-semibold tracking-tight mb-2">Pricing & Billing Policy</h1>
                <p className="text-xs text-neutral-500 mb-12">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

                <div className="space-y-10 text-sm text-neutral-300 leading-relaxed">

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">1. Subscription Plans & Features</h2>
                        <p>NextCall offers three subscription tiers. All prices are listed in USD unless otherwise stated. By selecting a plan, you agree to the recurring monthly fees and features associated with that tier.</p>

                        <div className="mt-6 space-y-4">
                            <div className="border border-white/[0.06] rounded-2xl p-6 bg-white/[0.02]">
                                <h3 className="text-base font-medium text-white mb-2">Free Trial ($0 / 3 Days)</h3>
                                <ul className="list-disc list-inside space-y-1 text-neutral-400">
                                    <li>50 minutes of AI call handling included.</li>
                                    <li>24/7 AI Receptionist & 1 local phone number.</li>
                                    <li>Basic call summaries and lead capture.</li>
                                    <li>No credit card required to start.</li>
                                </ul>
                            </div>

                            <div className="border border-white/[0.06] rounded-2xl p-6 bg-white/[0.02]">
                                <h3 className="text-base font-medium text-white mb-2">Standard Plan ($299 / Month)</h3>
                                <ul className="list-disc list-inside space-y-1 text-neutral-400">
                                    <li>200 minutes included per month.</li>
                                    <li>Need more? Buy additional minute packs anytime.</li>
                                    <li>Follow-up emails, Google Calendar sync, Appointment reminders.</li>
                                    <li>Custom greeting & tone, Emergency call routing, Email support.</li>
                                </ul>
                            </div>

                            <div className="border border-indigo-500/20 rounded-2xl p-6 bg-indigo-500/[0.02]">
                                <h3 className="text-base font-medium text-white mb-2">Premium Plan ($399 / Month)</h3>
                                <ul className="list-disc list-inside space-y-1 text-neutral-400">
                                    <li>500 minutes included per month.</li>
                                    <li>Need more? Buy additional minute packs anytime.</li>
                                    <li>3 phone numbers, Priority call routing, Advanced analytics.</li>
                                    <li>Zapier / Webhooks integrations, Lead value tracking, Priority support chat.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">2. Free Trial Terms & Conversion</h2>
                        <p>The 3-day Free Trial is limited to <strong>one per business or individual</strong>. The trial includes 50 minutes of AI call handling. No credit card is required to start the trial.</p>
                        <p className="mt-3"><strong>Trial Expiration:</strong> If you do not select a paid plan before the end of the 3-day trial period, your account access will pause until you upgrade. No payment is automatically charged at the end of the trial. You must manually select either the Standard or Premium plan to continue using the Service.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">3. Billing Cycle & Renewals</h2>
                        <p>Paid subscriptions (Standard and Premium) are billed monthly in advance. Subscriptions automatically renew at the end of each billing cycle unless you cancel your subscription prior to the renewal date. You may cancel anytime from your Dashboard settings. The renewal date is based on the date you originally upgraded from the Free Trial.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">4. Minute Limits & Additional Minutes</h2>
                        <p>NextCall incurs real-time telephony and AI processing costs from our infrastructure providers. Each plan includes a set number of minutes per billing cycle. If you reach your plan&apos;s minute limit, the Service is temporarily paused — you will never be charged beyond your plan price without an explicit purchase. To keep the Service running, you can buy additional minute packs (billed immediately at the rates shown in Settings → Billing) or upgrade your plan. Additional minute packs are strictly non-refundable once purchased. Unused minutes do not roll over to the next billing cycle.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">5. Taxes</h2>
                        <p>Paddle acts as the Merchant of Record for all NextCall subscriptions. Paddle is responsible for calculating, collecting, and remitting applicable sales tax, VAT, or similar transaction taxes based on your billing address. The final price at checkout may include these applicable taxes.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">6. Upgrades & Downgrades</h2>
                        <p>You can upgrade or downgrade your subscription at any time from your Dashboard settings. Upgrades take effect immediately, and the prorated difference for the remainder of the current billing cycle will be charged. Downgrades will take effect at the start of your next billing cycle.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">7. Price Changes</h2>
                        <p>We reserve the right to modify our subscription pricing or the pricing of additional minute packs. We will provide you with reasonable advance notice (at least 30 days) via email or in-app notification before any price changes take effect. Continued use of the Service after the effective date of a price change constitutes your agreement to the new pricing.</p>
                    </section>

                    <section className="border border-white/[0.06] rounded-2xl p-6 bg-white/[0.02]">
                        <h2 className="text-lg font-medium text-white mb-3">8. Refunds</h2>
                        <p>All billing is handled in accordance with our Refund Policy, which is outlined in Section 5 of our Terms of Service. Refunds are only issued within the first 7 days of an initial paid subscription and do not cover additional minute packs or active renewals. <Link href="/terms#refund-policy" className="text-indigo-400 hover:text-indigo-300">View full Refund Policy</Link>.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">9. Contact & Support</h2>
                        <p>For any billing inquiries or support requests, please contact us:</p>
                        <p className="mt-3">
                            NextCall Technologies<br />
                            Email: <a href="mailto:support@getnextcall.com" className="text-indigo-400 hover:text-indigo-300">support@getnextcall.com</a><br />
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
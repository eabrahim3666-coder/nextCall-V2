import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

function Badge({ tier }: { tier: "trial" | "standard" | "premium" }) {
    const styles = {
        trial: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
        standard: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        premium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    };
    const labels = { trial: "Free Trial", standard: "Standard", premium: "Premium" };
    return (
        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${styles[tier]}`}>
            {labels[tier]}
        </span>
    );
}

export default function DocsPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">

            <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Documentation & Guidelines</h1>
                <p className="mt-1 text-sm text-neutral-400">Everything you need to know about using nextCall effectively and safely.</p>
            </div>

            {/* SMS Registration Warning */}
            <div className="p-5 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20 flex items-start gap-4">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </span>
                <div>
                    <h3 className="text-sm font-semibold text-amber-300">Business SMS: registration required before any text can be sent</h3>
                    <p className="text-xs text-amber-200/60 mt-1.5 leading-relaxed">
                        US carriers block texts from unregistered numbers. Until you complete the
                        <strong className="text-amber-200"> Business SMS</strong> registration (Toll-Free Verification) and it is approved,
                        <strong className="text-amber-200"> no text messages will be sent</strong> — this includes appointment reminder SMS,
                        missed-call follow-ups, review requests, and AI text replies. Your phone service keeps working normally, and one-time
                        security codes are unaffected. Apply in <a href="/dashboard/settings?focus=sms" className="text-amber-300 underline underline-offset-2 hover:text-amber-200">Settings → Business SMS</a> — approval typically takes 2–3 business days.
                    </p>
                </div>
            </div>

            {/* Plans & Included Features */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
                <h2 className="text-lg font-semibold text-white mb-1">Plans & Included Features</h2>
                <p className="text-xs text-neutral-500 mb-6">Every feature in nextCall, and which plan it comes with.</p>

                <Accordion type="single" collapsible className="w-full space-y-3">
                    <AccordionItem value="plan-trial" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            <span className="flex items-center gap-3"><Badge tier="trial" /> Free Trial — $0 / 3 days, 50 minutes
                            </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>Perfect for testing your AI receptionist risk-free. All trial features:</p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li><strong className="text-white">AI answers calls 24/7</strong> — full voice AI handling every incoming call.</li>
                                <li><strong className="text-white">1 phone number</strong> — provisioned when you finish onboarding.</li>
                                <li><strong className="text-white">Appointment booking + Google Calendar sync</strong> — the AI books appointments and creates calendar events.</li>
                                <li><strong className="text-white">Basic call dashboard</strong> — live activity feed, Performance & Latest Analytics charts, and full Call Log.</li>
                                <li><strong className="text-white">Appointment reminders (email only)</strong> — email 24 hours before each appointment.</li>
                                <li><strong className="text-white">50 minutes included</strong> — call duration is deducted in 1-minute increments.</li>
                            </ul>
                            <p className="text-neutral-500 italic">Paid-only features (marked below) are locked during the trial. Upgrade any time from Settings → Billing.</p>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="plan-standard" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            <span className="flex items-center gap-3"><Badge tier="standard" /> Standard — $299 / month, 200 minutes
                            </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>Everything in the Free Trial, plus the full set of business tools:</p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li><strong className="text-white">Follow-up emails after every call</strong> — branded summary email to every caller.</li>
                                <li><strong className="text-white">Appointment booking + email reminders</strong> — email 24h before, SMS 1h before each appointment.</li>
                                <li><strong className="text-white">Call dashboard & basic analytics</strong> — full Call Log with transcripts, summaries, sentiment, and lead scores.</li>
                                <li><strong className="text-white">Knowledge base training</strong> — train the AI on your services, FAQ, pricing, and exclusions.</li>
                                <li><strong className="text-white">Custom greeting</strong> — your AI has its own name, tone, and greeting.</li>
                                <li><strong className="text-white">Emergency call routing</strong> — urgent callers get forwarded to your phone.</li>
                                <li><strong className="text-white">Daily summary emails</strong> — every morning: calls, leads, appointments, and sentiment trends.</li>
                                <li><strong className="text-white">Job-done tracking + review requests</strong> — mark jobs Done/No-show in the Call Log, send the customer a Google review SMS instantly, or let the automatic 24-hour follow-up do it for you.</li>
                                <li><strong className="text-white">Buy extra minutes</strong> — purchase additional minutes anytime from Settings → Billing.</li>
                                <li><strong className="text-white">Simulate New Review</strong> — preview how the AI responds to a customer review.</li>
                                <li><strong className="text-white">Email support</strong> — 24/7 support from the nextCall team.</li>
                            </ul>
                            <p className="text-neutral-500 italic">200 minutes included per month. Overage: $0.50/min. Unused minutes do not roll over.</p>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="plan-premium" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            <span className="flex items-center gap-3"><Badge tier="premium" /> Premium — $399 / month, 500 minutes
                            </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>Everything in Standard, plus:</p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li><strong className="text-white">3 phone numbers</strong> — and you can add extra numbers any time from the Dashboard.</li>
                                <li><strong className="text-white">Advanced analytics dashboard</strong> — lead value & revenue tracking, call source breakdown, conversion funnel, peak hours heatmap, and AI performance score.</li>
                                <li><strong className="text-white">Priority call routing</strong> — hot-lead alerts and missed-call auto-SMS, driven by AI call analysis.</li>
                                <li><strong className="text-white">Zapier / Make / n8n webhooks</strong> — send call data to 5,000+ apps.</li>
                                <li><strong className="text-white">Priority support chat</strong> — the in-app chat bubble, bridged to the nextCall team over Telegram, with photo support.</li>
                            </ul>
                            <p className="text-neutral-500 italic">500 minutes included per month. Overage: $0.40/min.</p>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            {/* Setup Guide */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
                <h2 className="text-lg font-semibold text-white mb-1">Setup Guide</h2>
                <p className="text-xs text-neutral-500 mb-6">Follow these steps to get your AI receptionist live.</p>

                <Accordion type="single" collapsible className="w-full space-y-3">
                    <AccordionItem value="step-1" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            Step 1: Configure Your Business Profile
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>Go to <strong className="text-white">Settings → Business Info</strong> and fill out every field. This is the foundation your AI uses to represent your business.</p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li><strong className="text-white">Business Name & Type</strong> — The AI introduces itself using your business name.</li>
                                <li><strong className="text-white">Service Area</strong> — Helps the AI reject callers outside your coverage zone.</li>
                                <li><strong className="text-white">Hours of Operation</strong> — AI informs callers when you are open or closed.</li>
                                <li><strong className="text-white">Services Offered</strong> — List everything you do so the AI can answer accurately.</li>
                                <li><strong className="text-white">Exclusions</strong> — Critical: tell the AI what you DO NOT do to prevent misinformation.</li>
                                <li><strong className="text-white">Pricing Rules</strong> — If you have standard pricing, enter it here. The AI will quote prices to callers.</li>
                                <li><strong className="text-white">Average Job Value</strong> <Badge tier="premium" /> — Entered in Settings → Business Info; powers the lead value & revenue analytics on the Premium dashboard.</li>
                            </ul>
                            <p className="text-neutral-500 italic">Click Save Settings after every change. Your AI updates instantly.</p>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="step-2" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            Step 2: Train Your AI Knowledge Base
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>Navigate to <strong className="text-white">Settings → AI Knowledge</strong>. This is the brain of your AI. The more detail you provide, the smarter your AI will be.</p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li><strong className="text-white">Greeting & Tone</strong> — Choose friendly, professional, or casual. The AI will match this personality.</li>
                                <li><strong className="text-white">AI Name</strong> — Give your AI a name (e.g., &quot;Sam&quot;). Callers will hear &quot;Hi, you&apos;ve reached Joe&apos;s Plumbing, this is Sam.&quot;</li>
                                <li><strong className="text-white">FAQ Section</strong> — Add common questions and answers. The AI will use these verbatim for accurate replies.</li>
                                <li><strong className="text-white">Emergency Definition</strong> — Define what counts as an emergency for your business (e.g., &quot;burst pipe&quot;, &quot;gas leak&quot;, &quot;fire&quot;).</li>
                                <li><strong className="text-white">Knowledge Base Text</strong> — Click &quot;View Template Guide&quot; and follow the format. Include your unique selling points.</li>
                            </ul>
                            <p className="text-neutral-500 italic">Tip: The more specific you are in Exclusions and FAQs, the fewer mistakes the AI will make.</p>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="step-3" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            Step 3: Set Up Call Routing
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>In <strong className="text-white">Settings → Call Routing</strong>, configure how the AI handles different scenarios.</p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li><strong className="text-white">Forward Emergency Calls</strong> — When enabled, the AI will call your phone if the caller uses emergency keywords. <span className="text-neutral-500">(All plans)</span></li>
                                <li><strong className="text-white">Notify Hot Leads</strong> — Get an instant notification when a high-intent caller is ready to buy. <Badge tier="premium" /></li>
                                <li><strong className="text-white">SMS Missed Call</strong> — Auto-texts callers who hang up quickly: &quot;Sorry we missed you!&quot; <Badge tier="premium" /></li>
                                <li><strong className="text-white">Email Follow-Up</strong> — Sends a branded summary email to every caller after the call ends. <Badge tier="standard" /></li>
                                <li><strong className="text-white">Daily Summary</strong> — Get a daily email with: calls answered, leads captured, appointments booked, and sentiment trends. <Badge tier="standard" /></li>
                                <li><strong className="text-white">Appointment Reminders</strong> — Auto-SMS 1 hour before and auto-email 24 hours before each appointment. <Badge tier="trial" /> trial: email only.</li>
                                <li><strong className="text-white">Auto Review Follow-Up</strong> — If you forget to mark a job done, we automatically ask the customer for a Google review 24 hours after the appointment. <Badge tier="trial" /></li>
                            </ul>
                            <p className="text-neutral-500 italic">Hot-lead notifications and missed-call SMS are Premium-only. Email follow-up, daily summary, appointment reminders, and auto review follow-up are included in Standard & Premium.</p>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="step-4" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            Step 4: Connect Your Phone Number
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>You need a phone number for your AI to answer calls. Two options:</p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li><strong className="text-white">Get a New Number</strong> — Go to <strong className="text-white">Dashboard → Numbers</strong> and click &quot;Buy Number&quot;. We provision a local number in your area code instantly. <span className="text-neutral-500">Trial & Standard: 1 number. Premium: 3 numbers, plus extra numbers available on the Premium plan.</span></li>
                                <li><strong className="text-white">Port Your Existing Number</strong> — Contact support to initiate a port. Takes 5-10 business days.</li>
                            </ul>
                            <p className="text-neutral-500 italic">Warning: Do not cancel your old phone service until you confirm calls are flowing through nextCall.</p>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="step-5" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            Step 5: Update Your Online Listings
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>To ensure all leads are captured, update your phone number everywhere your business appears:</p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li><strong className="text-white">Google Business Profile</strong> — Log into Google, go to the Phone section, replace your old number with your nextCall number.</li>
                                <li><strong className="text-white">Your Website</strong> — Update the &quot;Contact Us&quot; page, header, and footer with your nextCall number.</li>
                                <li><strong className="text-white">Social Media</strong> — Update your Instagram, Facebook, and LinkedIn profiles.</li>
                                <li><strong className="text-white">Business Cards & Flyers</strong> — Order new printed materials with your nextCall number.</li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="step-6" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            Step 6: Test Your AI Before Going Live
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>Always test your AI before publishing your number publicly.</p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li>Call your nextCall number from a <strong className="text-white">different phone</strong> (not your business mobile).</li>
                                <li>The AI should answer with your business name and greeting.</li>
                                <li>Ask about your services — verify the AI uses your Knowledge Base correctly.</li>
                                <li>Say &quot;emergency&quot; or your defined keyword — confirm you receive the alert.</li>
                                <li>Try to book an appointment — verify the AI captures the date/time.</li>
                                <li>Check your <strong className="text-white">Dashboard → Calls</strong> to see the transcript, summary, and sentiment.</li>
                            </ul>
                            <p className="text-neutral-500 italic">Make adjustments in Settings and re-test until everything sounds natural.</p>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="step-7" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            Step 7: Track Jobs & Collect Reviews
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>Review requests are only sent to customers who actually had a job done — never to random callers. <Badge tier="standard" /> Standard & Premium</p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li><strong className="text-white">Mark Done</strong> — In <strong className="text-white">Dashboard → Calls</strong>, booked calls show &quot;Mark Done&quot; and &quot;No-show&quot; buttons. Tap &quot;Mark Done&quot; when the job is complete: the customer instantly receives a Google review SMS, and the completed job is recorded in your AI&apos;s context (so it knows if they call back).</li>
                                <li><strong className="text-white">No-show</strong> — If the customer never showed up or cancelled, tap &quot;No-show&quot;. No review SMS is ever sent for that call.</li>
                                <li><strong className="text-white">Automatic follow-up</strong> — Forgot to mark a job done? If an appointment passes and nothing is marked within 24 hours, nextCall automatically sends the review SMS and marks the job as auto-done. Turn this off anytime in Settings → Call Routing → &quot;Auto Review Follow-Up&quot;.</li>
                                <li><strong className="text-white">Request Review</strong> — For done jobs, the review button can also trigger the AI to ask the customer for a review during their next call.</li>
                            </ul>
                            <p className="text-neutral-500 italic">The review link used in the SMS is the Google review link configured for your account.</p>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            {/* How It Works */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
                <h2 className="text-lg font-semibold text-white mb-1">How It Works</h2>
                <p className="text-xs text-neutral-500 mb-6">The full lifecycle of a call from start to finish.</p>

                <Accordion type="single" collapsible className="w-full space-y-3">
                    <AccordionItem value="how-1" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            What happens when a customer calls?
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <ol className="list-decimal list-inside space-y-1.5 ml-1">
                                <li>Customer dials your nextCall number.</li>
                                <li>AI answers within 1 second with your business greeting.</li>
                                <li>AI listens, understands intent, and responds naturally using your Knowledge Base.</li>
                                <li>AI captures key information: name, phone number, reason for call, appointment requests.</li>
                                <li>After the call ends, the AI generates a transcript, summary, sentiment analysis, and lead score.</li>
                                <li>The call record appears instantly in your Dashboard → Calls.</li>
                                <li>If configured, AI sends follow-up email, SMS, creates calendar event, or triggers notifications.</li>
                            </ol>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="how-2" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            How does appointment booking work?
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <ol className="list-decimal list-inside space-y-1.5 ml-1">
                                <li>Caller says something like &quot;I want to book an appointment for Thursday at 2pm.&quot;</li>
                                <li>AI confirms availability and captures the date, time, customer name, and phone number.</li>
                                <li>After the call, the AI creates a calendar event in your Google Calendar automatically.</li>
                                <li>If Google Calendar is not connected, the appointment is logged in the call record for manual entry.</li>
                                <li>Customer receives a confirmation email with the appointment details.</li>
                            </ol>
                            <p className="text-neutral-500 italic">Requires Google Account integration enabled in Settings → Integrations.</p>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="how-3" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            How does the support chat work?
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>Premium plan includes <strong className="text-white">priority support chat</strong> — the chat bubble in the bottom-right corner of your dashboard.</p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li>Send a message (text or photo) and it is delivered straight to the nextCall team over Telegram.</li>
                                <li>The team&apos;s replies appear live in the chat bubble — no emails, no waiting.</li>
                                <li>When the team replies, you&apos;ll see the response appear instantly, with a &quot;Reply delivered&quot; confirmation.</li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            {/* Integrations Guide */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
                <h2 className="text-lg font-semibold text-white mb-1">Integrations Guide</h2>
                <p className="text-xs text-neutral-500 mb-6">Connect nextCall with your existing tools.</p>

                <Accordion type="single" collapsible className="w-full space-y-3">
                    <AccordionItem value="int-1" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            Google Calendar
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>When connected, the AI automatically creates calendar events for appointments booked over the phone. <span className="text-neutral-500">Included on all plans.</span></p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li>Go to <strong className="text-white">Settings → Integrations</strong> → Click &quot;Connect Google Account&quot;.</li>
                                <li>Authorize calendar.events and business.manage scopes.</li>
                                <li>Once connected, any call where a customer books an appointment will automatically appear in your Google Calendar.</li>
                                <li>The event includes: customer name, phone number, call summary, and appointment time.</li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="int-2" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            Webhooks (Zapier / Make / n8n)
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p><Badge tier="premium" /> Available on the Premium plan. Send call data to 5,000+ apps via webhooks.</p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li>Go to <strong className="text-white">Settings → Integrations</strong> → Enter your webhook URL in the Webhooks field.</li>
                                <li>When a call is processed, nextCall sends a POST request with full call data to your webhook URL.</li>
                                <li>Use this to trigger workflows in Zapier, Make, n8n, or any custom endpoint.</li>
                                <li>Data includes: call_id, customer name, phone, sentiment, lead quality, appointment status, and summary.</li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            {/* Business SMS Guide */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
                <h2 className="text-lg font-semibold text-white mb-1">Business SMS (Toll-Free Verification)</h2>
                <p className="text-xs text-neutral-500 mb-6">How to register for texting — and why it&apos;s required.</p>

                <Accordion type="single" collapsible className="w-full space-y-3">
                    <AccordionItem value="sms-1" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            Why do I need to register to send texts?
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>US carriers require businesses to verify their identity before texting customers from a toll-free number. This is called <strong className="text-white">Toll-Free Verification (TFV)</strong> and is enforced by law (TCPA / CTIA guidelines).</p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li>Without an approved verification, carriers block outbound texts — they simply never arrive.</li>
                                <li>nextCall handles the entire submission with Twilio — you never touch Twilio&apos;s console or see technical forms.</li>
                                <li>Inbound texts, calls and the AI phone line are <strong className="text-white">not affected</strong> — only sending texts requires approval.</li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="sms-2" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            How do I submit the application?
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <ol className="list-decimal list-inside space-y-1.5 ml-1">
                                <li>Go to <strong className="text-white">Settings → Business SMS</strong> and click <strong className="text-white">&quot;Get started&quot;</strong>.</li>
                                <li>Fill in the form — most fields are pre-filled from your business profile. You&apos;ll need:</li>
                            </ol>
                            <ul className="list-disc list-inside space-y-1.5 ml-6">
                                <li><strong className="text-white">Business details</strong> — legal name, website, business type, and registration number (EIN) unless you&apos;re a sole proprietor.</li>
                                <li><strong className="text-white">Contact info</strong> — who Twilio should reach with the result.</li>
                                <li><strong className="text-white">How you text</strong> — pick the ways you text customers, paste a sample message (we pre-fill a realistic one), and tell us how customers agree to receive texts.</li>
                                <li><strong className="text-white">Opt-in proof</strong> — a public link (e.g. a Google Drive screenshot) showing how a customer agrees to receive texts.</li>
                                <li><strong className="text-white">Privacy Policy and Terms &amp; Conditions URLs</strong> — required by carriers. Paste the page URLs from your website or booking platform.</li>
                            </ul>
                            <p className="text-neutral-500 italic">Only send-for-business: you will never be asked for your Twilio credentials or account details.</p>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="sms-3" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            What happens after I submit?
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li>We submit instantly to Twilio and your dashboard shows <strong className="text-white">&quot;Verification in progress&quot;</strong>.</li>
                                <li>Approval typically takes <strong className="text-white">2–3 business days</strong>. You&apos;ll also receive an email to your notification address.</li>
                                <li>Once approved, all SMS features unlock automatically — appointment reminder texts, missed-call follow-ups, review request texts, and AI text replies.</li>
                                <li>If Twilio requests changes, your dashboard shows the exact reason and a <strong className="text-white">&quot;Fix &amp; resubmit&quot;</strong> button with your answers pre-filled — no need to retype anything.</li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            {/* Rules & Regulations */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
                <h2 className="text-lg font-semibold text-white mb-1">Rules & Regulations</h2>
                <p className="text-xs text-neutral-500 mb-6">Guidelines for using nextCall responsibly.</p>

                <Accordion type="single" collapsible className="w-full space-y-3">
                    <AccordionItem value="rules-1" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            Acceptable Use Policy
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>nextCall is designed for legitimate business communication only.</p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li>You may not use the service for spam, telemarketing, or robocalling.</li>
                                <li>You may not use the service for illegal activities, fraud, or deceptive practices.</li>
                                <li>You may not use the service to harass, threaten, or harm others.</li>
                                <li>You must comply with all applicable laws including TCPA, GDPR, and call recording consent laws.</li>
                                <li>Violation of these terms may result in immediate account suspension.</li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="rules-2" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            Call Recording & Consent
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>You are solely responsible for complying with call recording laws in your jurisdiction.</p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li><strong className="text-white">One-Party Consent States</strong>: You may record calls if you are a participant. Most US states fall under this.</li>
                                <li><strong className="text-white">Two-Party Consent States</strong>: California, Florida, Illinois, Maryland, Massachusetts, Montana, New Hampshire, Pennsylvania, Washington. All parties must consent.</li>
                                <li><strong className="text-white">Best Practice</strong>: Have your AI announce &quot;This call may be recorded for quality assurance&quot; at the beginning.</li>
                                <li>nextCall assumes no liability for your failure to obtain proper consent.</li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="rules-3" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            Billing & Minute Limits
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li>Your plan includes a set number of minutes per billing cycle: Trial 50, Standard 200, Premium 500.</li>
                                <li>Minutes are calculated as total call duration across all calls, in 1-minute increments.</li>
                                <li>When you reach 80%, 90%, and 100% usage, you&apos;ll receive in-app notifications and email alerts.</li>
                                <li>If you exceed your limit, overage rates apply ($0.50/min Standard, $0.40/min Premium).</li>
                                <li><strong className="text-white">Buy extra minutes</strong> <Badge tier="standard" /> — need more time before your cycle resets? Purchase additional minutes from Settings → Billing.</li>
                                <li><strong className="text-white">Referral bonus</strong> — share your referral code (Settings → Billing) with other businesses; you earn bonus minutes when they sign up.</li>
                                <li>You can upgrade or downgrade your plan anytime from the Settings → Billing page.</li>
                                <li>Unused minutes do not roll over to the next cycle.</li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="rules-4" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            Data Privacy & Security
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li>Call transcripts and recordings are stored securely in AstraDB (HIPAA-eligible).</li>
                                <li>Data is encrypted at rest and in transit.</li>
                                <li>We do not share or sell your data or your customers&apos; data to third parties.</li>
                                <li>You can request data deletion at any time by contacting support.</li>
                                <li>Conversation history is retained for 30 days for Meta/Facebook and Google integrations.</li>
                                <li>See our full Privacy Policy at <a href="/privacy" className="text-indigo-400 hover:text-indigo-300">/privacy</a>.</li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>

            {/* Important Warnings */}
            <div className="bg-rose-500/[0.03] border border-rose-500/20 rounded-2xl p-8">
                <h2 className="text-lg font-semibold text-rose-300 mb-1">Important Warnings</h2>
                <p className="text-xs text-neutral-500 mb-6">Please read these carefully before deploying nextCall.</p>

                <div className="space-y-4">
                    <div className="p-5 rounded-xl bg-rose-500/[0.05] border border-rose-500/10">
                        <h3 className="text-sm font-medium text-white">Not a Replacement for 911</h3>
                        <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">nextCall is a business communication tool, NOT a life-safety or emergency dispatch service. While the AI can detect urgent keywords and forward calls, it should never be relied upon for medical, fire, or police emergencies. Always maintain a traditional phone line for emergency calls.</p>
                    </div>

                    <div className="p-5 rounded-xl bg-rose-500/[0.05] border border-rose-500/10">
                        <h3 className="text-sm font-medium text-white">AI May Occasionally Hallucinate</h3>
                        <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">AI language models are highly capable but not perfect. If your Knowledge Base is vague, missing, or contradictory, the AI may generate incorrect information. Keep your instructions precise, your exclusions clear, and your FAQs comprehensive. Review call transcripts regularly to catch any issues early.</p>
                    </div>

                    <div className="p-5 rounded-xl bg-rose-500/[0.05] border border-rose-500/10">
                        <h3 className="text-sm font-medium text-white">Phone Number Changes Are Permanent</h3>
                        <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">If you delete a phone number from your nextCall dashboard, it is permanently removed from our system and cannot be recovered. Before deleting a number, make sure you have updated your Google Business Profile, website, and all marketing materials with the new number first.</p>
                    </div>

                    <div className="p-5 rounded-xl bg-rose-500/[0.05] border border-rose-500/10">
                        <h3 className="text-sm font-medium text-white">Review SMS Sends Automatically</h3>
                        <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">Once an appointment passes, nextCall sends a review request SMS to the customer after 24 hours unless you mark the job as &quot;Done&quot; or &quot;No-show&quot;. Turn off &quot;Auto Review Follow-Up&quot; in Settings → Call Routing if you prefer to control every message manually.</p>
                    </div>

                    <div className="p-5 rounded-xl bg-rose-500/[0.05] border border-rose-500/10">
                        <h3 className="text-sm font-medium text-white">You Are Responsible for Compliance</h3>
                        <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">Laws regarding AI-powered calls, call recording, and message automation vary by state and country. It is your responsibility to understand and comply with all applicable regulations including TCPA, GDPR, and state-specific consent laws. nextCall provides the tool; you are responsible for how you use it.</p>
                    </div>
                </div>
            </div>

        </div>
    );
}

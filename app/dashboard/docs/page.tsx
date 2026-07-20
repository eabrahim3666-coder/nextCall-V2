import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function DocsPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">

            <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Documentation & Guidelines</h1>
                <p className="mt-1 text-sm text-neutral-400">Everything you need to know about using nextCall effectively and safely.</p>
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
                                <li><strong className="text-white">Forward Emergency Calls</strong> — When enabled, the AI will call your phone if the caller uses emergency keywords.</li>
                                <li><strong className="text-white">Notify Hot Leads</strong> — Get an instant notification when a high-intent caller is ready to buy.</li>
                                <li><strong className="text-white">SMS Missed Call</strong> — Auto-texts callers who hang up within 10 seconds: &quot;Sorry we missed you!&quot;</li>
                                <li><strong className="text-white">Email Follow-Up</strong> — Sends a branded summary email to every caller after the call ends.</li>
                                <li><strong className="text-white">Daily Summary</strong> — Get a daily email with: calls answered, leads captured, appointments booked, and sentiment trends.</li>
                                <li><strong className="text-white">Appointment Reminders</strong> — Auto-SMS 1 hour before and auto-email 24 hours before each appointment.</li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="step-4" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            Step 4: Connect Your Phone Number
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>You need a phone number for your AI to answer calls. Two options:</p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li><strong className="text-white">Get a New Number</strong> — Go to <strong className="text-white">Dashboard → Numbers</strong> and click &quot;Buy Number&quot;. We provision a local number in your area code instantly.</li>
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
                            How do Facebook & Instagram auto-replies work?
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <ol className="list-decimal list-inside space-y-1.5 ml-1">
                                <li>Customer sends a DM to your Facebook Page or Instagram account.</li>
                                <li>Meta sends the message to nextCall via webhook.</li>
                                <li>The AI analyzes the message using your Knowledge Base and conversation history.</li>
                                <li>AI generates a reply and sends it back to the customer on the same platform.</li>
                                <li>The conversation history is saved so the AI remembers context.</li>
                            </ol>
                            <p className="text-neutral-500 italic">Requires Facebook & Instagram connection in Settings → Integrations.</p>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="how-4" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            How do Google Reviews work?
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <ol className="list-decimal list-inside space-y-1.5 ml-1">
                                <li>Every few hours, nextCall checks your Google Business Profile for new unreplied reviews.</li>
                                <li>For each unreplied review, the AI generates a personalized reply.</li>
                                <li>The reply is automatically posted to Google Maps on your behalf.</li>
                                <li>Positive reviews get a grateful reply with local SEO keywords.</li>
                                <li>Negative reviews get an apology and an invitation to contact your office directly.</li>
                            </ol>
                            <p className="text-neutral-500 italic">Requires Google Account integration enabled in Settings → Integrations.</p>
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
                            <p>When connected, the AI automatically creates calendar events for appointments booked over the phone.</p>
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
                            Facebook & Instagram
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>Auto-reply to DMs from your Facebook Page and Instagram Business account.</p>
                            <ul className="list-disc list-inside space-y-1.5 ml-1">
                                <li>Go to <strong className="text-white">Settings → Integrations</strong> → Click &quot;Connect&quot; under Facebook & Instagram.</li>
                                <li>Authorize the required permissions (pages_messaging, pages_show_list, etc.).</li>
                                <li>Select the Facebook Page you want to connect.</li>
                                <li>Once connected, any incoming DM will be answered by the AI using your Knowledge Base.</li>
                                <li>You can disconnect at any time from the same screen.</li>
                            </ul>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="int-3" className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5">
                        <AccordionTrigger className="text-sm font-medium text-white hover:text-indigo-400 py-4">
                            Webhooks (Zapier / Make / n8n)
                        </AccordionTrigger>
                        <AccordionContent className="text-xs text-neutral-400 space-y-3 pb-4">
                            <p>Available on the Premium plan. Send call data to 5,000+ apps via webhooks.</p>
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
                                <li>Your plan includes a set number of minutes per billing cycle.</li>
                                <li>Minutes are calculated as total call duration across all calls.</li>
                                <li>When you reach 80%, 90%, and 100% usage, you&apos;ll receive in-app notifications and email alerts.</li>
                                <li>If you exceed your limit, overage rates apply ($0.50/min Standard, $0.40/min Premium).</li>
                                <li>You can upgrade your plan anytime from the Settings → Billing page.</li>
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
                        <h3 className="text-sm font-medium text-white">You Are Responsible for Compliance</h3>
                        <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">Laws regarding AI-powered calls, call recording, and message automation vary by state and country. It is your responsibility to understand and comply with all applicable regulations including TCPA, GDPR, and state-specific consent laws. nextCall provides the tool; you are responsible for how you use it.</p>
                    </div>
                </div>
            </div>

        </div>
    );
}

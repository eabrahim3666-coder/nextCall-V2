import Link from "next/link";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <div className="max-w-4xl mx-auto px-6 py-24">
                <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300 mb-8 inline-block">
                    &larr; Back to Home
                </Link>

                <h1 className="text-3xl font-semibold tracking-tight mb-2">Privacy Policy</h1>
                <p className="text-xs text-neutral-500 mb-12">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

                <div className="space-y-10 text-sm text-neutral-300 leading-relaxed">

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">1. Introduction</h2>
                        <p>Welcome to NextCall Technologies (&quot;NextCall,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). We operate the NextCall AI Receptionist platform (the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service in compliance with the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA). By using NextCall, you agree to the collection and use of information in accordance with this policy.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">2. Information We Collect</h2>
                        <ul className="list-disc list-inside space-y-2 mt-3">
                            <li><strong>Account Information:</strong> Name, email address, business name, business type, and phone number provided during onboarding (processed via Clerk).</li>
                            <li><strong>Call Data:</strong> Incoming and outgoing phone call audio, metadata (caller ID, duration, timestamps), AI-generated transcripts, call summaries, and sentiment analysis.</li>
                            <li><strong>Payment Information:</strong> Billing details and transaction history processed securely through <strong>Paddle</strong> (our Merchant of Record). We do not store raw credit card numbers on our servers.</li>
                            <li><strong>Usage Data:</strong> Log data, IP addresses, browser type, and interaction patterns with the dashboard.</li>
                            <li><strong>Google Account and Integration Data:</strong> When you choose to connect a Google service (Google Calendar or Google Business Profile) through the NextCall dashboard, we may receive the information necessary to provide that integration — including Google Calendar authorization and integration details needed to create appointment events, and Google Business Profile information such as customer review content and ratings. Google data is not collected unless you choose to connect the applicable Google service, and we do not read the contents of your existing calendar.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">3. How We Use Your Information & Legal Basis</h2>
                        <p>We use your data for the following purposes, based on the corresponding legal bases required by GDPR:</p>
                        <ul className="list-disc list-inside space-y-2 mt-3">
                            <li><strong>To provide and maintain the Service:</strong> Processing transactions, routing calls, and delivering core functionality <em>(Contractual Necessity)</em>.</li>
                            <li><strong>To configure and personalize the AI agent:</strong> Using your provided Knowledge Base to route calls and generate responses <em>(Contractual Necessity)</em>.</li>
                            <li><strong>To send critical notifications:</strong> Emergency escalations, appointment reminders, and account alerts <em>(Legitimate Interest)</em>.</li>
                            <li><strong>To monitor usage and prevent fraud:</strong> Enforcing our Terms of Service and securing the platform <em>(Legitimate Interest & Legal Obligation)</em>.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">4. Google API Data & Limited Use</h2>
                        <p>NextCall offers optional integrations with Google services. These integrations are enabled only when a business owner explicitly chooses to connect their Google Account through the NextCall dashboard.</p>

                        <p className="mt-3 font-semibold text-white">Google Calendar</p>
                        <p className="mt-3">Authorized Google Calendar access is used to create calendar events for appointments confirmed through the NextCall AI receptionist. Events are created in the connected business owner&apos;s primary calendar, and may include the appointment/customer name, the scheduled start and end time, the business owner&apos;s company name as the event location, a short AI summary of the call, and limited context such as the customer&apos;s phone number and a brief excerpt of the call transcript.</p>
                        <p className="mt-3">NextCall uses this access only to create events for new appointments. The application does not use the Google Calendar integration to read, list, modify, or delete existing calendar events, and does not access the contents of your other calendars.</p>

                        <p className="mt-3 font-semibold text-white">Google Business Profile</p>
                        <p className="mt-3">If you connect your Google Business Profile, NextCall may retrieve customer review content and ratings from your profile. This information is used for the AI-assisted review-response feature, in which a suggested response is generated and may then be published back to the connected business&apos;s Google Business Profile on your behalf.</p>

                        <p className="mt-3 font-semibold text-white">AI Processing</p>
                        <p className="mt-3">To generate review responses, Google Business Profile review content and rating information may be processed by OpenAI, a third-party AI provider. This processing exists solely to provide the review-response functionality you requested, and is used for no other purpose. Google user data is not sold, is not used for advertising, and is not used to train or improve generalized AI/ML models.</p>

                        <p className="mt-3 font-semibold text-white">Limited Use</p>
                        <p className="mt-3">NextCall&apos;s use and transfer of information received from Google APIs complies with Google&apos;s User Data Policy, including the Limited Use requirements.</p>

                        <p className="mt-3 font-semibold text-white">User Control</p>
                        <p className="mt-3">Connecting Google services is optional. You can disconnect your Google integrations at any time from the NextCall dashboard (Settings &rarr; Integrations). Disconnecting removes the stored Google refresh token and stops the creation of new appointment events and automated review responses. When you disconnect, we do not automatically revoke the Google OAuth authorization on Google&apos;s side; you can also remove NextCall&apos;s access from your Google Account&apos;s third-party app permissions.</p>
                    </section>

                    <section id="security" className="border border-white/[0.06] rounded-2xl p-6 bg-white/[0.02]">
                        <h2 className="text-lg font-medium text-white mb-3">5. AI Processing, Automated Decision-Making & Call Recordings</h2>
                        <p>Calls handled through our platform may be recorded, transcribed, analyzed, and summarized by AI systems (utilizing Retell AI and OpenAI) to provide core service functionality.</p>
                        <p className="mt-3 font-semibold text-white">Consent Responsibility: You, the business owner, are solely responsible for obtaining any legally required consent from callers before recording or AI-processing conversations. NextCall assumes no liability for your failure to comply with local, state, or federal call recording consent laws.</p>
                        <p className="mt-3"><strong>Automated Decision-Making (GDPR Art. 22):</strong> The Service utilizes AI to route calls, generate sentiment scores, and trigger emergency escalations. These automated decisions are made to fulfill the core service provision. You have the right to request human intervention regarding these automated decisions.</p>
                        <p className="mt-3">AI-generated outputs (summaries, sentiment, auto-replies) may contain inaccuracies and should not be relied upon as the sole source of truth for critical business decisions.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">6. Sharing of Information</h2>
                        <p>We do not sell your personal information. We share data only with Third-Party Service Providers who perform services on our behalf:</p>
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="py-3 pr-4 text-neutral-400 font-medium">Provider</th>
                                        <th className="py-3 pr-4 text-neutral-400 font-medium">Purpose</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-white/[0.04]">
                                        <td className="py-3 pr-4 text-white">Clerk</td>
                                        <td className="py-3 pr-4">Authentication & User Management</td>
                                    </tr>
                                    <tr className="border-b border-white/[0.04]">
                                        <td className="py-3 pr-4 text-white">Twilio</td>
                                        <td className="py-3 pr-4">Telephony, SMS, & WhatsApp Routing</td>
                                    </tr>
                                    <tr className="border-b border-white/[0.04]">
                                        <td className="py-3 pr-4 text-white">Retell AI</td>
                                        <td className="py-3 pr-4">Real-time Voice AI Processing</td>
                                    </tr>
                                    <tr className="border-b border-white/[0.04]">
                                        <td className="py-3 pr-4 text-white">OpenAI</td>
                                        <td className="py-3 pr-4">Transcription, Summarization, &amp; Chat AI, &amp; AI-Assisted Generation of Google Business Profile Review Responses</td>
                                    </tr>
                                    <tr className="border-b border-white/[0.04]">
                                        <td className="py-3 pr-4 text-white">Paddle</td>
                                        <td className="py-3 pr-4">Payment Processing & Billing (Merchant of Record)</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 pr-4 text-white">DataStax AstraDB</td>
                                        <td className="py-3 pr-4">Encrypted Database Storage</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-3">When you enable a Google integration, information obtained through Google APIs may be processed by the service providers necessary to provide the functionality you requested. In particular, Google Business Profile review content and rating information may be sent to OpenAI to generate an AI-assisted response, which is then published back to your Google Business Profile on your behalf.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">7. Data Retention & Deletion</h2>
                        <p>For active subscriptions, we retain Call Data (audio, transcripts, summaries) for the duration of your subscription to provide historical insights and improve AI context. Usage Data is retained for up to 12 months for analytics and security purposes.</p>
                        <p className="mt-3">Upon cancellation of your subscription, your account will enter a 30-day grace period. During this time, data is retained to allow for reactivation. After 30 days, all associated business data, call logs, and configurations are permanently scheduled for deletion from active systems.</p>
                        <p className="mt-3">Certain records may be retained in an anonymized format, or where required for legal, security, fraud prevention, accounting, or compliance purposes.</p>
                        <p className="mt-3"><strong>Google Integration Data:</strong> Google OAuth credentials are retained while the integration is connected and are removed when you disconnect the integration; no separate retention period applies. Calendar events created by NextCall may remain in your Google Calendar after they are created; we do not maintain a copy of your existing calendar contents. You can disconnect your Google integrations at any time from the dashboard.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">8. Security Measures</h2>
                        <p>We implement industry-standard technical and organizational safeguards to protect your data:</p>
                        <ul className="list-disc list-inside space-y-2 mt-3">
                            <li>Encrypted data transmission (TLS/HTTPS) for all API and web traffic.</li>
                            <li>Strict access controls and authentication mechanisms via Clerk.</li>
                            <li>Secure, isolated cloud infrastructure utilizing DataStax AstraDB.</li>
                            <li>Ring-fenced Twilio sub-accounts to isolate telephony data per business.</li>
                        </ul>
                        <p className="mt-3">Google OAuth credentials are handled server-side and are not exposed to the client-side application. Access to connected Google services is restricted to the authenticated business account associated with the integration.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">9. Your Privacy Rights</h2>
                        <p>Depending on your location (e.g., EU/UK or California), you have specific rights regarding your personal data:</p>
                        <ul className="list-disc list-inside space-y-2 mt-3">
                            <li><strong>Access & Portability:</strong> Request access to or an export of the personal information we hold about you.</li>
                            <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete data.</li>
                            <li><strong>Erasure:</strong> Request deletion of your data (subject to legal retention requirements).</li>
                            <li><strong>Objection & Restriction:</strong> Object to or restrict the processing of your data.</li>
                            <li><strong>Withdraw Consent:</strong> Withdraw consent for AI processing at any time (which may limit Service functionality).</li>
                        </ul>
                        <p className="mt-3"><strong>Right to Complain:</strong> You have the right to lodge a complaint with your local Data Protection Authority (DPA) or supervisory authority (e.g., the ICO in the UK) if you believe our processing of your personal information violates applicable law.</p>
                        <p className="mt-3">To exercise these rights, contact us at support@getnextcall.com.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">10. International Data Transfers</h2>
                        <p>Your information may be transferred to — and maintained on — computers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. Where we transfer personal data outside the European Economic Area (EEA) or UK, we rely on Standard Contractual Clauses (SCCs) approved by the European Commission, or other recognized transfer mechanisms to ensure appropriate safeguards are in place.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">11. Cookies & Tracking</h2>
                        <p>We use cookies and similar tracking technologies to maintain user sessions (via Clerk), analyze usage patterns, and improve the Service. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">12. Age Requirements</h2>
                        <p>Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have inadvertently gathered personal data from someone under 18, we will take steps to delete that information.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">13. Changes To This Policy</h2>
                        <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page, updating the &quot;Last updated&quot; date, and, where practical, sending an email or in-app notification. You are advised to review this Privacy Policy periodically for any changes.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
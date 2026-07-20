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

                    <section id="security" className="border border-white/[0.06] rounded-2xl p-6 bg-white/[0.02]">
                        <h2 className="text-lg font-medium text-white mb-3">4. AI Processing, Automated Decision-Making & Call Recordings</h2>
                        <p>Calls handled through our platform may be recorded, transcribed, analyzed, and summarized by AI systems (utilizing Retell AI and OpenAI) to provide core service functionality.</p>
                        <p className="mt-3 font-semibold text-white">Consent Responsibility: You, the business owner, are solely responsible for obtaining any legally required consent from callers before recording or AI-processing conversations. NextCall assumes no liability for your failure to comply with local, state, or federal call recording consent laws.</p>
                        <p className="mt-3"><strong>Automated Decision-Making (GDPR Art. 22):</strong> The Service utilizes AI to route calls, generate sentiment scores, and trigger emergency escalations. These automated decisions are made to fulfill the core service provision. You have the right to request human intervention regarding these automated decisions.</p>
                        <p className="mt-3">AI-generated outputs (summaries, sentiment, auto-replies) may contain inaccuracies and should not be relied upon as the sole source of truth for critical business decisions.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">5. Sharing of Information</h2>
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
                                        <td className="py-3 pr-4">Transcription, Summarization, & Chat AI</td>
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
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">6. Data Retention & Deletion</h2>
                        <p>For active subscriptions, we retain Call Data (audio, transcripts, summaries) for the duration of your subscription to provide historical insights and improve AI context. Usage Data is retained for up to 12 months for analytics and security purposes.</p>
                        <p className="mt-3">Upon cancellation of your subscription, your account will enter a 30-day grace period. During this time, data is retained to allow for reactivation. After 30 days, all associated business data, call logs, and configurations are permanently scheduled for deletion from active systems.</p>
                        <p className="mt-3">Certain records may be retained in an anonymized format, or where required for legal, security, fraud prevention, accounting, or compliance purposes.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">7. Security Measures</h2>
                        <p>We implement industry-standard technical and organizational safeguards to protect your data:</p>
                        <ul className="list-disc list-inside space-y-2 mt-3">
                            <li>Encrypted data transmission (TLS/HTTPS) for all API and web traffic.</li>
                            <li>Strict access controls and authentication mechanisms via Clerk.</li>
                            <li>Secure, isolated cloud infrastructure utilizing DataStax AstraDB.</li>
                            <li>Ring-fenced Twilio sub-accounts to isolate telephony data per business.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">8. Your Privacy Rights</h2>
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
                        <h2 className="text-lg font-medium text-white mb-3">9. International Data Transfers</h2>
                        <p>Your information may be transferred to — and maintained on — computers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. Where we transfer personal data outside the European Economic Area (EEA) or UK, we rely on Standard Contractual Clauses (SCCs) approved by the European Commission, or other recognized transfer mechanisms to ensure appropriate safeguards are in place.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">10. Cookies & Tracking</h2>
                        <p>We use cookies and similar tracking technologies to maintain user sessions (via Clerk), analyze usage patterns, and improve the Service. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">11. Age Requirements</h2>
                        <p>Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have inadvertently gathered personal data from someone under 18, we will take steps to delete that information.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-medium text-white mb-3">12. Changes To This Policy</h2>
                        <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page, updating the &quot;Last updated&quot; date, and, where practical, sending an email or in-app notification. You are advised to review this Privacy Policy periodically for any changes.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
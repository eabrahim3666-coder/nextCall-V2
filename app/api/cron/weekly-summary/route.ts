import { NextResponse } from 'next/server';
import { businessesCollection, callsCollection } from '@/lib/astra';
import { Resend } from 'resend';
import { clerkClient } from '@clerk/nextjs/server';
import { escapeHtml, hasValidSecret } from '@/lib/security';

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (!hasValidSecret(authHeader, process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (!process.env.RESEND_API_KEY) {
            return NextResponse.json({ error: 'Email service is not configured' }, { status: 503 });
        }
        const resend = new Resend(process.env.RESEND_API_KEY);

        const now = new Date();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const activeBusinesses = await businessesCollection.find({ status: "active" }).toArray();
        const client = await clerkClient();
        let emailsSent = 0;

        for (const business of activeBusinesses) {
            if ((business.plan_type || 'standard') === 'trial') continue;
            if (business.routing_rules?.daily_summary === false) continue;

            const calls = await callsCollection.find({
                business_id: business.business_id,
                created_at: { $gte: weekStart.toISOString(), $lt: weekEnd.toISOString() }
            }).toArray();

            if (calls.length === 0) continue;

            let ownerEmail: string | null = null;
            try {
                const clerkUser = await client.users.getUser(business.business_id);
                ownerEmail = clerkUser.emailAddresses?.[0]?.emailAddress || null;
            } catch {
                console.error(`Could not fetch Clerk user for business ${business.business_id}`);
                continue;
            }
            if (!ownerEmail) continue;

            const appointments = calls.filter(c => c.appointment_booked);
            const hotLeads = calls.filter(c => c.lead_quality === "hot");
            const quotes = calls.filter(c => c.quote_given);
            const shortCalls = calls.filter(c => (c.call_duration || 0) < 60);
            const negativeCalls = calls.filter(c => c.sentiment === "Negative").length;
            const avgJobValue = Number(business.avg_job_value || 0);
            const revenueEstimate = avgJobValue > 0 ? appointments.length * avgJobValue : 0;

            const quoteLines = quotes.slice(0, 3).map(q =>
                `<li style="color: #a5b4fc; font-size: 13px; margin-bottom: 4px;">${escapeHtml(q.summary || 'Quote')} — <strong style="color: #fff;">${escapeHtml(q.quote_amount || '')}</strong></li>`
            ).join('');

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getnextcall.com';

            await resend.emails.send({
                from: `nextCall <updates@${process.env.RESEND_FROM_DOMAIN || 'getnextcall.com'}>`,
                to: ownerEmail,
                subject: `Your Weekly AI Summary — ${calls.length} calls, ${appointments.length} booked`,
                html: `
                <div style="font-family: Inter, sans-serif; background: #050505; padding: 40px 32px; max-width: 560px; margin: 0 auto; border-radius: 16px;">
                    <img src="${appUrl}/logo.png" alt="nextCall" style="height: 28px; margin-bottom: 32px;" />
                    <h2 style="font-size: 20px; font-weight: 600; color: #fff; margin: 0 0 8px;">Your week in numbers</h2>
                    <p style="color: #737373; font-size: 14px; margin: 0 0 32px;">Here's what your AI receptionist handled this week for <strong style="color: #fff;">${escapeHtml(business.business_name || 'your business')}</strong>.</p>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 12px;">
                            <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px;">Total Calls</p>
                            <p style="font-size: 28px; font-weight: 700; color: #fff; margin: 0;">${calls.length}</p>
                        </div>
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 12px;">
                            <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px;">Appointments Booked</p>
                            <p style="font-size: 28px; font-weight: 700; color: #34d399; margin: 0;">${appointments.length}</p>
                        </div>
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 12px;">
                            <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px;">Quotes Given</p>
                            <p style="font-size: 28px; font-weight: 700; color: #a5b4fc; margin: 0;">${quotes.length}</p>
                        </div>
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 12px;">
                            <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px;">Hot Leads</p>
                            <p style="font-size: 28px; font-weight: 700; color: #f87171; margin: 0;">${hotLeads.length}</p>
                        </div>
                    </div>

                    ${revenueEstimate > 0 ? `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 12px; margin-bottom: 24px;">
                        <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px;">Estimated Revenue From Bookings</p>
                        <p style="font-size: 28px; font-weight: 700; color: #34d399; margin: 0;">$${revenueEstimate.toLocaleString()}</p>
                        <p style="color: #404040; font-size: 11px; margin: 8px 0 0;">${appointments.length} appointments × $${avgJobValue.toLocaleString()} average job value</p>
                    </div>
                    ` : ''}

                    ${quotes.length > 0 ? `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 12px; margin-bottom: 24px;">
                        <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px;">Quotes Your AI Gave</p>
                        <ul style="list-style: none; padding: 0; margin: 0;">${quoteLines}</ul>
                    </div>
                    ` : ''}

                    ${hotLeads.length > 0 ? `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 12px; margin-bottom: 28px;">
                        <p style="color: #f87171; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px;">⚠ Match with these hot leads — they asked to buy</p>
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            ${hotLeads.slice(0, 5).map(h => `<li style="color: #d4d4d4; font-size: 13px; margin-bottom: 6px;">${escapeHtml(h.customer_name || 'A caller')} (${escapeHtml(String(h.customer_phone || 'no number'))}) — ${escapeHtml(h.summary || '')} — <a href="${appUrl}/dashboard/calls" style="color: #f87171; text-decoration: none;">open call</a></li>`).join('')}
                        </ul>
                        <p style="color: #404040; font-size: 11px; margin: 8px 0 0;">${shortCalls.length} call${shortCalls.length !== 1 ? 's' : ''} this week lasted under a minute — likely abandoned or wrong numbers.</p>
                    </div>
                    ` : `<p style="color: #404040; font-size: 11px; margin-bottom: 28px;">${shortCalls.length} call${shortCalls.length !== 1 ? 's' : ''} this week lasted under a minute — likely abandoned or wrong numbers. ${negativeCalls > 0 ? `${negativeCalls} caller${negativeCalls !== 1 ? 's' : ''} expressed frustration.` : ''}</p>`}

                    <a href="${appUrl}/dashboard/calls" style="display: inline-block; background: #fff; color: #000; padding: 12px 28px; border-radius: 100px; text-decoration: none; font-weight: 600; font-size: 14px;">
                        View Full Call Log →
                    </a>

                    <p style="color: #404040; font-size: 11px; margin-top: 32px;">You're receiving this because summaries are enabled. Turn off in <a href="${appUrl}/dashboard/settings" style="color: #818cf8;">Settings → Call Routing</a>.</p>
                </div>
                `,
            });

            emailsSent++;
        }

        return NextResponse.json({ success: true, businessesProcessed: activeBusinesses.length, emailsSent });
    } catch (error) {
        console.error('Weekly summary cron failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
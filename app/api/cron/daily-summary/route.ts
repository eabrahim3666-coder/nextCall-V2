import { NextResponse } from 'next/server';
import { businessesCollection, callsCollection } from '@/lib/astra';
import { Resend } from 'resend';
import { clerkClient } from '@clerk/nextjs/server';
import { escapeHtml, hasValidSecret } from '@/lib/security';

export async function GET(req: Request) {
    // Security check to prevent unauthorized execution
    const authHeader = req.headers.get('authorization');
    if (!hasValidSecret(authHeader, process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (!process.env.RESEND_API_KEY) {
            return NextResponse.json({ error: 'Email service is not configured' }, { status: 503 });
        }
        const resend = new Resend(process.env.RESEND_API_KEY);
        // Calculate yesterday's date range
        const now = new Date();
        const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Find all active businesses with daily summary enabled
        const activeBusinesses = await businessesCollection.find({ status: "active" }).toArray();

        const client = await clerkClient();
        let emailsSent = 0;

        for (const business of activeBusinesses) {
            // Skip trial users — daily summaries are a paid feature
            if ((business.plan_type || 'standard') === 'trial') continue;

            // Skip if business owner has daily summary turned off
            if (business.routing_rules?.daily_summary === false) continue;

            // Find calls for this business that occurred yesterday
            const calls = await callsCollection.find({
                business_id: business.business_id,
                created_at: { $gte: yesterdayStart.toISOString(), $lt: yesterdayEnd.toISOString() }
            }).toArray();

            // Only send an email if there were actually calls
            if (calls.length === 0) continue;

            // Get the owner's email from Clerk (the source of truth)
            let ownerEmail: string | null = null;
            try {
                const clerkUser = await client.users.getUser(business.business_id);
                ownerEmail = clerkUser.emailAddresses?.[0]?.emailAddress || null;
            } catch {
                console.error(`Could not fetch Clerk user for business ${business.business_id}`);
                continue;
            }

            if (!ownerEmail) continue;

            const totalMinutes = calls.reduce((sum, call) => sum + ((call.call_duration || 0) / 60), 0);
            const positiveCalls = calls.filter(c => c.sentiment === "Positive").length;
            const appointments = calls.filter(c => c.appointment_booked).length;
            const hotLeads = calls.filter(c => c.lead_quality === "hot").length;
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getnextcall.com';

            await resend.emails.send({
                from: `nextCall <updates@${process.env.RESEND_FROM_DOMAIN || 'resend.dev'}>`,
                to: ownerEmail,
                subject: `Your Daily AI Summary — ${calls.length} call${calls.length !== 1 ? 's' : ''} yesterday`,
                        html: `
                    <div style="font-family: Inter, sans-serif; background: #050505; padding: 40px 32px; max-width: 560px; margin: 0 auto; border-radius: 16px;">
                        <img src="${appUrl}/logo.png" alt="nextCall" style="height: 28px; margin-bottom: 32px;" />
                        <h2 style="font-size: 20px; font-weight: 600; color: #fff; margin: 0 0 8px;">Daily Call Summary</h2>
                         <p style="color: #737373; font-size: 14px; margin: 0 0 32px;">Here's what your AI receptionist handled yesterday for <strong style="color: #fff;">${escapeHtml(business.business_name || 'your business')}</strong>.</p>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
                            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 12px;">
                                <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px;">Total Calls</p>
                                <p style="font-size: 28px; font-weight: 700; color: #fff; margin: 0;">${calls.length}</p>
                            </div>
                            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 12px;">
                                <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px;">Minutes Used</p>
                                <p style="font-size: 28px; font-weight: 700; color: #fff; margin: 0;">${totalMinutes.toFixed(1)}</p>
                            </div>
                            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 12px;">
                                <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px;">Appointments</p>
                                <p style="font-size: 28px; font-weight: 700; color: #34d399; margin: 0;">${appointments}</p>
                            </div>
                            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 12px;">
                                <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px;">Hot Leads</p>
                                <p style="font-size: 28px; font-weight: 700; color: #f87171; margin: 0;">${hotLeads}</p>
                            </div>
                        </div>

                        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 12px; margin-bottom: 28px;">
                            <p style="color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 10px;">Sentiment</p>
                            <p style="color: #34d399; font-size: 14px; margin: 0 0 4px;">${positiveCalls} Positive calls</p>
                            <p style="color: #737373; font-size: 14px; margin: 0;">${calls.length - positiveCalls} Neutral / Negative</p>
                        </div>

                        <a href="${appUrl}/dashboard/calls" style="display: inline-block; background: #fff; color: #000; padding: 12px 28px; border-radius: 100px; text-decoration: none; font-weight: 600; font-size: 14px;">
                            View Full Call Log →
                        </a>

                        <p style="color: #404040; font-size: 11px; margin-top: 32px;">You're receiving this because daily summaries are enabled. Turn off in <a href="${appUrl}/dashboard/settings" style="color: #818cf8;">Settings → Call Routing</a>.</p>
                    </div>
                `,
            });

            emailsSent++;
        }

        return NextResponse.json({ success: true, businessesProcessed: activeBusinesses.length, emailsSent });
    } catch (error) {
        console.error('Daily summary cron failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

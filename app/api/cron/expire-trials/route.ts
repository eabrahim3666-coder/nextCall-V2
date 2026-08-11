import { NextResponse } from 'next/server';
import { businessesCollection, notificationsCollection } from '@/lib/astra';
import { Resend } from 'resend';
import { clerkClient } from '@clerk/nextjs/server';
import { escapeHtml, hasValidSecret } from '@/lib/security';
import { getTrialEndsAt } from '@/lib/business';

export async function GET(req: Request) {
    // Security check to prevent unauthorized execution
    const authHeader = req.headers.get('authorization');
    if (!hasValidSecret(authHeader, process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : undefined)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date();

        // Find all active trial businesses (legacy trials without trial_ends_at are handled in code)
        const trialBusinesses = await businessesCollection.find({
            plan_type: 'trial',
            status: 'active',
        }).toArray();

        const client = await clerkClient();
        const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
        let expiredCount = 0;
        let emailsSent = 0;

        for (const business of trialBusinesses) {
            if (getTrialEndsAt(business).getTime() > now.getTime()) continue;

            await businessesCollection.updateOne(
                { _id: business._id },
                {
                    $set: {
                        status: 'trial_expired',
                        trial_expired_at: now.toISOString(),
                        updated_at: now.toISOString(),
                    },
                }
            );
            expiredCount++;

            // In-app notification so the dashboard shows what happened
            try {
                await notificationsCollection.insertOne({
                    business_id: business.business_id,
                    type: "trial_expired",
                    title: "Free Trial Ended",
                    message: "Your 3-day free trial has ended and your AI receptionist is now inactive. Choose a plan to keep answering calls.",
                    read: false,
                    created_at: now.toISOString(),
                });
            } catch (e) {
                console.error("Failed to insert trial-expired notification:", e);
            }

            // Notify the owner by email
            let ownerEmail: string | null = business.owner_email || null;
            try {
                const clerkUser = await client.users.getUser(business.business_id);
                ownerEmail = clerkUser.emailAddresses?.[0]?.emailAddress || ownerEmail;
            } catch {
                console.error(`Could not fetch Clerk user for business ${business.business_id}`);
            }

            if (!ownerEmail || !resend) continue;

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getnextcall.com';
            try {
                await resend.emails.send({
                    from: `nextCall <updates@${process.env.RESEND_FROM_DOMAIN || 'getnextcall.com'}>`,
                    to: ownerEmail,
                    subject: 'Your 3-day free trial has ended',
                    html: `
                        <div style="font-family: Inter, sans-serif; background: #050505; padding: 40px 32px; max-width: 560px; margin: 0 auto; border-radius: 16px;">
                            <img src="${appUrl}/logo.png" alt="nextCall" style="height: 28px; margin-bottom: 32px;" />
                            <h2 style="font-size: 20px; font-weight: 600; color: #fff; margin: 0 0 8px;">Your free trial has ended</h2>
                            <p style="color: #737373; font-size: 14px; margin: 0 0 24px;">Hi ${escapeHtml(business.business_name || 'there')} — your 3-day trial with <strong style="color: #fff;">nextCall</strong> is over, so your AI receptionist is now <strong style="color: #f87171;">inactive</strong> and no longer answering calls.</p>
                            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 12px; margin-bottom: 24px;">
                                <p style="color: #737373; font-size: 12px; margin: 0 0 6px;">What happens now?</p>
                                <p style="color: #e5e5e5; font-size: 14px; margin: 0;">Incoming calls will no longer be answered until you choose a plan. Your calls, settings and knowledge base are all saved — nothing is deleted.</p>
                            </div>
                            <a href="${appUrl}/dashboard" style="display: inline-block; background: #fff; color: #000; padding: 12px 28px; border-radius: 100px; text-decoration: none; font-weight: 600; font-size: 14px;">
                                Choose a Plan →
                            </a>
                            <p style="color: #404040; font-size: 11px; margin-top: 32px;">Questions? Reply to this email and our team will help you out.</p>
                        </div>
                    `,
                });
                emailsSent++;
            } catch (error) {
                console.error(`Failed to send trial-expired email to ${ownerEmail}:`, error);
            }
        }

        return NextResponse.json({ success: true, trialsProcessed: trialBusinesses.length, expiredCount, emailsSent });
    } catch (error) {
        console.error('Trial expiry cron failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { callsCollection, businessesCollection } from '@/lib/astra';
import twilioClient from '@/lib/twilio';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
    // Security check
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();
        // Look for appointments happening in the next 2 hours
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        // 1. Find calls where an appointment was booked, reminder NOT sent yet, and time is upcoming
        const upcomingAppointments = await callsCollection.find({
            appointment_booked: true,
            reminder_sent: { $ne: true },
            appointment_date_time: { 
                $gte: now.toISOString(), 
                $lte: twoHoursFromNow.toISOString() 
            },
            customer_phone: { $nin: [null, ""] }
        }).toArray();

        if (upcomingAppointments.length === 0) {
            return NextResponse.json({ message: "No upcoming appointments need reminders." });
        }

        let remindersSent = 0;

        for (const appt of upcomingAppointments) {
            // 2. Check if the business has reminders turned ON
            const business = await businessesCollection.findOne({ business_id: appt.business_id });
            
            if (!business || !business.routing_rules?.appointment_reminders) continue;
            if (!business.twilio_number) continue; // Need a number to text from

            try {
                // 3. Format the time nicely (e.g., "2:30 PM")
                const apptTime = new Date(appt.appointment_date_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextcall.ai';
                let sent = false;

                // 4a. Email reminder (preferred — if customer email was captured)
                if (appt.customer_email) {
                    try {
                        await resend.emails.send({
                            from: `${business.business_name || 'nextCall'} <updates@${process.env.RESEND_FROM_DOMAIN || 'resend.dev'}>`,
                            to: appt.customer_email,
                            subject: `Appointment Reminder — ${apptTime} today`,
                            html: `
                                <div style="font-family: Inter, sans-serif; background: #050505; padding: 40px 32px; max-width: 480px; margin: 0 auto; border-radius: 16px;">
                                    <h2 style="font-size: 20px; font-weight: 600; color: #fff; margin: 0 0 8px;">Appointment Reminder</h2>
                                    <p style="color: #737373; font-size: 14px; margin: 0 0 24px;">Hi${appt.customer_name ? ` ${appt.customer_name}` : ''}! Just a reminder about your upcoming appointment.</p>
                                    <div style="background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); padding: 20px; border-radius: 12px; margin-bottom: 24px;">
                                        <p style="color: #818cf8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 6px;">Your Appointment</p>
                                        <p style="color: #fff; font-size: 22px; font-weight: 700; margin: 0;">${apptTime} today</p>
                                        <p style="color: #737373; font-size: 14px; margin: 6px 0 0;">with ${business.business_name || 'us'}</p>
                                    </div>
                                    <p style="color: #737373; font-size: 13px; margin: 0;">Need to reschedule? Call us back or reply to this email.</p>
                                </div>
                            `,
                        });
                        sent = true;
                        console.log(`Sent email reminder to ${appt.customer_email} for ${business.business_name}`);
                    } catch (emailError) {
                        console.error(`Email reminder failed for ${appt.call_id}, falling back to SMS:`, emailError);
                    }
                }

                // 4b. SMS fallback — if no email or email failed
                if (!sent && business.twilio_number && appt.customer_phone) {
                    await twilioClient.messages.create({
                        body: `Reminder: You have an appointment with ${business.business_name || 'us'} at ${apptTime} today. Reply HELP to reschedule.`,
                        from: business.twilio_number,
                        to: appt.customer_phone,
                    });
                    sent = true;
                    console.log(`Sent SMS reminder to ${appt.customer_phone} for ${business.business_name}`);
                }

                // 5. Mark as sent so we don't send again
                if (sent) {
                    await callsCollection.updateOne(
                        { _id: appt._id },
                        { $set: { reminder_sent: true } }
                    );
                    remindersSent++;
                }

            } catch (reminderError) {
                console.error(`Failed to send reminder for call ${appt.call_id}:`, reminderError);
            }
        }

        return NextResponse.json({ success: true, remindersSent });

    } catch (error) {
        console.error("Appointment Reminder Cron Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
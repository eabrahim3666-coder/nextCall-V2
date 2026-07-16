import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { businessesCollection, callsCollection } from '@/lib/astra';

export async function POST(request: Request) {
    try {
        const { business_id, customer_name, customer_phone, appointment_date, appointment_time, appointment_duration } = await request.json();

        if (!business_id || !appointment_date) {
            return NextResponse.json({ error: "business_id and appointment_date are required" }, { status: 400 });
        }

        const business = await businessesCollection.findOne({ business_id });
        if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

        const customerName = customer_name || "Demo Customer";
        const customerPhone = customer_phone || "+15551234567";
        const duration = appointment_duration || 60;
        const dateStr = `${appointment_date}T${appointment_time || "10:00:00"}`;
        const startDateTime = new Date(dateStr);
        const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);

        let calendarEventCreated = false;

        if (business.google_refresh_token) {
            try {
                const oAuth2Client = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET
                );
                oAuth2Client.setCredentials({ refresh_token: business.google_refresh_token });
                const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

                const event = {
                    summary: `Appointment: ${customerName}`,
                    location: business.business_name || 'Office',
                    description: `Booked via nextCall AI demo.\n\nCustomer: ${customerName}\nPhone: ${customerPhone}`,
                    start: { dateTime: startDateTime.toISOString(), timeZone: 'America/New_York' },
                    end: { dateTime: endDateTime.toISOString(), timeZone: 'America/New_York' },
                };

                await calendar.events.insert({ calendarId: 'primary', requestBody: event });
                calendarEventCreated = true;
            } catch (calError) {
                console.error("Calendar error:", calError);
            }
        }

        await callsCollection.insertOne({
            business_id,
            call_id: `demo-${Date.now()}`,
            customer_name: customerName,
            customer_phone: customerPhone,
            transcript: "Demo call for Google verification video.",
            summary: `Appointment booked for ${customerName} on ${appointment_date}.`,
            sentiment: "Positive",
            lead_quality: "hot",
            appointment_booked: true,
            appointment_date_time: startDateTime.toISOString(),
            call_duration: duration * 60,
            call_duration_minutes: duration,
            call_source: "demo",
            recording_url: null,
            business_name: business.business_name,
            created_at: new Date().toISOString()
        });

        await businessesCollection.updateOne(
            { business_id },
            { $inc: { total_calls_processed: 1, total_minutes_used: duration }, $set: { updated_at: new Date().toISOString() } }
        );

        return NextResponse.json({
            success: true,
            calendar_event_created: calendarEventCreated,
            appointment: {
                summary: `Appointment: ${customerName}`,
                start: startDateTime.toISOString(),
                end: endDateTime.toISOString()
            }
        });

    } catch (error) {
        console.error("Demo endpoint error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

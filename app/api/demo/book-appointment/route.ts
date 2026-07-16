import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { businessesCollection } from '@/lib/astra';

export async function POST(request: Request) {
    try {
        const { business_id, date } = await request.json();
        if (!business_id || !date) {
            return NextResponse.json({ error: "business_id and date required" }, { status: 400 });
        }

        const business = await businessesCollection.findOne({ business_id });
        if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

        if (!business.google_refresh_token) {
            return NextResponse.json({ error: "No Google account connected" }, { status: 400 });
        }

        const startDateTime = new Date(`${date}T14:00:00`);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oAuth2Client.setCredentials({ refresh_token: business.google_refresh_token });
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

        const event = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: `Appointment: Demo Customer`,
                description: `Booked via nextCall AI. Phone: +15551234567`,
                start: { dateTime: startDateTime.toISOString(), timeZone: 'America/New_York' },
                end: { dateTime: endDateTime.toISOString(), timeZone: 'America/New_York' },
            }
        });

        return NextResponse.json({ success: true, event_link: event.data.htmlLink });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("Demo error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

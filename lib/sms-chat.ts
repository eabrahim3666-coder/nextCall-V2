import openai from "@/lib/openai";
import { callsCollection, conversationsCollection } from "@/lib/astra";
import twilioClient from "@/lib/twilio";

const MODEL = "gpt-4o-mini";

type HandleSmsOptions = {
    from: string;
    to: string;
    body: string;
    channel: "SMS" | "WhatsApp";
    business: Record<string, any>;
};

function buildSystemPrompt(business: Record<string, any>, customerName: string | null, upcomingAppointment: string | null): string {
    const knowledge = typeof business.knowledge_base_text === "string" && business.knowledge_base_text.trim()
        ? business.knowledge_base_text
        : "(no business info provided)";

    return `You are the text/messaging representative for ${business.business_name || "this business"}, a ${business.business_type || "service"} business serving ${business.service_area || "local customers"}. You text exactly like a real, professional front-desk employee of this company: short, warm, human messages. One question at a time. No markdown, no bullet lists, no emojis except very mild ones. Always end with a clear next step.

KNOWLEDGE BASE — use ONLY this to answer questions about services, hours, and prices:
${knowledge}

If the knowledge base does not contain an answer, say you will have the owner confirm. NEVER invent prices, discounts, guarantees, or facts.

CUSTOMER CONTEXT
Name: ${customerName || "unknown"}
Upcoming appointment: ${upcomingAppointment || "none"}

BEHAVIOR RULES
1. Booking: when the customer wants an appointment, ask for a preferred day and time, then call book_appointment. Confirm the booked slot in your reply.
2. Reminder replies: if the customer replies to a reminder text, "1" means confirm (call confirm_appointment), "2" means reschedule (ask which day/time, then call reschedule_appointment and confirm the new slot), "3" means cancel (call cancel_appointment and confirm kindly).
3. Business questions: answer only from the knowledge base.
4. Off-topic messages (news, space, politics, sports, anything unrelated to the business): acknowledge briefly like a person would, then smoothly steer back to helping them with the business. Never discuss or pretend to know about unrelated topics, never invent facts about them.
5. Insults or rude language: stay completely calm and professional. Do NOT repeat their words, do not argue, do not lecture. Reply at most once with something like "I understand you're frustrated — happy to help however I can." If they keep insulting, reply "I'll let the owner know you reached out. Have a good day." and keep any further replies short and final.
6. Asking for a human/owner: "Of course — I'll have the owner reach out to you. Can you confirm this number?"
7. Never promise outcomes, discounts, or prices that are not in the knowledge base.`;
}

function buildHistoryMessages(messages: Array<{ message: string; direction: string }>): Array<{ role: "user" | "assistant"; content: string }> {
    return messages.map((m) => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.message,
    }));
}

function formatAppointment(call: Record<string, any>): string {
    if (!call?.appointment_date_time) return null as unknown as string;
    const d = new Date(call.appointment_date_time);
    if (isNaN(d.getTime())) return null as unknown as string;
    return d.toLocaleString("en-US", {
        weekday: "short", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit",
    }) + (call.appointment_confirmed ? " (confirmed)" : "");
}

function tools() {
    return [
        {
            type: "function" as const,
            function: {
                name: "book_appointment",
                description: "Book a new appointment for the customer. Use after the customer states a preferred day and time.",
                parameters: {
                    type: "object",
                    properties: {
                        date_time: { type: "string", description: "Appointment date and time in ISO 8601 format (e.g., 2026-08-14T14:00:00). TODAY is " + new Date().toISOString().split("T")[0] + ". Interpret relative dates like 'tomorrow', 'this Friday' based on today. Never use past dates." },
                        customer_name: { type: "string", description: "Customer's name if they shared it, otherwise empty string" },
                        summary: { type: "string", description: "One-line summary of what the customer needs, e.g. 'AC repair at home'" },
                    },
                    required: ["date_time", "summary"],
                },
            },
        },
        {
            type: "function" as const,
            function: {
                name: "confirm_appointment",
                description: "Confirm the customer's existing upcoming appointment (they replied that the reminder time works).",
                parameters: { type: "object", properties: {}, required: [] },
            },
        },
        {
            type: "function" as const,
            function: {
                name: "reschedule_appointment",
                description: "Move the customer's existing upcoming appointment to a new date and time.",
                parameters: {
                    type: "object",
                    properties: {
                        date_time: { type: "string", description: "New appointment date and time in ISO 8601 format. TODAY is " + new Date().toISOString().split("T")[0] + ". Never use past dates." },
                    },
                    required: ["date_time"],
                },
            },
        },
        {
            type: "function" as const,
            function: {
                name: "cancel_appointment",
                description: "Cancel the customer's existing upcoming appointment.",
                parameters: { type: "object", properties: {}, required: [] },
            },
        },
    ];
}

export async function handleSmsMessage(options: HandleSmsOptions): Promise<{ reply: string }> {
    const { from, to, body, channel, business } = options;
    const businessId = business.business_id;

    // 1. Load recent thread for context
    const historyDocs = await conversationsCollection
        .find({ business_id: businessId, customer_phone: from, channel })
        .sort({ created_at: -1 })
        .limit(12)
        .toArray();
    const history = buildHistoryMessages(
        (historyDocs.reverse() as Array<Record<string, unknown>>) as unknown as Array<{ message: string; direction: string }>
    );

    // 2. Find the customer's upcoming appointment
    const upcoming = await callsCollection
        .find({
            business_id: businessId,
            customer_phone: from,
            appointment_booked: true,
            appointment_date_time: { $gte: new Date().toISOString() },
            job_status: { $nin: ["canceled", "no_show", "done"] },
        })
        .sort({ appointment_date_time: 1 })
        .limit(1)
        .toArray();
    const upcomingCall = upcoming[0] || null;
    const upcomingAppointment = formatAppointment(upcomingCall || {});

    // 3. Build messages and call the model with tools
    const messages: Array<any> = [
        { role: "system", content: buildSystemPrompt(business, null, upcomingAppointment) },
        ...history,
        { role: "user", content: body },
    ];

    let reply = "";
    for (let i = 0; i < 3; i++) {
        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages,
            tools: tools(),
            tool_choice: "auto",
        });

        const message = completion.choices[0].message;
        const toolCalls = (message.tool_calls || []) as unknown as Array<{ id: string; function: { name: string; arguments: string } }>;

        if (toolCalls.length === 0) {
            reply = message.content || "I'll get back to you shortly.";
            break;
        }

        messages.push(message);
        for (const toolCall of toolCalls) {
            const name = toolCall.function.name;
            let args: any = {};
            try { args = JSON.parse(toolCall.function.arguments || "{}"); } catch { args = {}; }

            let toolOutput = "done";
            try {
                if (name === "book_appointment") {
                    const callId = `sms_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
                    await callsCollection.insertOne({
                        business_id: businessId,
                        call_id: callId,
                        customer_phone: from,
                        customer_name: args.customer_name || null,
                        summary: args.summary || "Booked via SMS",
                        transcript: JSON.stringify([...history, { role: "user", content: body }]),
                        appointment_booked: true,
                        appointment_date_time: args.date_time,
                        appointment_duration_minutes: 60,
                        call_source: "SMS",
                        channel: "sms",
                        sentiment: "Positive",
                        lead_quality: "hot",
                        created_at: new Date().toISOString(),
                    });
                    toolOutput = `Appointment booked for ${args.date_time}.`;
                } else if (name === "confirm_appointment") {
                    if (upcomingCall) {
                        await callsCollection.updateOne(
                            { call_id: upcomingCall.call_id },
                            { $set: { appointment_confirmed: true } }
                        );
                        toolOutput = "Appointment confirmed.";
                    } else {
                        toolOutput = "No upcoming appointment found for this customer.";
                    }
                } else if (name === "reschedule_appointment") {
                    if (upcomingCall) {
                        await callsCollection.updateOne(
                            { call_id: upcomingCall.call_id },
                            { $set: { appointment_date_time: args.date_time, appointment_confirmed: true } }
                        );
                        toolOutput = `Appointment moved to ${args.date_time}.`;
                    } else {
                        toolOutput = "No upcoming appointment found for this customer.";
                    }
                } else if (name === "cancel_appointment") {
                    if (upcomingCall) {
                        await callsCollection.updateOne(
                            { call_id: upcomingCall.call_id },
                            { $set: { job_status: "canceled" } }
                        );
                        toolOutput = "Appointment canceled.";
                    } else {
                        toolOutput = "No upcoming appointment found for this customer.";
                    }
                }
            } catch (toolError) {
                console.error(`[sms-chat] tool ${name} failed:`, toolError);
                toolOutput = "Something went wrong saving that. Ask the customer to try again or contact the business owner.";
            }

            messages.push({
                role: "tool" as const,
                tool_call_id: toolCall.id,
                content: toolOutput,
            });
        }
    }

    // 4. Store both sides of the conversation
    await conversationsCollection.insertOne({
        business_id: businessId,
        customer_phone: from,
        channel,
        message: body,
        direction: "inbound",
        created_at: new Date().toISOString(),
    });

    return { reply };
}

export async function sendSmsReply(options: { from: string; to: string; reply: string; channel: "SMS" | "WhatsApp"; business: Record<string, any> }): Promise<void> {
    const { from, to, reply, channel, business } = options;
    await twilioClient.messages.create({
        from,
        to: channel === "WhatsApp" ? `whatsapp:${to}` : to,
        body: reply,
    });
    await conversationsCollection.insertOne({
        business_id: business.business_id,
        customer_phone: to,
        channel,
        message: reply,
        direction: "outbound",
        created_at: new Date().toISOString(),
    });
}
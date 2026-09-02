import { NextResponse } from 'next/server';
import { businessesCollection, conversationsCollection, webhookEventsCollection } from '@/lib/astra';
import openai from '@/lib/openai';
import crypto from 'crypto';
import { hasValidSecret } from '@/lib/security';

// Helper to verify Meta Webhook Signature
function verifyMetaSignature(req: Request, rawBody: string) {
  const signature = req.headers.get('x-hub-signature-256');
  if (!signature) return false;

  if (!process.env.META_APP_SECRET) return false;
    const expectedSignature = crypto
    .createHmac('sha256', process.env.META_APP_SECRET || '')
    .update(rawBody)
    .digest('hex');

  return hasValidSecret(signature, `sha256=${expectedSignature}`);
}

// 1. GET handler: Meta Verification Handshake
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
        console.log("Meta Webhook Verified!");
        return new NextResponse(challenge, { status: 200 });
    } else {
        console.error("Meta Webhook Verification Failed");
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
}

// 2. POST handler: Receiving Messages
export async function POST(request: Request) {
    const rawBody = await request.text();

    // SECURITY: Verify Meta Signature to prevent spoofed requests
    if (!verifyMetaSignature(request, rawBody)) {
        console.error("Invalid Meta Signature");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // Handle Facebook Messenger Webhooks
    if (body.object === 'page') {
        for (const entry of body.entry) {
            if (entry.messaging) {
                for (const event of entry.messaging) {
                    if (event.message && !event.message.is_echo) {
                        // Idempotency check: skip if this message was already processed
                        const eventKey = `meta:${event.sender.id}:${event.timestamp ?? event.message.mid ?? Date.now()}`;
                        const alreadyProcessed = await webhookEventsCollection.findOne({ _id: eventKey });
                        if (alreadyProcessed) continue;
                        await webhookEventsCollection.insertOne({ _id: eventKey, provider: "meta", event_id: eventKey, created_at: new Date().toISOString() });
                        await handleMessage(event);
                    }
                }
            }
        }
    }

    // Handle Instagram DM Webhooks
    if (body.object === 'instagram') {
        for (const entry of body.entry) {
            if (entry.messaging) {
                for (const event of entry.messaging) {
                    if (event.message && !event.message.is_echo) {
                        const eventKey = `meta:${event.sender.id}:${event.timestamp ?? event.message.mid ?? Date.now()}`;
                        const alreadyProcessed = await webhookEventsCollection.findOne({ _id: eventKey });
                        if (alreadyProcessed) continue;
                        await webhookEventsCollection.insertOne({ _id: eventKey, provider: "meta", event_id: eventKey, created_at: new Date().toISOString() });
                        await handleMessage(event);
                    }
                }
            }
        }
    }

    // Meta requires a 200 OK immediately
    return NextResponse.json({ status: "ok" }, { status: 200 });
}


type MetaMessagingEvent = {
    sender: { id: string };
    recipient: { id: string };
    message: { text?: string; is_echo?: boolean; mid?: string };
    timestamp?: number;
};

async function handleMessage(event: MetaMessagingEvent) {
    const senderId = event.sender.id;         // The user's PSID
    const pageId = event.recipient.id;        // The Business's Page ID
    const messageText = event.message.text;   // What the user said

    // Ignore stickers, attachments, and emoji-only messages silently
    if (!messageText || messageText.trim().length < 2) return; 

    try {
        console.log(`Received message from ${senderId} on Page ${pageId}: "${messageText}"`);

        // 1. Fetch all businesses with a Meta Page ID connected
        // (Workaround for AstraDB findOne indexing issues)
        const connectedBusinesses = await businessesCollection.find({
            meta_page_id: { $exists: true }
        }).toArray();

        // 2. Find the exact match in Node.js (Type-safe string comparison)
        const business = connectedBusinesses.find(b => String(b.meta_page_id) === pageId);

        if (!business || !business.meta_page_access_token) {
            console.error(`No business found for Page ID: ${pageId}`);
            return;
        }

        // Meta DM auto-reply is a Premium feature
        if (business.plan_type !== 'premium') {
            console.log(`Skipping Meta DM for ${business.business_name} — not a Premium subscriber`);
            return;
        }

        console.log(`Business found: ${business.business_name}`);

        // 3. Fetch or Create Conversation Memory + State
        let conversation = await conversationsCollection.findOne({ sender_id: senderId, page_id: String(pageId) });

        // If no conversation exists, or it's older than 24 hours (Meta limit), start fresh
        const staleReset =
            !conversation ||
            Date.now() - new Date((conversation as { last_activity?: string }).last_activity || 0).getTime() > 24 * 60 * 60 * 1000;
        if (staleReset) {
            conversation = {
                sender_id: senderId,
                page_id: String(pageId),
                messages: [],
                last_activity: new Date().toISOString(),
                customerName: null,
                phoneNumber: null,
                leadStage: "NEW",
                lastAction: "NONE"
            } as unknown as typeof conversation; // Bypass TS strictness for missing _id on new objects
        }

        if (!conversation) return;

        // 4. Add user's message to memory. Live conversations append atomically
        // ($push) so a whole-array $set can't drop a concurrent message from
        // the same user — routine given the 3s human buffer below. Stale
        // (>24h) conversations are intentionally reset instead.
        const currentTimestamp = new Date().toISOString();
        await conversationsCollection.updateOne(
            { sender_id: senderId, page_id: String(pageId) },
            staleReset
                ? {
                      $set: {
                          messages: [{ role: "user", content: messageText }],
                          last_activity: currentTimestamp,
                      },
                  }
                : {
                      $set: { last_activity: currentTimestamp },
                      $push: { messages: { role: "user", content: messageText } },
                  },
            { upsert: true }
        );

        // 🧠 THE HUMAN BUFFER: Wait 3 seconds to see if the user is still typing
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if a newer message came in while we were waiting
        const latestConv = await conversationsCollection.findOne({ sender_id: senderId, page_id: String(pageId) });
        if (latestConv && latestConv.last_activity !== currentTimestamp) {
            console.log("User is still typing, pausing this reply...");
            return; // Exit. The newer webhook will handle the full reply.
        }
        // Adopt the freshest messages for prompt context — but keep the
        // locally-reset state for stale conversations (a stale doc still holds
        // pre-reset state fields in the DB, matching the original behavior).
        if (latestConv && !staleReset) conversation = latestConv;
        // Keep the in-memory copy bounded for the prompt context (Astra's
        // $push has no $slice; the cap lives here instead).
        if (Array.isArray(conversation.messages) && conversation.messages.length > 10) {
            conversation.messages = conversation.messages.slice(-10);
        }

        // 5. Enterprise Brain: Analyze, Extract State, and Reply in ONE call
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" }, // Force JSON output
            messages: [
                {
                    role: "system",
                    content: `You are the Senior Customer Success AI for ${business.business_name}. 

YOUR KNOWLEDGE BASE:
 ${business.knowledge_base_text || "No knowledge base provided."}

CURRENT CONVERSATION STATE:
Customer Name: ${conversation.customerName || 'Unknown'}
Phone Number: ${conversation.phoneNumber || 'Unknown'}
Lead Stage: ${conversation.leadStage || 'NEW'}
Last Action Requested: ${conversation.lastAction || 'NONE'}

YOUR TASK:
Analyze the user's latest message and output a JSON object with the following EXACT structure:
{
  "intent": "greeting | pricing | booking | complaint | question | out_of_scope | gratitude | availability | support | emergency",
  "sentiment": "positive | neutral | negative | angry | frustrated | urgent",
  "confidence": 0.85,
  "leadStage": "NEW | INTERESTED | HOT | CUSTOMER | ESCALATED",
  "customerName": "Extracted name or null",
  "phoneNumber": "Extracted phone number or null",
  "action": "NONE | ASK_NAME | ASK_PHONE | ASK_BOOKING | ESCALATE",
  "reply": "Your actual text reply to the user"
}

STRICT RULES:
1. CONFIDENCE: Rate how confident you are (0.0 to 1.0) that your reply is 100% accurate based ONLY on the knowledge base. If you are guessing, confidence should be below 0.7.
2. ACKNOWLEDGE & PIVOT: If intent is 'out_of_scope' or confidence < 0.7, NEVER guess the answer. Pivot to capturing their info. Example: "That's a great question! I'd love to get our team to follow up on that. What's the best number to reach you?"
3. LEAD STAGE RULES:
   - If NEW: Do not push for booking aggressively. Be helpful, answer questions, ask if they need more info.
   - If INTERESTED: Start asking qualifying questions (e.g., "What day works best?").
   - If HOT: Push to book immediately. "Great! Let's get that scheduled. What's the best number to confirm?"
   - If ESCALATED: Stop selling. Apologize and promise a human will reach out.
4. SENTIMENT RULES: If sentiment is 'angry', 'frustrated', or 'urgent', set action to ESCALATE. Empathize, do not sell.
5. CONTEXT AWARE: If the Last Action Requested was ASK_PHONE, and they reply with a random word, politely re-ask for the phone number.
6. STATE UPDATES: If they provide their name or phone number, extract it. Do NOT ask for info we already have.
7. CONCISE: Keep replies under 4 sentences. Warm, human, professional.`
                },
                ...conversation.messages // Include chat history for context
            ]
        });

        // Parse the Enterprise JSON response
        let aiData;
        try {
            const rawContent = completion.choices[0]?.message?.content || "{}";
            aiData = JSON.parse(rawContent);
        } catch {
            console.error("Failed to parse AI JSON, falling back");
            aiData = { reply: "Thanks for your message! Let me have our team look into that for you.", action: "NONE", confidence: 0, intent: "out_of_scope", sentiment: "neutral", leadStage: conversation.leadStage || "NEW" };
        }

        // CTO SAFETY RULES: Override AI if it breaks constraints
        let finalAction = aiData.action || "NONE";
        let finalReply = aiData.reply || "Thanks for your message!";
        const finalConfidence = aiData.confidence || 0;

        // Rule 1: Low Confidence = Escalate & override reply
        if (finalConfidence < 0.7) {
            finalAction = "ESCALATE";
            finalReply = "That's a great question! I want to make sure you get the most accurate info. Could you provide your phone number so our team can follow up with you directly on that?";
        }

        // Rule 2: Angry/Frustrated/Urgent = Escalate & override reply
        if (aiData.sentiment === "angry" || aiData.sentiment === "frustrated" || aiData.sentiment === "urgent") {
            finalAction = "ESCALATE";
            finalReply = "I completely understand, and I'm sorry for the frustration. Let me get your number so our manager can reach out to you immediately to resolve this.";
        }

        // Rule 3: Emergency = Escalate
        if (aiData.intent === "emergency") {
            finalAction = "ESCALATE";
        }

        // Update extracted data
        const extractedName = aiData.customerName || conversation.customerName;
        const extractedPhone = aiData.phoneNumber || conversation.phoneNumber;
        
        // Determine new Lead Stage based on AI output and rules
        let newLeadStage = conversation.leadStage || "NEW";
        if (finalAction === "ESCALATE") newLeadStage = "ESCALATED";
        else if (aiData.leadStage === "HOT" || aiData.intent === "booking") newLeadStage = "HOT";
        else if (aiData.leadStage === "INTERESTED" || aiData.intent === "pricing" || aiData.intent === "availability") newLeadStage = "INTERESTED";

        // 6. Add AI's reply to memory ($push — same race protection) and Save State
        await conversationsCollection.updateOne(
            { sender_id: senderId, page_id: String(pageId) },
            { $set: {
                last_activity: new Date().toISOString(),
                customerName: extractedName,
                phoneNumber: extractedPhone,
                lastAction: finalAction,
                leadStage: newLeadStage,
                lastIntent: aiData.intent,
                lastSentiment: aiData.sentiment
            },
            $push: { messages: { role: "assistant", content: finalReply } }},
            { upsert: true }
        );

        // 7. Send the reply back via the Meta Send API
        await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${business.meta_page_access_token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: senderId },
                message: { text: finalReply }
            })
        });

        console.log(`Replied to ${senderId} on behalf of ${business.business_name} [Intent: ${aiData.intent} | Stage: ${newLeadStage} | Confidence: ${finalConfidence}]`);

    } catch (error) {
        console.error("Error handling Meta message:", error);
    }
}

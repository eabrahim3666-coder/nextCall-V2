import { DataAPIClient } from '@datastax/astra-db-ts';

const RETRY_MAX = 3;
const RETRY_DELAY = 1000;

export async function withRetry<T>(fn: () => Promise<T>, attempt = 1): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const isRetryable = err?.name === 'DataAPIResponseError'
      || err?.message?.includes?.('failed to complete')
      || err?.message?.includes?.('Cassandra failure');
    if (isRetryable && attempt < RETRY_MAX) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY * attempt));
      return withRetry(fn, attempt + 1);
    }
    throw err;
  }
}

// 1. Initialize the client with your Astra token
const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN!);

// 2. Connect to your specific database and keyspace
const db = client.db(`https://${process.env.ASTRA_DB_ID}-${process.env.ASTRA_DB_REGION}.apps.astra.datastax.com`, {
  keyspace: process.env.ASTRA_DB_KEYSPACE,
});

// 3. Export the 'calls' collection so we can easily read/write to it
export const callsCollection = db.collection('calls');

export default db;

// Add this below your callsCollection export
export const businessesCollection = db.collection('businesses');

// Add this below your other exports
export const conversationsCollection = db.collection('conversations');

export const notificationsCollection = db.collection("notifications");
const _webhookEventsCollection = db.collection("webhook_events");

// Photos live in their own unindexed collection — indexed strings are capped
// at 8,000 bytes in Astra, so big base64 blobs must stay out of the `messages` array.
const chatPhotosCollection = db.collection("chat_photos");

export async function saveChatPhoto(photoId: string, data: string): Promise<boolean> {
    try {
        await chatPhotosCollection.insertOne({ _id: photoId, data, created_at: new Date().toISOString() });
        return true;
    } catch (e) {
        const msg = (e as Error)?.message || "";
        if (msg.includes("does not exist") || msg.includes("collection") || msg.includes("COLLECTION")) {
            try {
                await db.createCollection("chat_photos");
                await chatPhotosCollection.insertOne({ _id: photoId, data, created_at: new Date().toISOString() });
                return true;
            } catch {
                console.error("[chat_photos] could not create collection");
                return false;
            }
        }
        console.error("[chat_photos] save failed:", e);
        return false;
    }
}

export async function getChatPhoto(photoId: string): Promise<string | null> {
    try {
        const doc = await chatPhotosCollection.findOne({ _id: photoId });
        return typeof doc?.data === "string" ? doc.data : null;
    } catch (e) {
        console.error("[chat_photos] read failed:", e);
        return null;
    }
}

type JsonDoc = Record<string, unknown>;

async function webhookOp<T>(op: () => Promise<T>): Promise<T | null> {
  try { return await op(); } catch { return null; }
}

export const webhookEventsCollection = {
  findOne: (filter: JsonDoc) => webhookOp(() => _webhookEventsCollection.findOne(filter)),
  insertOne: (doc: JsonDoc) => webhookOp(() => _webhookEventsCollection.insertOne(doc)),
  updateOne: (filter: JsonDoc, update: JsonDoc) => webhookOp(() => _webhookEventsCollection.updateOne(filter, update)),
};

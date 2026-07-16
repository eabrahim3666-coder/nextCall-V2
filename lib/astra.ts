import { DataAPIClient } from '@datastax/astra-db-ts';

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

type JsonDoc = Record<string, unknown>;

async function webhookOp<T>(op: () => Promise<T>): Promise<T | null> {
  try { return await op(); } catch { return null; }
}

export const webhookEventsCollection = {
  findOne: (filter: JsonDoc) => webhookOp(() => _webhookEventsCollection.findOne(filter)),
  insertOne: (doc: JsonDoc) => webhookOp(() => _webhookEventsCollection.insertOne(doc)),
  updateOne: (filter: JsonDoc, update: JsonDoc) => webhookOp(() => _webhookEventsCollection.updateOne(filter, update)),
};

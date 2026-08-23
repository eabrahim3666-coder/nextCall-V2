import { DataAPIClient } from '@datastax/astra-db-ts';

const RETRY_MAX = 3;
const RETRY_DELAY = 1000;

export async function withRetry<T>(fn: () => Promise<T>, attempt = 1): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const isRetryable =
      err?.name === 'DataAPIResponseError' ||
      err?.message?.includes?.('failed to complete') ||
      err?.message?.includes?.('Cassandra failure');
    if (isRetryable && attempt < RETRY_MAX) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY * attempt));
      return withRetry(fn, attempt + 1);
    }
    throw err;
  }
}

// In-memory fallback store for when AstraDB credentials are not provided
const memoryStore = new Map<string, any[]>();

function getMemoryCollection(name: string) {
  if (!memoryStore.has(name)) {
    memoryStore.set(name, []);
  }
  const items = memoryStore.get(name)!;

  const matchesFilter = (doc: any, filter?: any): boolean => {
    if (!filter || Object.keys(filter).length === 0) return true;
    for (const [key, val] of Object.entries(filter)) {
      if (val && typeof val === 'object' && '$in' in (val as any)) {
        const inArr = (val as any).$in;
        if (Array.isArray(inArr) && !inArr.includes(doc[key])) return false;
      } else if (doc[key] !== val) {
        return false;
      }
    }
    return true;
  };

  return {
    find: (filter?: any) => {
      const filtered = items.filter((d) => matchesFilter(d, filter));
      return {
        sort: (_sortObj?: any) => ({
          limit: (limitNum: number) => ({
            project: () => ({ toArray: async () => filtered.slice(0, limitNum) }),
            toArray: async () => filtered.slice(0, limitNum),
          }),
          project: () => ({
            limit: (limitNum: number) => ({ toArray: async () => filtered.slice(0, limitNum) }),
            toArray: async () => filtered,
          }),
          toArray: async () => filtered,
        }),
        limit: (limitNum: number) => ({
          project: () => ({ toArray: async () => filtered.slice(0, limitNum) }),
          toArray: async () => filtered.slice(0, limitNum),
        }),
        project: () => ({
          limit: (limitNum: number) => ({ toArray: async () => filtered.slice(0, limitNum) }),
          toArray: async () => filtered,
        }),
        toArray: async () => filtered,
      };
    },
    findOne: async (filter?: any) => {
      return items.find((d) => matchesFilter(d, filter)) || null;
    },
    insertOne: async (doc: any) => {
      const inserted = { _id: doc._id || `id_${Date.now()}_${Math.random().toString(36).slice(2)}`, ...doc };
      items.push(inserted);
      return { insertedId: inserted._id };
    },
    updateOne: async (filter: any, update: any) => {
      const target = items.find((d) => matchesFilter(d, filter));
      if (target && update?.$set) {
        Object.assign(target, update.$set);
        return { matchedCount: 1, modifiedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0 };
    },
    countDocuments: async (filter?: any) => {
      return items.filter((d) => matchesFilter(d, filter)).length;
    },
    deleteMany: async (filter?: any) => {
      const remaining = items.filter((d) => !matchesFilter(d, filter));
      const deletedCount = items.length - remaining.length;
      memoryStore.set(name, remaining);
      return { deletedCount };
    },
  };
}

let realDb: any = null;
if (process.env.ASTRA_DB_APPLICATION_TOKEN && process.env.ASTRA_DB_ID) {
  try {
    const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);
    realDb = client.db(
      `https://${process.env.ASTRA_DB_ID}-${process.env.ASTRA_DB_REGION || 'us-east1'}.apps.astra.datastax.com`,
      {
        keyspace: process.env.ASTRA_DB_KEYSPACE,
      }
    );
  } catch (err) {
    console.warn('[AstraDB] Initialization deferred or fallback used:', err);
  }
}

function getCollection(name: string): any {
  if (realDb) {
    try {
      return realDb.collection(name);
    } catch {
      return getMemoryCollection(name);
    }
  }
  return getMemoryCollection(name);
}

export const callsCollection = new Proxy({} as any, {
  get: (_, prop) => {
    const col = getCollection('calls');
    const val = col[prop];
    return typeof val === 'function' ? val.bind(col) : val;
  },
});

export const businessesCollection = new Proxy({} as any, {
  get: (_, prop) => {
    const col = getCollection('businesses');
    const val = col[prop];
    return typeof val === 'function' ? val.bind(col) : val;
  },
});

export const conversationsCollection = new Proxy({} as any, {
  get: (_, prop) => {
    const col = getCollection('conversations');
    const val = col[prop];
    return typeof val === 'function' ? val.bind(col) : val;
  },
});

export const notificationsCollection = new Proxy({} as any, {
  get: (_, prop) => {
    const col = getCollection('notifications');
    const val = col[prop];
    return typeof val === 'function' ? val.bind(col) : val;
  },
});

export const smsComplianceCollection = new Proxy({} as any, {
  get: (_, prop) => {
    const col = getCollection('sms_compliance');
    const val = col[prop];
    return typeof val === 'function' ? val.bind(col) : val;
  },
});

export const incidentsCollection = new Proxy({} as any, {
  get: (_, prop) => {
    const col = getCollection('incidents');
    const val = col[prop];
    return typeof val === 'function' ? val.bind(col) : val;
  },
});

export const recoveryGuardCollection = new Proxy({} as any, {
  get: (_, prop) => {
    const col = getCollection('recovery_ai_guard');
    const val = col[prop];
    return typeof val === 'function' ? val.bind(col) : val;
  },
});

const chatPhotosCollection = new Proxy({} as any, {
  get: (_, prop) => {
    const col = getCollection('chat_photos');
    const val = col[prop];
    return typeof val === 'function' ? val.bind(col) : val;
  },
});

const _webhookEventsCollection = new Proxy({} as any, {
  get: (_, prop) => {
    const col = getCollection('webhook_events');
    const val = col[prop];
    return typeof val === 'function' ? val.bind(col) : val;
  },
});

export async function saveChatPhoto(photoId: string, data: string): Promise<boolean> {
  try {
    await chatPhotosCollection.insertOne({ _id: photoId, data, created_at: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
}

export async function getChatPhoto(photoId: string): Promise<string | null> {
  try {
    const doc = await chatPhotosCollection.findOne({ _id: photoId });
    return typeof doc?.data === 'string' ? doc.data : null;
  } catch {
    return null;
  }
}

type JsonDoc = Record<string, unknown>;

async function webhookOp<T>(op: () => Promise<T>): Promise<T | null> {
  try {
    return await op();
  } catch {
    return null;
  }
}

export const webhookEventsCollection = {
  findOne: (filter: JsonDoc) => webhookOp(() => _webhookEventsCollection.findOne(filter)),
  insertOne: (doc: JsonDoc) => webhookOp(() => _webhookEventsCollection.insertOne(doc)),
  updateOne: (filter: JsonDoc, update: JsonDoc) => webhookOp(() => _webhookEventsCollection.updateOne(filter, update)),
};

const db = realDb || {
  collection: (name: string) => getCollection(name),
  createCollection: async () => {},
};

export default db;

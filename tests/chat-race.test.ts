import { describe, it, expect } from "vitest";
import "../lib/astra"; // ensure module loads (memory store active when no ASTRA env)

// Reach the in-memory collections through the astra module's exported
// collections — memory mode is active in tests because ASTRA env vars are
// not set there.
import { conversationsCollection, businessesCollection } from "../lib/astra";

describe("memory store: update operators + upsert", () => {
  it("conversations upsert with $push appends messages", async () => {
    await conversationsCollection.updateOne(
      { business_id: "biz_a", kind: "support" },
      {
        $set: { business_id: "biz_a", kind: "support", last_activity: "2026-01-01T00:00:00Z" },
        $push: { messages: { id: "m1", role: "user", content: "hello", at: "2026-01-01T00:00:00Z" } },
      },
      { upsert: true } as any,
    );

    await conversationsCollection.updateOne(
      { business_id: "biz_a", kind: "support" },
      {
        $set: { last_activity: "2026-01-01T00:01:00Z" },
        $push: { messages: { id: "m2", role: "owner", content: "hi", at: "2026-01-01T00:01:00Z" } },
      },
      { upsert: true } as any,
    );

    const conv = await conversationsCollection.findOne({ business_id: "biz_a", kind: "support" });
    expect(Array.isArray((conv as any)?.messages)).toBe(true);
    expect((conv as any).messages.map((m: any) => m.id)).toEqual(["m1", "m2"]);
  });

  it("two interleaved $push writers do not lose messages (the race fix)", async () => {
    // Simulate two concurrent writers to the SAME conversation: both issue
    // $push updates "at the same time". With whole-array $set one would
    // overwrite the other; with $push both survive.
    const w1 = conversationsCollection.updateOne(
      { business_id: "biz_race", kind: "support" },
      {
        $set: { business_id: "biz_race", kind: "support" },
        $push: { messages: { id: "r1", role: "user", content: "first", at: "2026-01-01T00:00:00Z" } },
      },
      { upsert: true } as any,
    );
    const w2 = conversationsCollection.updateOne(
      { business_id: "biz_race", kind: "support" },
      {
        $set: { business_id: "biz_race", kind: "support" },
        $push: { messages: { id: "r2", role: "owner", content: "second", at: "2026-01-01T00:00:01Z" } },
      },
      { upsert: true } as any,
    );
    await Promise.all([w1, w2]);

    const conv = await conversationsCollection.findOne({ business_id: "biz_race", kind: "support" });
    const ids = ((conv as any)?.messages ?? []).map((m: any) => m.id).sort();
    expect(ids).toEqual(["r1", "r2"]);
  });

  it("$exists / $ne / $nin filters work (Astra semantics: missing ≠ null)", async () => {
    await businessesCollection.updateOne(
      { business_id: "b_exists" },
      { $set: { business_id: "b_exists", business_name: "Exists Co", referral_code: "EXIS-01" } },
      { upsert: true } as any,
    );
    await businessesCollection.updateOne(
      { business_id: "b_nocode" },
      { $set: { business_id: "b_nocode", business_name: "No Code Co" } },
      { upsert: true } as any,
    );

    // $exists: true matches only docs where the field is present
    const withCode = await businessesCollection.findOne({ business_id: "b_exists", referral_code: { $exists: true } });
    expect((withCode as any)?.business_name).toBe("Exists Co");

    const missing = await businessesCollection.findOne({ business_id: "b_nocode", referral_code: { $exists: true } });
    expect(missing).toBeNull();

    // $exists: false matches docs where the field is absent — the atomic
    // referral claim relies on this shape
    const claimable = await businessesCollection.findOne({ business_id: "b_nocode", referral_applied_at: { $exists: false } });
    expect((claimable as any)?.business_name).toBe("No Code Co");

    // $ne with a real value: missing field is not equal to the value → matches
    const notApplied = await businessesCollection.findOne({ business_id: "b_nocode", referral_applied_at: { $ne: "2026-01-01T00:00:00Z" } } as any);
    expect((notApplied as any)?.business_name).toBe("No Code Co");

    // $nin: Astra does NOT equate missing fields with null, so a doc without
    // customer_phone is NOT excluded by $nin: [null, ""]
    const nin = await businessesCollection.findOne({ business_id: "b_nocode", customer_phone: { $nin: [null, ""] } } as any);
    expect((nin as any)?.business_name).toBe("No Code Co");
  });

  it("$inc accumulates numerically", async () => {
    await businessesCollection.updateOne(
      { business_id: "b_inc" },
      { $set: { business_id: "b_inc", minutes_limit: 100, bonus_minutes: 0 } },
      { upsert: true } as any,
    );
    await businessesCollection.updateOne({ business_id: "b_inc" }, { $inc: { minutes_limit: 40, bonus_minutes: 40 } } as any);
    await businessesCollection.updateOne({ business_id: "b_inc" }, { $inc: { minutes_limit: 40, bonus_minutes: 40 } } as any);

    const doc = await businessesCollection.findOne({ business_id: "b_inc" });
    expect((doc as any).minutes_limit).toBe(180);
    expect((doc as any).bonus_minutes).toBe(80);
  });

  it("conditional claim (referral_applied_at does not exist) matches only once", async () => {
    await businessesCollection.updateOne(
      { business_id: "b_claim" },
      { $set: { business_id: "b_claim", business_name: "Claim Co" } },
      { upsert: true } as any,
    );

    const claimFilter = { business_id: "b_claim", referral_applied_at: { $exists: false } };
    const first = await businessesCollection.updateOne(claimFilter as any, { $set: { referral_applied_at: "2026-01-01T00:00:00Z" } } as any);
    const second = await businessesCollection.updateOne(claimFilter as any, { $set: { referral_applied_at: "2026-01-02T00:00:00Z" } } as any);

    expect((first as any).matchedCount).toBe(1);
    expect((second as any).matchedCount).toBe(0);

    const doc = await businessesCollection.findOne({ business_id: "b_claim" });
    expect((doc as any).referral_applied_at).toBe("2026-01-01T00:00:00Z");
  });
});

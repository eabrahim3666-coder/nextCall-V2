import { describe, it, expect } from "vitest";
import { zonedTimeToUtc, businessTimezone } from "../lib/timezone";

describe("zonedTimeToUtc", () => {
  it("converts naive local time to UTC with the correct offset (EDT, UTC-4)", () => {
    // 2026-09-03 is EDT (daylight time). 14:00 in New York = 18:00 UTC.
    const result = zonedTimeToUtc("2026-09-03T14:00:00", "America/New_York");
    expect(result?.toISOString()).toBe("2026-09-03T18:00:00.000Z");
  });

  it("handles winter dates (EST, UTC-5)", () => {
    // 2027-01-15 is EST. 09:30 in New York = 14:30 UTC.
    const result = zonedTimeToUtc("2027-01-15T09:30:00", "America/New_York");
    expect(result?.toISOString()).toBe("2027-01-15T14:30:00.000Z");
  });

  it("handles other zones (America/Chicago, CST, UTC-6)", () => {
    const result = zonedTimeToUtc("2027-01-15T09:30:00", "America/Chicago");
    expect(result?.toISOString()).toBe("2027-01-15T15:30:00.000Z");
  });

  it("crosses DST correctly on the spring-forward boundary", () => {
    // US DST starts 2026-03-08 02:00 local. 2026-03-08 09:00 ET is EDT (UTC-4) → 13:00 UTC.
    const after = zonedTimeToUtc("2026-03-08T09:00:00", "America/New_York");
    expect(after?.toISOString()).toBe("2026-03-08T13:00:00.000Z");
    // The day before, still EST (UTC-5) → 14:00 UTC.
    const before = zonedTimeToUtc("2026-03-07T09:00:00", "America/New_York");
    expect(before?.toISOString()).toBe("2026-03-07T14:00:00.000Z");
  });

  it("accepts space-separated and minute-only forms", () => {
    const a = zonedTimeToUtc("2026-09-03 14:00", "America/New_York");
    const b = zonedTimeToUtc("2026-09-03T14:00", "America/New_York");
    expect(a?.toISOString()).toBe("2026-09-03T18:00:00.000Z");
    expect(a?.toISOString()).toBe(b?.toISOString());
  });

  it("returns null for garbage input", () => {
    expect(zonedTimeToUtc("next tuesday", "America/New_York")).toBeNull();
    expect(zonedTimeToUtc("", "America/New_York")).toBeNull();
    expect(zonedTimeToUtc("2026-09-03T25:00:00", "America/New_York")).toBeNull();
  });

  it("works for the Pacific zone (PDT, UTC-7)", () => {
    const result = zonedTimeToUtc("2026-09-03T14:00:00", "America/Los_Angeles");
    expect(result?.toISOString()).toBe("2026-09-03T21:00:00.000Z");
  });
});

describe("businessTimezone", () => {
  it("returns the stored timezone when valid", () => {
    expect(businessTimezone({ business_timezone: "America/Chicago" })).toBe("America/Chicago");
  });

  it("defaults to America/New_York when missing or invalid", () => {
    expect(businessTimezone({})).toBe("America/New_York");
    expect(businessTimezone(null)).toBe("America/New_York");
    expect(businessTimezone({ business_timezone: "Not/AZone" })).toBe("America/New_York");
  });
});

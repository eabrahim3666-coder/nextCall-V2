/**
 * Timezone helpers — convert naive local datetimes (what GPT returns, e.g.
 * "2026-09-03T14:00:00") into correct UTC ISO strings for a given IANA
 * timezone, using only Intl (no date-fns-tz dependency).
 *
 * Why: serverless servers run in UTC. `new Date("2026-09-03T14:00:00")`
 * parses as 14:00 UTC, but the caller almost always meant 14:00 in the
 * business's local time — creating calendar events and SMS reminders
 * 4-5 hours off for US businesses.
 */

/**
 * Convert a naive local datetime string in a given IANA timezone to a
 * UTC Date. Handles DST boundaries correctly.
 *
 * Returns null when the input is not a usable datetime.
 */
export function zonedTimeToUtc(naiveLocal: string, timeZone: string): Date | null {
  if (!naiveLocal || !timeZone) return null;

  // Normalize accepted shapes: "2026-09-03T14:00", "2026-09-03 14:00:00",
  // "2026-09-03T14:00:00", with optional trailing ".sss"/"Z" stripped.
  const m = naiveLocal.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;

  const [, y, mo, d, h, mi, s] = m;
  const hour = Number(h);
  const minute = Number(mi);
  if (hour > 23 || minute > 59) return null;

  const naiveUtcGuess = Date.UTC(Number(y), Number(mo) - 1, Number(d), hour, minute, s ? Number(s) : 0);

  // What does the wall clock in `timeZone` say at the guessed instant?
  const wallClock = (utcMillis: number): number => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(utcMillis));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
    return Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour") % 24, // Intl can render "24" for midnight
      get("minute"),
      get("second"),
    );
  };

  // Standard 2-iteration zone-offset solve: guess, measure the drift
  // between the target wall clock and the zone's wall clock, adjust.
  let result = naiveUtcGuess;
  for (let i = 0; i < 2; i++) {
    const drift = wallClock(result) - naiveUtcGuess;
    if (drift === 0) break;
    result -= drift;
  }
  return new Date(result);
}

/** A business doc's timezone, defaulting to America/New_York (the product's primary market). */
export function businessTimezone(business: Record<string, unknown> | null | undefined): string {
  const tz = (business as { business_timezone?: string } | null | undefined)?.business_timezone;
  if (!tz) return "America/New_York";
  // Sanity: make sure Intl accepts it, else fall back.
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "America/New_York";
  }
}

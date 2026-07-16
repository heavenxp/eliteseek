import { fromZonedTime } from "date-fns-tz";

// ── Event wall-clock → real instants ──────────────────────────
// events.date/time/end_time are timezone-naive wall-clock values that MEAN
// Melbourne time. Parsing them with `new Date(...)` uses the server's zone
// (UTC on Vercel, AEST locally) — a 10–11h drift that hit countdowns and
// would have hit escrow release timing. IANA zone handles DST correctly
// (AEST +10 / AEDT +11, Oct–Apr). Proper fix (timestamptz columns) is the
// flagged cleanup migration; every consumer goes through here until then.

export const EVENT_TZ = "Australia/Melbourne";

function normalize(time: string): string {
  // PostgREST returns time as HH:MM:SS; forms produce HH:MM
  return time.length === 5 ? `${time}:00` : time;
}

export function eventStart(date: string, time: string): Date {
  return fromZonedTime(`${date}T${normalize(time)}`, EVENT_TZ);
}

export function eventEnd(date: string, endTime: string): Date {
  return fromZonedTime(`${date}T${normalize(endTime)}`, EVENT_TZ);
}

// Whole-day difference between two instants, counted in Melbourne calendar
// days (for "Tonight" / "Tomorrow" / weekday labels).
export function melbourneDayDiff(from: Date, to: Date): number {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: EVENT_TZ }); // YYYY-MM-DD
  const a = new Date(`${fmt.format(from)}T00:00:00Z`).getTime();
  const b = new Date(`${fmt.format(to)}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

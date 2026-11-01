/**
 * Calendar and clock maths in Europe/Berlin, independent of the device's zone.
 *
 * Every restaurant is in Germany, and the server books pre-orders in Berlin
 * time. Reading `new Date().getDay()` or `setDate()` uses the *visitor's*
 * zone, so a guest abroad — or a phone set to the wrong zone — saw the wrong
 * "today" and booked a slot on the wrong date. Here a date is a plain
 * `YYYY-MM-DD` string for the Berlin calendar day, and arithmetic on it is
 * done in UTC, where days are always 24 hours long.
 */

export const BERLIN_TZ = 'Europe/Berlin';

const MINUTE = 60_000;

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

let formatter: Intl.DateTimeFormat | null = null;
function berlinFormatter() {
  formatter ??= new Intl.DateTimeFormat('en-US', {
    timeZone: BERLIN_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return formatter;
}

type WallClock = { y: number; mo: number; d: number; h: number; mi: number; s: number };

function wallClockAt(at: number): WallClock {
  const parts = berlinFormatter().formatToParts(new Date(at));
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // Some engines still print midnight as "24" despite h23.
  return { y: n('year'), mo: n('month'), d: n('day'), h: n('hour') % 24, mi: n('minute'), s: n('second') };
}

const pad = (n: number) => String(n).padStart(2, '0');

export type BerlinClock = {
  /** Berlin calendar date, `YYYY-MM-DD`. */
  date: string;
  /** 0 = Sunday, as `Date#getDay` and the timings document use. */
  dayIndex: number;
  /** Minutes since Berlin midnight. */
  minutes: number;
};

/** The Berlin date, weekday and time of day at an instant (default: now). */
export function berlinClockAt(at: Date | number = Date.now()): BerlinClock {
  const ms = typeof at === 'number' ? at : at.getTime();
  const w = wallClockAt(ms);
  const date = `${w.y}-${pad(w.mo)}-${pad(w.d)}`;
  return { date, dayIndex: weekdayOfDate(date), minutes: w.h * 60 + w.mi };
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

/** A real calendar date in `YYYY-MM-DD` form. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}

/** `HH:MM`, 00:00 to 23:59. */
export function isHHMM(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = TIME_RE.exec(value);
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60;
}

function dateToUTC(date: string): number {
  const [y, mo, d] = date.split('-').map(Number);
  return Date.UTC(y, mo - 1, d);
}

function utcToDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** The calendar date `days` after `date` (negative goes back). */
export function addDays(date: string, days: number): string {
  return utcToDate(dateToUTC(date) + days * 86_400_000);
}

/** Whole calendar days from `from` to `to`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((dateToUTC(to) - dateToUTC(from)) / 86_400_000);
}

/** Weekday of a calendar date, 0 = Sunday. */
export function weekdayOfDate(date: string): number {
  return new Date(dateToUTC(date)).getUTCDay();
}

export function dayKeyOf(dayIndex: number): DayKey {
  return DAY_KEYS[((dayIndex % 7) + 7) % 7];
}

/** `HH:MM` → minutes since midnight. */
export function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

/** Minutes since midnight → `HH:MM` (wraps past 24 h). */
export function minutesToHHMM(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** Berlin's offset from UTC at an instant, in minutes (60 or 120). */
function offsetMinutesAt(at: number): number {
  const w = wallClockAt(at);
  const asUTC = Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s);
  return Math.round((asUTC - Math.floor(at / 1000) * 1000) / MINUTE);
}

/**
 * The instant a Berlin wall-clock date and time names, in epoch milliseconds.
 *
 * Null when that wall time does not exist — the hour skipped when the clocks go
 * forward in March. When it exists twice (the hour repeated in October) the
 * first one is taken, which is the earlier and therefore the safer booking.
 */
export function berlinInstant(date: string, time: string): number | null {
  if (!isIsoDate(date) || !isHHMM(time)) return null;
  const naive = dateToUTC(date) + hhmmToMinutes(time) * MINUTE;
  const offsets = new Set([offsetMinutesAt(naive - 12 * 60 * MINUTE), offsetMinutesAt(naive + 12 * 60 * MINUTE)]);
  const hits: number[] = [];
  for (const off of offsets) {
    const candidate = naive - off * MINUTE;
    const back = berlinClockAt(candidate);
    if (back.date === date && back.minutes === hhmmToMinutes(time)) hits.push(candidate);
  }
  return hits.length ? Math.min(...hits) : null;
}

/** `HH:MM` in Berlin for an instant. */
export function berlinHHMM(at: number): string {
  return minutesToHHMM(berlinClockAt(at).minutes);
}

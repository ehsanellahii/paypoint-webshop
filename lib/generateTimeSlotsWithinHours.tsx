import { addDays, berlinClockAt, berlinInstant, minutesToHHMM, weekdayOfDate } from './berlinTime';
import { windowsFor, type WeeklyHours } from './restaurantTimings';

const DAY = 24 * 60;
const MINUTE = 60_000;

/**
 * Bookable pre-order times on one Berlin calendar date (`YYYY-MM-DD`).
 *
 * The rules, and why:
 *  - A slot has to be at least `minLeadMinutes` away — you cannot pre-order
 *    for five minutes ago, and the kitchen needs notice.
 *  - Each day runs its own opening windows, because a Friday's hours say
 *    nothing about a Sunday's. A split day (lunch and dinner) offers both
 *    windows and nothing in the gap; a day ticked closed offers nothing.
 *  - A window that closes past midnight (23:00 → 05:30) is split at midnight:
 *    the hours before it are offered on the day it opened, the small hours on
 *    the next calendar date. So a night store can still be booked for 01:00 —
 *    under the date 01:00 actually falls on, never a day too early.
 *  - The last slot starts one interval before closing; times step from the
 *    window's opening time.
 *  - Clock changes: a time that does not exist (the hour skipped in March) is
 *    not offered.
 */
export function generateDaySlots({
  weeklyHours,
  date,
  now = Date.now(),
  intervalMinutes = 30,
  minLeadMinutes = 30,
}: {
  weeklyHours?: WeeklyHours;
  date: string;
  now?: number;
  intervalMinutes?: number;
  minLeadMinutes?: number;
}): string[] {
  if (!weeklyHours || !date) return [];

  const minutes = new Set<number>();
  const collect = (dayIndex: number, keep: (abs: number) => number | null) => {
    for (const w of windowsFor(weeklyHours, dayIndex)) {
      for (let t = w.open; t <= w.end - intervalMinutes; t += intervalMinutes) {
        const m = keep(t);
        if (m !== null) minutes.add(m);
      }
    }
  };

  const weekday = weekdayOfDate(date);
  // The small hours of windows that opened the evening before.
  collect(weekday - 1, (t) => (t >= DAY ? t - DAY : null));
  // This date's own windows, up to midnight.
  collect(weekday, (t) => (t < DAY ? t : null));

  const earliest = now + minLeadMinutes * MINUTE;
  return [...minutes]
    .sort((a, b) => a - b)
    .map(minutesToHHMM)
    .filter((time) => {
      const at = berlinInstant(date, time);
      return at !== null && at >= earliest;
    });
}

export type BookableDay = {
  /** Berlin calendar date, `YYYY-MM-DD`. */
  date: string;
  /** Days from Berlin today (0 = today). */
  offset: number;
  /** 0 = Sunday. */
  dayIndex: number;
  slots: string[];
};

/**
 * The next `count` Berlin calendar days, each with its bookable times. "Today"
 * is today in Berlin, whatever the device's clock zone says.
 */
export function bookableDays({
  weeklyHours,
  now = Date.now(),
  count = 7,
  intervalMinutes = 30,
  minLeadMinutes = 30,
}: {
  weeklyHours?: WeeklyHours;
  now?: number;
  count?: number;
  intervalMinutes?: number;
  minLeadMinutes?: number;
}): BookableDay[] {
  const today = berlinClockAt(now).date;
  const out: BookableDay[] = [];
  for (let i = 0; i < count; i += 1) {
    const date = addDays(today, i);
    out.push({
      date,
      offset: i,
      dayIndex: weekdayOfDate(date),
      slots: generateDaySlots({ weeklyHours, date, now, intervalMinutes, minLeadMinutes }),
    });
  }
  return out;
}

/** `DD.MM` for a `YYYY-MM-DD` date, for the day chips. */
export function shortDate(date: string): string {
  const [, mo, d] = date.split('-');
  return `${d}.${mo}`;
}

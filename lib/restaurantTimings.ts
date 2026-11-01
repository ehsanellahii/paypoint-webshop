/**
 * Is the restaurant open?
 *
 * One answer, used by the menu badge, the cart bar and the checkout gate, so a
 * storefront that says "Closed" cannot also take an order.
 *
 * Two things this deliberately does *not* do the obvious way:
 *
 *  - It never reads the browser's clock zone. `new Date().getDay()` and
 *    `toTimeString()` are the *visitor's* wall clock, so a customer abroad — or
 *    with a badly set device — saw a closed shop as open and ordered from it.
 *    The kitchens are in Germany and the checkout already books pre-order slots
 *    in `Europe/Berlin`; opening hours are read in that same zone.
 *
 *  - A window that closes past midnight belongs to the day it *opened* on. At
 *    01:00 the relevant window is yesterday's `18:00 – 02:00`, not today's
 *    entry, which may well be unset.
 */

import { addDays, berlinClockAt, berlinInstant, dayKeyOf, hhmmToMinutes, isHHMM, isIsoDate, minutesToHHMM, weekdayOfDate } from './berlinTime';

/**
 * One weekday's hours, as the server stores them (timings.model.ts).
 *
 * `closed` is a day the owner ticked off; it wins over whatever hours are
 * still typed in next to it. `open2`/`close2` is the second window of a split
 * day — lunch and dinner with the kitchen shut in between. The server's order
 * gate (`storeOpeningHours.ts windowsFor`) reads both; the shop used to read
 * only `open`/`close`, so a split day showed "Geschlossen" during dinner and a
 * day ticked closed showed the shop as open.
 */
export type DayHours = {
  open?: string | null;
  close?: string | null;
  closed?: boolean | null;
  open2?: string | null;
  close2?: string | null;
};
export type WeeklyHours = { [day: string]: DayHours | undefined } | null | undefined;

const DAY = 24 * 60;

/** Minutes since midnight, or null when the value is missing or malformed. */
const toMinutes = (hhmm?: string | null): number | null => {
  if (typeof hhmm !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

/**
 * A closing time. Same as `toMinutes`, except `24:00` is the end of the day —
 * the admin panel lets a store close "at 24:00", and reading that as malformed
 * used to mark the whole day closed.
 */
const toCloseMinutes = (hhmm?: string | null): number | null => {
  if (typeof hhmm === 'string' && /^24:00$/.test(hhmm.trim())) return DAY;
  return toMinutes(hhmm);
};

/** Berlin weekday index (0 = Sunday) and minutes since midnight for an instant. */
function berlinClock(at: Date): { dayIndex: number; minutes: number } {
  const { dayIndex, minutes } = berlinClockAt(at);
  return { dayIndex, minutes };
}

/**
 * One opening window, in minutes from its day's midnight.
 *
 * `end` runs past 1440 when the window closes after midnight (`overnight`), so
 * `[open, end)` is always one continuous stretch.
 */
export type OpeningWindow = { open: number; close: number; end: number; overnight: boolean };

/**
 * `open === close` is what an unset window looks like on the timings document
 * — every field defaults to `00:00` — so it reads as no window rather than as
 * a zero-length one that some comparison might let through.
 */
function windowOf(open?: string | null, close?: string | null): OpeningWindow | null {
  const o = toMinutes(open);
  const c = toCloseMinutes(close);
  if (o === null || c === null || o === c) return null;
  const overnight = c < o;
  return { open: o, close: c, end: overnight ? c + DAY : c, overnight };
}

/**
 * The opening windows of one weekday, earliest first: none when the store is
 * shut that day (no hours, or ticked `closed`), one for an ordinary day, two
 * for a split day. Either window may run past midnight.
 */
export function windowsFor(timings: WeeklyHours, dayIndex: number): OpeningWindow[] {
  const day = timings?.[dayKeyOf(dayIndex)];
  if (!day || day.closed) return [];
  const out: OpeningWindow[] = [];
  const first = windowOf(day.open, day.close);
  if (first) out.push(first);
  const second = windowOf(day.open2, day.close2);
  if (second) out.push(second);
  return out.sort((a, b) => a.open - b.open);
}

/** The first opening window of a weekday, or null. Prefer `windowsFor`: a split day has two. */
export function windowFor(timings: WeeklyHours, dayIndex: number): OpeningWindow | null {
  return windowsFor(timings, dayIndex)[0] ?? null;
}

/**
 * The window that contains a Berlin weekday and time, and the weekday it
 * opened on — yesterday's when an overnight window is still running.
 */
function activeWindowAt(timings: WeeklyHours, dayIndex: number, minutes: number): { window: OpeningWindow; openedOn: number } | null {
  if (!timings) return null;

  for (const w of windowsFor(timings, dayIndex)) {
    if (minutes >= w.open && minutes < w.end) return { window: w, openedOn: dayIndex };
  }

  // Still inside a window that opened yesterday and runs past midnight.
  for (const w of windowsFor(timings, dayIndex - 1)) {
    if (w.overnight && minutes < w.close) return { window: w, openedOn: dayIndex - 1 };
  }

  return null;
}

/**
 * Open at a given Berlin weekday and time of day?
 *
 * Split out from `isOpenAt` so a pre-order slot — which is a date and a time,
 * not an instant — can be checked against the same rule.
 */
export function isOpenAtBerlinClock(timings: WeeklyHours, dayIndex: number, minutes: number): boolean {
  return !!activeWindowAt(timings, dayIndex, minutes);
}

/** Open at `at` (default: now), judged in Berlin time. */
export function isOpenAt(timings: WeeklyHours, at: Date = new Date()): boolean {
  const { dayIndex, minutes } = berlinClock(at);
  return isOpenAtBerlinClock(timings, dayIndex, minutes);
}

const isRestaurantOpen = (timings: WeeklyHours) => isOpenAt(timings);

const fmt = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
const fmtClose = (mins: number) => (mins === DAY ? '24:00' : fmt(mins));

/**
 * The opening window running at `at`, as the header prints it, or null when
 * the store is closed then.
 *
 * After midnight this is the window that opened the evening before — at 01:00
 * on a Saturday a night store is open "until 05:30" from Friday's hours, not
 * "until 04:00" from Saturday's, and not "until 00:00" when Saturday has none.
 * On a split day it is the window the clock is in: "until 15:00" at lunch,
 * "until 22:00" at dinner.
 */
export function getActiveWindow(timings: WeeklyHours, at: Date = new Date()): { open: string; close: string } | null {
  const { dayIndex, minutes } = berlinClock(at);
  const active = activeWindowAt(timings, dayIndex, minutes);
  if (!active) return null;
  const { open, close } = active.window;
  return { open: fmt(open), close: fmtClose(close) };
}

/**
 * The window the header prints next to "Open until".
 *
 * The running window when the store is open — which after midnight is
 * yesterday's — and otherwise today's first window. Falls back to
 * `00:00`/`00:00`, which the callers render as closed (also for a day ticked
 * closed).
 */
function getTodayTimings(timings: WeeklyHours, at: Date = new Date()): { open: string; close: string } {
  if (!timings) return { open: '00:00', close: '00:00' };
  const active = getActiveWindow(timings, at);
  if (active) return active;
  const { dayIndex } = berlinClock(at);
  const first = windowsFor(timings, dayIndex)[0];
  return first ? { open: fmt(first.open), close: fmtClose(first.close) } : { open: '00:00', close: '00:00' };
}

/**
 * When the store next opens, strictly after `at` (epoch ms), or null when it
 * never does (every day shut). Looks a week and a day ahead, which covers a
 * window that opens on one weekday only. Same rule as the server's
 * `nextOpeningAt`. A wall time that does not exist (the hour skipped in March)
 * is passed over.
 */
export function nextOpeningAt(timings: WeeklyHours, at: Date | number = Date.now()): number | null {
  if (!timings) return null;
  const now = typeof at === 'number' ? at : at.getTime();
  const today = berlinClockAt(now).date;
  for (let offset = 0; offset <= 8; offset += 1) {
    const date = addDays(today, offset);
    for (const w of windowsFor(timings, weekdayOfDate(date))) {
      const opens = berlinInstant(date, minutesToHHMM(w.open));
      if (opens !== null && opens > now) return opens;
    }
  }
  return null;
}

/**
 * A weekday's hours as text — "11:30 – 15:00, 17:30 – 22:00" — or null when
 * the store is shut that day.
 */
export function dayHoursText(timings: WeeklyHours, dayIndex: number): string | null {
  const windows = windowsFor(timings, dayIndex);
  if (!windows.length) return null;
  return windows.map((w) => `${fmt(w.open)} – ${fmtClose(w.close)}`).join(', ');
}

/**
 * Is a pre-order slot inside the opening hours?
 *
 * `date` is the Berlin calendar date (`YYYY-MM-DD`) and `time` is `HH:MM`, as
 * `PreorderSlot` carries them. A 01:00 slot on a Saturday is inside Friday's
 * `23:00 – 05:30`, so the previous day's overnight window counts.
 */
export function isSlotWithinOpeningHours(timings: WeeklyHours, date: string, time: string): boolean {
  if (!isIsoDate(date) || !isHHMM(time)) return false;
  const minutes = hhmmToMinutes(time);
  return isOpenAtBerlinClock(timings, weekdayOfDate(date), minutes);
}

export { getTodayTimings, isRestaurantOpen };

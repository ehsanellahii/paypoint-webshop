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

const TZ = 'Europe/Berlin';

/** Index order of `Date#getDay` and of the keys on the timings document. */
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export type DayHours = { open?: string | null; close?: string | null };
export type WeeklyHours = { [day: string]: DayHours | undefined } | null | undefined;

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

/** Berlin weekday index (0 = Sunday) and minutes since midnight for an instant. */
function berlinClock(at: Date): { dayIndex: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(at);

  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

  const dayIndex = DAY_KEYS.indexOf(part('weekday').toLowerCase() as (typeof DAY_KEYS)[number]);
  // Some engines format midnight as "24" under hour12: false.
  const hour = Number(part('hour')) % 24;
  const minute = Number(part('minute'));

  return { dayIndex: dayIndex < 0 ? 0 : dayIndex, minutes: hour * 60 + minute };
}

type Window = { open: number; close: number; overnight: boolean };

/**
 * The opening window for one weekday, or null when the store is shut that day.
 *
 * `open === close` is what an unset day looks like on the timings document —
 * every field defaults to `00:00` — so it reads as closed rather than as a
 * zero-length window that some comparison might let through.
 */
function windowFor(timings: WeeklyHours, dayIndex: number): Window | null {
  const day = timings?.[DAY_KEYS[((dayIndex % 7) + 7) % 7]];
  const open = toMinutes(day?.open);
  const close = toMinutes(day?.close);
  if (open === null || close === null || open === close) return null;
  return { open, close, overnight: close < open };
}

/**
 * Open at a given Berlin weekday and time of day?
 *
 * Split out from `isOpenAt` so a pre-order slot — which is a weekday and a
 * time, not an instant — can be checked against the same rule.
 */
export function isOpenAtBerlinClock(timings: WeeklyHours, dayIndex: number, minutes: number): boolean {
  if (!timings) return false;

  const today = windowFor(timings, dayIndex);
  if (today) {
    if (today.overnight ? minutes >= today.open : minutes >= today.open && minutes < today.close) return true;
  }

  // Still inside the window that opened yesterday and runs past midnight.
  const yesterday = windowFor(timings, dayIndex - 1);
  if (yesterday?.overnight && minutes < yesterday.close) return true;

  return false;
}

/** Open at `at` (default: now), judged in Berlin time. */
export function isOpenAt(timings: WeeklyHours, at: Date = new Date()): boolean {
  const { dayIndex, minutes } = berlinClock(at);
  return isOpenAtBerlinClock(timings, dayIndex, minutes);
}

const isRestaurantOpen = (timings: WeeklyHours) => isOpenAt(timings);

/**
 * Today's window as the header prints it. Falls back to `00:00`/`00:00`, which
 * the callers render as closed.
 */
function getTodayTimings(timings: WeeklyHours): { open: string; close: string } {
  if (!timings) return { open: '00:00', close: '00:00' };
  const { dayIndex } = berlinClock(new Date());
  const today = timings[DAY_KEYS[dayIndex]];
  return today?.open && today?.close ? { open: today.open, close: today.close } : { open: '00:00', close: '00:00' };
}

/**
 * Is a pre-order slot inside the opening hours of the day it falls on?
 *
 * `dayOffset` is days from today and `time` is `HH:MM`, exactly as
 * `PreorderSlot` carries them — the slot is stored in session storage and can
 * outlive the hours it was picked under, so checkout re-checks it.
 */
export function isSlotWithinOpeningHours(timings: WeeklyHours, dayOffset: number, time: string): boolean {
  const minutes = toMinutes(time);
  if (minutes === null) return false;
  const { dayIndex } = berlinClock(new Date());
  return isOpenAtBerlinClock(timings, dayIndex + dayOffset, minutes);
}

export { getTodayTimings, isRestaurantOpen };

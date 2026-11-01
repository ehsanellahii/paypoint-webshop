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

import { addDays, berlinClockAt, berlinInstant, dayKeyOf, daysBetween, hhmmToMinutes, isHHMM, isIsoDate, minutesToHHMM, weekdayOfDate } from './berlinTime';
import type { Translations } from './i18n';
import type { IStoreInfo } from './types';

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

/**
 * When a closed store opens next, judged in Berlin time.
 *
 * `dayOffset` is 0 for later today, 1 for tomorrow and so on, up to 7 (the
 * same weekday next week, when that is the only open day and today's window
 * has already passed). Null while the store is open, and when no day of the
 * week has opening hours at all.
 *
 * Built on `nextOpeningAt`, so it reads every window of a day: between the
 * lunch and dinner window of a split day it names today's dinner opening (not
 * tomorrow's lunch), and a day ticked `closed` is skipped.
 */
export function nextOpening(timings: WeeklyHours, at: Date = new Date()): { dayOffset: number; dayIndex: number; time: string } | null {
  if (!timings) return null;
  const { dayIndex, minutes } = berlinClock(at);
  if (activeWindowAt(timings, dayIndex, minutes)) return null;
  const opens = nextOpeningAt(timings, at);
  if (opens === null) return null;
  const then = berlinClockAt(opens);
  return { dayOffset: daysBetween(berlinClockAt(at).date, then.date), dayIndex: then.dayIndex, time: minutesToHHMM(then.minutes) };
}

/** Translation keys of the weekdays, Sunday first like the timings' day index. */
export const WEEKDAY_KEYS = ['weekdaySunday', 'weekdayMonday', 'weekdayTuesday', 'weekdayWednesday', 'weekdayThursday', 'weekdayFriday', 'weekdaySaturday'] as const;

/** The slice of the translations `nextOpeningLabel` reads. */
type OpeningLabels = Pick<
  Translations,
  'opensTodayAt' | 'opensTomorrowAt' | 'opensOnDayAt' | 'deliveryOpensTodayAt' | 'deliveryOpensTomorrowAt' | 'deliveryOpensOnDayAt' | (typeof WEEKDAY_KEYS)[number]
>;

/**
 * "Öffnet heute um 23:00" / "Öffnet morgen um 11:00" / "Öffnet Montag um 11:00"
 * for a closed store, or null when it is open or has no hours set.
 *
 * Shared by the closed menu header and the mobile restaurant-info sheet, so the
 * two cannot name different times.
 *
 * With `orderType` it is the hours of that order type (`scheduleFor`). A store
 * with its own delivery hours then says when *delivery* starts — "Lieferung
 * heute ab 14:00" — rather than when the doors open for pickup.
 */
export function nextOpeningLabel(storeInfo: ScheduleSource, t: OpeningLabels, at: Date = new Date(), orderType?: string | null): string | null {
  const next = nextOpening(scheduleFor(storeInfo, orderType), at);
  if (!next) return null;
  const delivery = orderType === 'delivery' && hasDeliveryHours(storeInfo);
  if (next.dayOffset === 0) return (delivery ? t.deliveryOpensTodayAt : t.opensTodayAt).replace('{time}', next.time);
  if (next.dayOffset === 1) return (delivery ? t.deliveryOpensTomorrowAt : t.opensTomorrowAt).replace('{time}', next.time);
  return (delivery ? t.deliveryOpensOnDayAt : t.opensOnDayAt).replace('{day}', t[WEEKDAY_KEYS[next.dayIndex]]).replace('{time}', next.time);
}

/* ------------------------------------------------------------------------ */
/*  Separate delivery hours (1 Nov 2026)                                     */
/* ------------------------------------------------------------------------ */

/**
 * What the schedule helpers read off the store: the normal hours, and the
 * delivery hours when the store has set its own (server 0052 sends
 * `deliveryTimings`, null while switched off — and an older server none).
 */
export type ScheduleSource =
  | {
      timings?: WeeklyHours | IStoreInfo['timings'];
      deliveryTimings?: WeeklyHours | IStoreInfo['deliveryTimings'];
    }
  | null
  | undefined;

/** The store has delivery hours of its own, apart from its opening hours. */
export function hasDeliveryHours(storeInfo: ScheduleSource): boolean {
  return !!storeInfo?.deliveryTimings;
}

/**
 * The hours that apply to an order type.
 *
 * Delivery uses the store's delivery hours when it has set them, otherwise the
 * normal hours; pickup and dine-in always use the normal hours. A store
 * without delivery hours therefore gets exactly the hours it got before.
 *
 * The one place this choice is made — the open badge, "Geöffnet bis", the next
 * opening, the pre-order slots, the checkout button and the cart all read
 * their hours through it, so no two of them can disagree. The server makes
 * the same choice when it accepts or refuses the order
 * (`storeOpeningHours.ts assertStoreAcceptsOrder`).
 */
export function scheduleFor(storeInfo: ScheduleSource, orderType?: string | null): WeeklyHours {
  const normal = (storeInfo?.timings ?? null) as WeeklyHours;
  if (orderType === 'delivery' && storeInfo?.deliveryTimings) return storeInfo.deliveryTimings as WeeklyHours;
  return normal;
}

/**
 * Where ordering stands for the selected order type at `at`.
 *
 *  - `open`: the hours of this order type are running; `close` is what the
 *    header prints after "Geöffnet bis".
 *  - `deliveryLater`: delivery is chosen and its own hours have not started
 *    (or are over for today) while the restaurant is open for pickup. Not
 *    "closed" — the guest can switch to pickup or pre-order a delivery.
 *    `deliveryOpensAt` is today's delivery start ("14:00"), or null when no
 *    delivery is left today.
 *  - `closed`: nothing is open for this order type.
 *
 * A store without delivery hours is only ever `open` or `closed`, by its
 * normal hours, exactly as before.
 */
export type OrderingStatus = { state: 'open'; close: string } | { state: 'deliveryLater'; deliveryOpensAt: string | null } | { state: 'closed' };

export function orderingStatus(storeInfo: ScheduleSource, orderType?: string | null, at: Date = new Date()): OrderingStatus {
  const schedule = scheduleFor(storeInfo, orderType);
  if (isOpenAt(schedule, at)) return { state: 'open', close: getTodayTimings(schedule, at).close };
  if (orderType === 'delivery' && hasDeliveryHours(storeInfo) && isOpenAt(storeInfo?.timings as WeeklyHours, at)) {
    return { state: 'deliveryLater', deliveryOpensAt: deliveryStartLaterToday(storeInfo, at) };
  }
  return { state: 'closed' };
}

/**
 * Today's delivery start, `HH:MM`, when delivery opens later on today's
 * Berlin date — or null when it does not open again today (or the store has
 * no delivery hours). Same answer as the server's `data.deliveryOpensAt` on a
 * `DELIVERY_CLOSED_NOW` refusal.
 */
export function deliveryStartLaterToday(storeInfo: ScheduleSource, at: Date = new Date()): string | null {
  if (!hasDeliveryHours(storeInfo)) return null;
  const next = nextOpening(storeInfo?.deliveryTimings as WeeklyHours, at);
  return next && next.dayOffset === 0 ? next.time : null;
}

/**
 * The first half of the "delivery later" line: "Lieferung ab 14:00", or
 * "Lieferung heute nicht mehr möglich" when no delivery is left today.
 */
export function deliveryLaterLabel(opensAt: string | null, t: Pick<Translations, 'deliveryFromTime' | 'deliveryNoMoreToday'>): string {
  return opensAt ? t.deliveryFromTime.replace('{time}', opensAt) : t.deliveryNoMoreToday;
}

export { getTodayTimings, isRestaurantOpen };

type DayHours = { open: string; close: string };
type WeeklyHours = {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
};
const BERLIN_TZ = 'Europe/Berlin';

function getBerlinNow(): Date {
  // Convert "now" to Berlin time safely
  const now = new Date();
  return new Date(
    new Intl.DateTimeFormat('en-US', {
      timeZone: BERLIN_TZ,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(now)
  );
}

function minutesSinceMidnightBerlin(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function parseHHMM(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

function ceilToInterval(mins: number, interval: number) {
  return Math.ceil(mins / interval) * interval;
}

function mmToHHMM(mins: number) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/**
 * Returns time slots for "today", starting after now, inside today's opening window.
 * Handles overnight (close < open) by treating close as next day.
 */

export function generateTimeSlots({
  weeklyHours,
  intervalMinutes = 15,
  maxSlots = 16,
  asapLabel,
  minLeadMinutes = 60, // ✅ first slot must be at least +1 hour
}: {
  weeklyHours?: WeeklyHours | null;
  intervalMinutes?: number;
  maxSlots?: number;
  asapLabel?: string;
  minLeadMinutes?: number;
}) {
  if (!weeklyHours) return asapLabel ? [asapLabel] : [];

  const nowBerlin = getBerlinNow();
  const dayKey = DAY_KEYS[nowBerlin.getDay()];
  const today = weeklyHours[dayKey];

  if (!today?.open || !today?.close) {
    return asapLabel ? [asapLabel] : [];
  }

  const open = parseHHMM(today.open);
  const close = parseHHMM(today.close);

  const openMins = open.h * 60 + open.m;
  let closeMins = close.h * 60 + close.m;

  // Overnight support (e.g. 18:00 → 02:00)
  const overnight = closeMins <= openMins;
  if (overnight) closeMins += 24 * 60;

  const nowMinsRaw = minutesSinceMidnightBerlin(nowBerlin);
  const nowMins = overnight && nowMinsRaw < openMins ? nowMinsRaw + 24 * 60 : nowMinsRaw;

  // ✅ Apply min lead time (e.g. +60 mins)
  const earliestAllowed = nowMins + minLeadMinutes;

  // Start time = next interval after earliestAllowed, and not before open
  const start = Math.max(ceilToInterval(earliestAllowed, intervalMinutes), openMins);

  // If no valid times left today
  if (start > closeMins) {
    return asapLabel ? [asapLabel] : [];
  }

  const slots: string[] = [];
  if (asapLabel) slots.push(asapLabel);

  for (let t = start; t <= closeMins; t += intervalMinutes) {
    slots.push(mmToHHMM(t));
    if (slots.length >= maxSlots + (asapLabel ? 1 : 0)) break;
  }

  return slots;
}


/**
 * Bookable slots for one day, `dayOffset` days from today.
 *
 * The rules, and why:
 *  - Today starts at the next interval after now plus a lead time — you cannot
 *    pre-order for five minutes ago, and the kitchen needs notice.
 *  - Any other day runs its own opening window, because a Friday's hours say
 *    nothing about a Sunday's.
 *  - A window that closes past midnight (18:00 → 03:00) stops at midnight here.
 *    Those small hours belong to the following date, and offering "02:00" under
 *    today's heading books an order a day earlier than the customer means.
 */
export function generateDaySlots({
  weeklyHours,
  dayOffset,
  intervalMinutes = 30,
  minLeadMinutes = 30,
}: {
  weeklyHours?: WeeklyHours | null;
  dayOffset: number;
  intervalMinutes?: number;
  minLeadMinutes?: number;
}): string[] {
  if (!weeklyHours) return [];

  const now = getBerlinNow();
  const target = new Date(now);
  target.setDate(target.getDate() + dayOffset);

  const hours = weeklyHours[DAY_KEYS[target.getDay()]];
  if (!hours?.open || !hours?.close) return [];

  const open = parseHHMM(hours.open);
  const close = parseHHMM(hours.close);
  const openMins = open.h * 60 + open.m;
  const closeMins = close.h * 60 + close.m;

  const MIDNIGHT = 24 * 60;
  // Closing at or before opening means it runs past midnight; stop at the day's end.
  const endMins = closeMins <= openMins ? MIDNIGHT : closeMins;

  let start = openMins;
  if (dayOffset === 0) {
    const nowMins = minutesSinceMidnightBerlin(now);
    start = Math.max(openMins, ceilToInterval(nowMins + minLeadMinutes, intervalMinutes));
  }

  const slots: string[] = [];
  for (let m = start; m <= endMins - intervalMinutes; m += intervalMinutes) slots.push(mmToHHMM(m));
  return slots;
}

import { berlinClockAt, berlinInstant, daysBetween, isHHMM, isIsoDate } from './berlinTime';
import { isSlotWithinOpeningHours, type WeeklyHours } from './restaurantTimings';

/**
 * A confirmed pre-order slot: a Berlin calendar date and a Berlin wall-clock
 * time.
 *
 * The date is absolute on purpose. This used to store `dayOffset` (days from
 * "today") and convert it when the order was placed — so a slot picked before
 * midnight and ordered after it moved a day later.
 */
export type PreorderSlot = {
  /** Berlin calendar date, `YYYY-MM-DD`. */
  date: string;
  /** Berlin wall clock, `HH:MM`. */
  time: string;
  /**
   * For display only ("Heute 18:00"). Written when picked and rebuilt from
   * `date` on read, because "today" stops being true at midnight.
   */
  label: string;
};

/**
 * The server refuses a scheduled time before now + 5 minutes (Europe/Berlin)
 * with `PREORDER_IN_PAST`, so the shop applies the same line before sending.
 */
export const PREORDER_MIN_LEAD_MINUTES = 5;

/** The pickers offer times at least this far ahead, so the kitchen has notice. */
export const PREORDER_PICKER_LEAD_MINUTES = 30;

/**
 * A pre-order slot chosen on the menu has to survive the navigation to the
 * checkout route, so it's persisted per store rather than held in React state.
 */
const key = (slug: string) => `pos-preorder:${slug || 'default'}`;

/**
 * The storage key itself, for readers that subscribe to the slot rather than
 * fetch it — `useOrderingWindow` needs the raw string, not a fresh object.
 */
export const preorderSlotKey = key;

/** Fired on the window when a slot is saved or cleared in this tab. */
export const PREORDER_SLOT_EVENT = 'pos-preorder-change';

/**
 * The stored string as a slot, or null.
 *
 * Slots saved before 1 Nov 2026 carry `dayOffset` instead of a date. The day
 * they were counted from was never stored, so they cannot be converted
 * without guessing the date — they read as no slot at all.
 */
export function parsePreorderSlot(raw: string | null | undefined): PreorderSlot | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<PreorderSlot> | null;
    if (!v || !isIsoDate(v.date) || !isHHMM(v.time)) return null;
    return { date: v.date, time: v.time, label: typeof v.label === 'string' ? v.label : `${v.date} ${v.time}` };
  } catch {
    return null;
  }
}

function notify() {
  try {
    window.dispatchEvent(new Event(PREORDER_SLOT_EVENT));
  } catch {
    /* non-critical */
  }
}

export function savePreorderSlot(slug: string, slot: PreorderSlot | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!slot) sessionStorage.removeItem(key(slug));
    else sessionStorage.setItem(key(slug), JSON.stringify({ date: slot.date, time: slot.time, label: slot.label }));
  } catch {
    /* non-critical */
  }
  notify();
}

export function getPreorderSlot(slug: string): PreorderSlot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key(slug));
    const slot = parsePreorderSlot(raw);
    // An old or damaged entry is dropped rather than read on every visit.
    if (raw && !slot) sessionStorage.removeItem(key(slug));
    return slot;
  } catch {
    return null;
  }
}

export function clearPreorderSlot(slug: string) {
  savePreorderSlot(slug, null);
}

/** Subscribe to slot changes: this tab's saves and other tabs' storage events. */
export function subscribePreorderSlot(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(PREORDER_SLOT_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(PREORDER_SLOT_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** The instant the slot starts, or null when its wall time does not exist. */
export function slotInstant(slot: Pick<PreorderSlot, 'date' | 'time'>): number | null {
  return berlinInstant(slot.date, slot.time);
}

export type SlotCheck = 'ok' | 'past' | 'closed' | 'invalid';

/**
 * Can this slot still be ordered?
 *
 * `past` once it is less than five minutes away (the server's own line),
 * `closed` when it falls outside the opening hours of the date it is on.
 */
export function checkPreorderSlot(timings: WeeklyHours, slot: Pick<PreorderSlot, 'date' | 'time'> | null | undefined, now: number = Date.now()): SlotCheck {
  if (!slot || !isIsoDate(slot.date) || !isHHMM(slot.time)) return 'invalid';
  const at = slotInstant(slot);
  if (at === null) return 'invalid';
  if (at < now + PREORDER_MIN_LEAD_MINUTES * 60_000) return 'past';
  if (!isSlotWithinOpeningHours(timings, slot.date, slot.time)) return 'closed';
  return 'ok';
}

export const isPreorderSlotBookable = (timings: WeeklyHours, slot: Pick<PreorderSlot, 'date' | 'time'> | null | undefined, now?: number) =>
  checkPreorderSlot(timings, slot, now) === 'ok';

type DayWords = { today?: string; tomorrow?: string };

/**
 * "Heute", "Morgen" or the weekday for a Berlin date, counted from Berlin
 * today — never from the device's own calendar.
 */
export function formatSlotDay(date: string, words: DayWords, language: string, now: number = Date.now()): string {
  const diff = daysBetween(berlinClockAt(now).date, date);
  if (diff === 0) return words.today ?? 'Today';
  if (diff === 1) return words.tomorrow ?? 'Tomorrow';
  const [y, mo, d] = date.split('-').map(Number);
  // Noon UTC is the same calendar day in every zone the formatter could use.
  return new Date(Date.UTC(y, mo - 1, d, 12)).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', { weekday: 'long', timeZone: 'UTC' });
}

/** "Heute 18:00" — the label the menu and checkout print for a slot. */
export function formatSlotLabel(slot: Pick<PreorderSlot, 'date' | 'time'>, words: DayWords, language: string, now?: number): string {
  return `${formatSlotDay(slot.date, words, language, now)} ${slot.time}`;
}

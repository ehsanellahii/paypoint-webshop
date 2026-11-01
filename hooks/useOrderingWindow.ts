'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { useStore } from '~/contexts/store-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { checkPreorderSlot, clearPreorderSlot, parsePreorderSlot, preorderSlotKey, subscribePreorderSlot, type PreorderSlot } from '~/lib/preorderSlot';
import { isRestaurantOpen } from '~/lib/restaurantTimings';

/**
 * Can the shop take this basket right now?
 *
 * One answer for the cart bar, the cart sheet and the checkout button, so the
 * three cannot disagree about whether the kitchen is there. The server asks the
 * same question of the same opening hours and refuses the order outright — this
 * is what keeps a customer from reaching that refusal.
 *
 * The rule (review fixes, 01.11.2026): ordering is closed only when the store
 * is closed now **and** there is no valid future pre-order slot. A slot is
 * valid when it is at least five minutes away (the server's own line) and
 * inside the opening hours of its date.
 *
 * A slot that has passed is dropped here, automatically, wherever this hook is
 * mounted. With the store open the order then simply becomes "as soon as
 * possible" — which the checkout shows before anything is placed — and with
 * the store closed the shop shows its closed state with the pre-order option.
 * It used to count as "closed", so an open store said "Zurzeit geschlossen"
 * and the mobile cart could not be left. A past time is never sent.
 */
export function useOrderingWindow() {
  const storeInfo = useStore();
  const { slug } = useStoreNavigation();

  /*
   * A slow tick, so the answer is judged against the current time rather than
   * the time the page happened to be opened. A cart left sitting on screen used
   * to keep offering its button long after the kitchen had shut.
   */
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  /*
   * Session storage is client-only, so it is subscribed to rather than read
   * during render: the server has no slot, and reading one straight out of
   * `sessionStorage` while rendering would make the server's HTML and the first
   * client render disagree. `useSyncExternalStore` renders the server's answer,
   * then re-reads on the client once hydration is done.
   *
   * The raw string is the snapshot, not the parsed slot: `getSnapshot` has to
   * return the same value for the same state, and `JSON.parse` hands back a new
   * object every call.
   *
   * Saving a slot fires an event (see `savePreorderSlot`), so the cart bar on
   * the same page follows a slot picked in the menu's pre-order modal at once
   * instead of on the next tick.
   */
  const subscribe = useCallback((onChange: () => void) => subscribePreorderSlot(onChange), []);
  const readSlotRaw = useCallback(() => {
    try {
      return sessionStorage.getItem(preorderSlotKey(slug));
    } catch {
      return null;
    }
  }, [slug]);
  const slotRaw = useSyncExternalStore(subscribe, readSlotRaw, () => null);

  // A slot saved in the old `dayOffset` shape parses to null: no slot.
  const stored = useMemo<PreorderSlot | null>(() => parsePreorderSlot(slotRaw), [slotRaw]);

  // Judged on every render (the tick above re-renders), never cached.
  const check = stored ? checkPreorderSlot(storeInfo?.timings, stored) : null;
  const stale = check === 'past' || check === 'invalid';

  // A passed slot is dropped for good, so no screen can send it.
  useEffect(() => {
    if (stale) clearPreorderSlot(slug);
  }, [stale, slug]);

  const storeClosed = !isRestaurantOpen(storeInfo?.timings);
  const slotValid = check === 'ok';

  return {
    /** The shop's own state, regardless of what is in the basket. */
    storeClosed,
    /**
     * The chosen pre-order slot — never a passed one (that reads as no slot
     * and is being dropped). May still be outside the hours: see `slotOutsideHours`.
     */
    slot: stale ? null : stored,
    /** A valid future pre-order slot is chosen, so "closed right now" does not apply. */
    hasPreorderSlot: slotValid,
    /** The chosen slot is in the future but outside the opening hours of its date (hours changed since). */
    slotOutsideHours: check === 'closed',
    /** Nothing can be ordered: no kitchen now, and no valid slot to cook for. */
    orderingClosed: storeClosed && !slotValid,
  };
}

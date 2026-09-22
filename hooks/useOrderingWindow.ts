'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { useStore } from '~/contexts/store-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { preorderSlotKey } from '~/lib/preorderSlot';
import { isRestaurantOpen, isSlotWithinOpeningHours } from '~/lib/restaurantTimings';
import type { PreorderSlot } from '~/components/menu/PreorderModal';

/**
 * Can the shop take this basket right now?
 *
 * One answer for the cart bar, the cart sheet and the checkout button, so the
 * three cannot disagree about whether the kitchen is there. The server asks the
 * same question of the same opening hours and refuses the order outright — this
 * is what keeps a customer from reaching that refusal.
 *
 * A pre-order is the exception. It is for a slot, not for now, so a closed shop
 * still accepts one as long as the slot falls inside that day's window. The
 * slot is kept in session storage and can outlive the hours it was picked
 * under, so it is re-checked here rather than trusted.
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
   * Nothing notifies: a slot is picked on the menu and this screen is mounted
   * fresh on the way out of it, so there is no same-tab write to react to.
   */
  const subscribe = useCallback(() => () => {}, []);
  const readSlotRaw = useCallback(() => {
    try {
      return sessionStorage.getItem(preorderSlotKey(slug));
    } catch {
      return null;
    }
  }, [slug]);
  const slotRaw = useSyncExternalStore(subscribe, readSlotRaw, () => null);

  const slot = useMemo<PreorderSlot | null>(() => {
    if (!slotRaw) return null;
    try {
      return JSON.parse(slotRaw) as PreorderSlot;
    } catch {
      return null;
    }
  }, [slotRaw]);

  const storeClosed = !isRestaurantOpen(storeInfo?.timings);
  const hasSlot = !!slot;
  const slotOutsideHours = hasSlot && !isSlotWithinOpeningHours(storeInfo?.timings, slot!.dayOffset, slot!.time);

  return {
    /** The shop's own state, regardless of what is in the basket. */
    storeClosed,
    /** A pre-order slot is chosen, so "closed right now" does not apply. */
    hasPreorderSlot: hasSlot,
    /** The chosen slot has fallen outside the opening hours since it was picked. */
    slotOutsideHours,
    /** Nothing can be ordered: no kitchen now, and no valid slot to cook for. */
    orderingClosed: slotOutsideHours || (storeClosed && !hasSlot),
  };
}

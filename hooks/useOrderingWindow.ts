'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { useAddress } from '~/contexts/address-context';
import { useStore } from '~/contexts/store-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { checkPreorderSlot, clearPreorderSlot, parsePreorderSlot, preorderSlotKey, subscribePreorderSlot, type PreorderSlot } from '~/lib/preorderSlot';
import { hasDeliveryHours, orderingStatus, scheduleFor } from '~/lib/restaurantTimings';

/**
 * Can the shop take this basket right now?
 *
 * One answer for the cart bar, the cart sheet and the checkout button, so the
 * three cannot disagree about whether the kitchen is there. The server asks the
 * same question of the same opening hours and refuses the order outright — this
 * is what keeps a customer from reaching that refusal.
 *
 * "The opening hours" are those of the order type the guest has selected
 * (`scheduleFor`): a delivery is judged by the store's delivery hours when it
 * has set its own, pickup and dine-in by the normal hours. Without delivery
 * hours both are the normal hours, exactly as before (1 Nov 2026).
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
  const { orderType } = useAddress();

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

  // The hours of the selected order type — delivery hours for a delivery when the store has them.
  const schedule = scheduleFor(storeInfo, orderType);

  // Judged on every render (the tick above re-renders), never cached.
  const check = stored ? checkPreorderSlot(schedule, stored) : null;
  const stale = check === 'past' || check === 'invalid';

  const status = orderingStatus(storeInfo, orderType);
  const storeClosed = status.state !== 'open';
  const slotValid = check === 'ok';

  // A passed slot is dropped for good, so no screen can send it. Remembered
  // first (see `passedSlots`), so a closed shop can still say why it went.
  useEffect(() => {
    if (!stale) return;
    if (check === 'past' && stored) passedSlots.set(slug, stored);
    clearPreorderSlot(slug);
  }, [stale, check, stored, slug]);

  // A new slot, or the kitchen open again: the passed one no longer matters.
  useEffect(() => {
    if ((stored && !stale) || !storeClosed) passedSlots.delete(slug);
  }, [stored, stale, storeClosed, slug]);

  /*
   * The slot passed while the shop is closed. With the shop open a passed slot
   * simply becomes "as soon as possible"; closed, there is no "now" to fall
   * back to, so the cart says the time is gone instead of only "closed".
   * Includes the render before the drop, so the cart does not flicker.
   */
  const slotPassed = storeClosed && !slotValid && (check === 'past' || passedSlots.has(slug));

  return {
    /** The shop's own state for the selected order type, regardless of what is in the basket. */
    storeClosed,
    /**
     * Delivery is selected and has not started yet (or is over for today)
     * while the restaurant is open for pickup — not "closed": the guest can
     * switch to pickup or pre-order a delivery. `opensAt` is today's delivery
     * start, or null when no delivery is left today. Null in every other case,
     * and always for a store without delivery hours.
     */
    deliveryLater: status.state === 'deliveryLater' ? { opensAt: status.deliveryOpensAt } : null,
    /** The store takes pickup orders (and this is not a table order), so "switch to pickup" can be offered. */
    pickupOffered: !storeInfo?.tableInfo?.token && (storeInfo?.settings?.orderTypes?.takeaway ?? true),
    /** The slot is judged by delivery hours of the store's own, so a slot outside them is "outside the delivery hours". */
    usesDeliveryHours: orderType === 'delivery' && hasDeliveryHours(storeInfo),
    /**
     * The chosen pre-order slot — never a passed one (that reads as no slot
     * and is being dropped). May still be outside the hours: see `slotOutsideHours`.
     */
    slot: stale ? null : stored,
    /** The check of `slot`: 'ok', 'closed' (outside the hours), or null without a slot. */
    slotCheck: stale ? null : check,
    /** A valid future pre-order slot is chosen, so "closed right now" does not apply. */
    hasPreorderSlot: slotValid,
    /** The chosen slot is in the future but outside the opening hours of its date (hours changed since). */
    slotOutsideHours: check === 'closed',
    /** A chosen slot has passed (and was dropped) while the shop is closed: a new time is needed. */
    slotPassed,
    /** Nothing can be ordered: no kitchen now, and no valid slot to cook for. */
    orderingClosed: storeClosed && !slotValid,
  };
}

/**
 * Slots this tab dropped because they had passed, per store, until a new slot
 * is chosen or the shop opens. Module-wide rather than per hook, because the
 * hook instance that drops the slot (the menu) is rarely the one that has to
 * explain it (the cart, opened later). The drop notifies every instance, so
 * they all re-render and read it.
 */
const passedSlots = new Map<string, PreorderSlot>();

/** Forget a passed slot, once the guest has chosen what to do about it. */
export function forgetPassedSlot(slug: string) {
  passedSlots.delete(slug);
}

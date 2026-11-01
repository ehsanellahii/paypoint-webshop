'use client';

import { useState } from 'react';

import { useAddress } from '~/contexts/address-context';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { forgetPassedSlot, useOrderingWindow } from '~/hooks/useOrderingWindow';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { formatSlotLabel, savePreorderSlot, type PreorderSlot } from '~/lib/preorderSlot';
import { deliveryLaterLabel, nextOpeningLabel } from '~/lib/restaurantTimings';

/**
 * What the cart's order button does about time, shared by the desktop cart and
 * the mobile cart screen so the two say the same thing.
 *
 *  - `checkout`: the kitchen is open, or a valid pre-order slot is chosen.
 *  - `preorder`: closed and no slot — the button opens the time picker
 *    instead of being a dead "closed" bar. Pre-ordering is exactly what a
 *    closed shop still takes.
 *  - `newTime`: the chosen time can no longer be ordered — it is outside the
 *    opening hours of its date, or it passed while the shop is closed. That is
 *    not "the restaurant has just closed", so the guest is told the time is
 *    gone and picks another. A time that passes while the shop is open is
 *    dropped by `useOrderingWindow` and the order simply becomes "as soon as
 *    possible" (`checkout`), as the checkout shows.
 *
 * All of it by the hours of the selected order type. A delivery that has not
 * started yet while pickup is open (a store with its own delivery hours) is
 * `preorder` too, but the notice says so — "Lieferung ab 14:00 · Abholung
 * jetzt möglich" — and `switchToPickup` offers the way out, never "closed".
 */
export function useCartTiming() {
  const { t, language } = useLanguage();
  const storeInfo = useStore();
  const { slug } = useStoreNavigation();
  const { storeClosed, slot, slotCheck, slotOutsideHours, slotPassed, orderingClosed, deliveryLater, pickupOffered, usesDeliveryHours } = useOrderingWindow();
  const { orderType, setOrderType } = useAddress();
  // Forgetting a passed slot changes no stored value, so this re-renders the cart itself.
  const [, setForgotten] = useState(0);
  const forget = () => {
    forgetPassedSlot(slug);
    setForgotten((n) => n + 1);
  };

  const action: 'checkout' | 'preorder' | 'newTime' = slotOutsideHours || slotPassed ? 'newTime' : orderingClosed ? 'preorder' : 'checkout';

  let notice = '';
  if (action === 'newTime') notice = slotOutsideHours ? (usesDeliveryHours ? t.preorderSlotOutsideDeliveryHours : t.preorderSlotClosed) : t.preorderSlotPassedPickNew;
  else if (action === 'preorder' && deliveryLater) {
    // Not "closed": the restaurant is open, only delivery has not started (or is over for today).
    notice = `${deliveryLaterLabel(deliveryLater.opensAt, t)}${pickupOffered ? ` · ${t.pickupPossibleNow}` : ''}. ${t.deliveryPreorderHint}`;
  } else if (action === 'preorder') {
    const next = nextOpeningLabel(storeInfo, t, undefined, orderType);
    notice = `${t.storeClosedNow}${next ? ` · ${next}` : ''}. ${t.storeClosedPreorderHint}`;
  }

  // A valid slot, labelled fresh — the stored label says "Heute" as of the day it was picked.
  const slotLabel = slot && slotCheck === 'ok' ? formatSlotLabel(slot, { today: t.today, tomorrow: t.tomorrow }, language) : '';

  return {
    action,
    notice,
    slotLabel,
    storeClosed,
    /**
     * Delivery has not started yet but pickup is open, and the store offers
     * pickup: switch the order to pickup. Null otherwise.
     */
    switchToPickup: action === 'preorder' && deliveryLater && pickupOffered ? () => setOrderType('pickup') : null,
    /** Keep the slot where the menu and checkout read it. */
    saveSlot: (next: PreorderSlot) => {
      forget();
      savePreorderSlot(slug, next);
    },
    /** "Standard" in the picker: order for as soon as possible. */
    clearSlot: () => {
      forget();
      savePreorderSlot(slug, null);
    },
  };
}

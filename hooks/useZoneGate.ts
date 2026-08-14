'use client';

import { useEffect, useState } from 'react';

import { useAddress } from '~/contexts/address-context';
import { useStore } from '~/contexts/store-context';
import { storage } from '~/lib/utils';

/**
 * Whether to show the delivery zone-check gate over the menu.
 *
 * Shared by both menu screens so the "show once per store" rule can't drift
 * between them: the desktop and mobile presentations of the gate itself differ,
 * the conditions for raising it do not.
 *
 * Shown when the store offers delivery, no address is chosen yet, the visit
 * isn't dine-in (a seated guest is already at the restaurant), and the gate
 * hasn't been dismissed for this store before.
 */
export function useZoneGate() {
  const storeInfo = useStore();
  const { deliveryAddress } = useAddress();
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    if (!storeInfo) return;
    const slug = storeInfo.slug || 'default';
    const deliveryAvailable = storeInfo.settings?.orderTypes?.delivery;
    const isDineIn = !!storeInfo.tableInfo?.token;
    const seen = storage.get<boolean>(`pos-intro-seen:${slug}`, false);
    // localStorage is only readable after mount, so the decision cannot be made during render.
    if (deliveryAvailable && !isDineIn && !deliveryAddress && !seen) setShowGate(true);
    // Deliberately keyed on the store alone: once dismissed, setting an address
    // must not re-evaluate and flash the gate back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeInfo]);

  const dismissGate = (dismissForever?: boolean) => {
    if (dismissForever) storage.set(`pos-intro-seen:${storeInfo?.slug || 'default'}`, true);
    setShowGate(false);
  };

  return { showGate, dismissGate };
}

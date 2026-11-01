'use client';

import { useEffect, useState } from 'react';

import { useAddress } from '~/contexts/address-context';
import { useCart } from '~/contexts/cart-context';
import { useStore } from '~/contexts/store-context';
import { loadMenu, menuCacheKey, peekMenu } from '~/lib/menuCache';
import type { IMenuData } from '~/lib/utils';

/**
 * The menu for this store, priced for the current order type.
 *
 * Shared by the desktop menu and the mobile menu and product screens, so the
 * loading rules cannot drift between them:
 *
 *  - It waits until the stored order type has been read. Fetching straight
 *    away asked for collection prices first and the stored type second, and
 *    whichever answer came back last won — delivery mode with collection
 *    prices when the first one was slower.
 *  - An answer for an order type that is no longer the current one is
 *    dropped, however late it arrives.
 *  - On a switch the menu already on screen stays there until the new one
 *    arrives, instead of the whole page turning into a skeleton.
 *  - Copies are kept for the session (`lib/menuCache.ts`), so returning to the
 *    menu or opening a product does not download the menu again.
 */
export function useMenu() {
  const storeInfo = useStore();
  const { orderType, hydrated } = useAddress();

  const adminId = storeInfo?.adminId ?? '';
  const storeId = storeInfo?.storeId ?? '';
  const apiKey = storeInfo?.apiKey ?? '';
  const key = hydrated && storeId ? menuCacheKey(storeId, orderType) : '';

  const [loaded, setLoaded] = useState<{ key: string; data: IMenuData | null; error: string | null }>({ key: '', data: null, error: null });

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    loadMenu({ adminId, storeId, apiKey, orderType })
      .then((data) => {
        if (!cancelled) setLoaded({ key, data, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error(err);
        setLoaded((prev) => ({ key, data: prev.data, error: err instanceof Error ? err.message : 'Failed to load menu data' }));
      });
    return () => {
      cancelled = true;
    };
  }, [key, adminId, storeId, apiKey, orderType]);

  const current = loaded.key === key;
  // This order type's menu: just loaded, or the session's copy of it.
  const exact = current ? loaded.data : peekMenu(key);
  // While another type's menu is still on its way, keep showing this one.
  const menuData = exact ?? loaded.data;
  const error = current ? loaded.error : null;

  /*
   * After every menu load the cart is checked against it — stale prices,
   * sold-out or removed lines (`reconcileCart`, contexts/cart-context.tsx).
   * Once, here, for both trees. `exact` is the menu for the current order
   * type only — never the one kept on screen during a switch.
   */
  const { reconcileCart } = useCart();
  useEffect(() => {
    if (exact) reconcileCart(exact);
  }, [exact, reconcileCart]);

  return {
    menuData,
    /** The menu shown is priced for the current order type (not a placeholder during a switch). */
    isCurrent: !!exact,
    loading: !menuData && !error,
    error,
  };
}

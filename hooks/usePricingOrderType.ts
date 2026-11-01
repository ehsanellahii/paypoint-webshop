'use client';

import { useAddress } from '~/contexts/address-context';
import { useStore } from '~/contexts/store-context';

/**
 * The order type the server prices by: dine-in at a table (QR), otherwise the
 * selected pickup / delivery. The menu, vouchers, recommendations and
 * favourites all ask with it, so a store that prices delivery apart shows the
 * same price everywhere (E2E follow-up, 01.11.2026).
 */
export function usePricingOrderType(): string {
  const storeInfo = useStore();
  const { orderType } = useAddress();
  return storeInfo?.tableInfo?.token ? 'dineIn' : orderType;
}

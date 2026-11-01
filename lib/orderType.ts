export type OrderType = 'pickup' | 'delivery' | 'dineIn';

export type OrderTypeRules = { takeaway?: boolean; delivery?: boolean; dineIn?: boolean } | null | undefined;

/**
 * The order type the store can actually take.
 *
 * A valid table means dine-in. Otherwise the guest's choice when the store
 * offers it, else collection, else delivery. The defaults match the menu's
 * toggle: collection is on unless switched off, delivery off unless switched
 * on. The address used to default to collection even in a delivery-only
 * store, and a stored "delivery" outlived the store switching delivery off.
 */
export function clampOrderType(preferred: OrderType, rules: OrderTypeRules, hasTable: boolean): OrderType {
  if (hasTable) return 'dineIn';
  const pickupOk = rules?.takeaway ?? true;
  const deliveryOk = rules?.delivery ?? false;
  if (preferred === 'delivery' && deliveryOk) return 'delivery';
  if (preferred === 'pickup' && pickupOk) return 'pickup';
  if (pickupOk) return 'pickup';
  if (deliveryOk) return 'delivery';
  // The store offers neither; collection is what the menu prices by default.
  return 'pickup';
}

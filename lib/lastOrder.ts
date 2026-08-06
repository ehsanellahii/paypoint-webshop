/**
 * Snapshot of the just-placed order.
 *
 * The confirmation screen is its own route, so it can't rely on React state
 * from checkout. We stash a small snapshot in sessionStorage at placement time
 * and read it back on the confirmation page — which also survives a refresh.
 */
export type PlacedOrderItem = {
  name: string;
  qty: number;
  lineTotal: number;
  image?: string;
};

export type PlacedOrder = {
  orderRef: string;
  isDelivery: boolean;
  paymentName: string;
  total: number;
  etaLo: number;
  etaHi: number;
  etaLabel?: string;
  addressLine: string;
  items: PlacedOrderItem[];
  /** Set when viewing a past order from history — drives the status display. */
  status?: string;
  placedAt: number;
};

const key = (slug: string) => `pos-last-order:${slug || 'default'}`;

export function savePlacedOrder(slug: string, order: PlacedOrder) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key(slug), JSON.stringify(order));
  } catch (error) {
    console.error('Failed to persist placed order:', error);
  }
}

export function getPlacedOrder(slug: string, orderRef?: string): PlacedOrder | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlacedOrder;
    // Guard against showing a stale order if the URL points at a different one.
    if (orderRef && parsed.orderRef && parsed.orderRef !== orderRef) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPlacedOrder(slug: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(key(slug));
  } catch {
    /* non-critical */
  }
}

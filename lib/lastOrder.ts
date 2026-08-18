import { API_BASE_URL, apiHeaders } from '~/lib/api';
import { getImageURL } from '~/lib/utils';

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
  /** The server's payment enum — screens translate it for display. */
  paymentName: string;
  total: number;
  etaLo: number;
  etaHi: number;
  etaLabel?: string;
  addressLine: string;
  items: PlacedOrderItem[];
  /** Set when viewing a past order from history — drives the status display. */
  status?: string;
  /** The payment was refunded. A full refund also cancels the order. */
  refunded?: boolean;
  amountRefunded?: number;
  placedAt: number;
};


/**
 * Load an order from the API by the reference in the URL — the collection code
 * the customer is given, or the order's own id. The confirmation screen used to
 * read this back out of sessionStorage, which meant it only worked in the
 * session that placed the order: opening one from the order list, or reloading
 * on another device, showed nothing.
 */
export async function fetchPlacedOrder(orderRef: string, apiKey: string): Promise<PlacedOrder | null> {
  if (!orderRef) return null;
  const res = await fetch(`${API_BASE_URL}/order/${encodeURIComponent(orderRef)}`, {
    headers: apiHeaders({ apiKey }),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = await res.json();
  const o = json?.data;
  if (!o) return null;

  const isDelivery = o.orderType === 'delivery';
  const eta = Number(o.deliveryTime) || (isDelivery ? 30 : 15);
  const store = [o.storeDetails?.name, o.storeDetails?.address].filter(Boolean).join(' · ');

  return {
    orderRef: o.collectionCode || String(o.orderNumber ?? ''),
    isDelivery,
    paymentName: o.paymentMethod ?? '',
    total: Number(o.totalOrderPrice) || 0,
    etaLo: eta,
    etaHi: eta + 10,
    addressLine: isDelivery ? (o.addressDetails?.address ?? '') : store,
    items: (o.items ?? []).map((it: any) => ({
      name: it.name,
      qty: it.quantity,
      lineTotal: it.totalPrice,
      image: it.image ? getImageURL(it.image) : '',
    })),
    status: o.status,
    refunded:
      o.payment?.status === 'refunded' ||
      o.payment?.status === 'partiallyRefunded',
    amountRefunded: o.payment?.amountRefunded,
    placedAt: o.orderDateTime ? new Date(o.orderDateTime).getTime() : Date.now(),
  };
}

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

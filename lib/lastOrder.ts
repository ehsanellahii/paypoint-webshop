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
  /** The order's status as the server reports it. Not what decides "past" — see `useConfirmation`. */
  status?: string;
  /** The whole payment was given back. A full refund also cancels the order. */
  refunded?: boolean;
  /** Part of the payment was given back; the order itself stands. */
  partiallyRefunded?: boolean;
  amountRefunded?: number;
  placedAt: number;
  /**
   * Set on the session snapshot once the cart was emptied for this order, so
   * opening the confirmation again (a reload, the back button) never empties a
   * basket the customer has started since.
   */
  cartCleared?: boolean;
};

/** Server payment values that are settled online, through Stripe and its webhook. */
const ONLINE_PAYMENT_VALUES = new Set(['card', 'applePay', 'googlePay', 'paypal', 'klarna', 'stripe', 'online']);

/** Paid online (a webhook confirms it) rather than at the counter, the door or the table. */
export const isOnlinePayment = (paymentName?: string | null) => ONLINE_PAYMENT_VALUES.has(String(paymentName ?? ''));


/**
 * Load an order from the API by the reference in the URL — the collection code
 * the customer is given, or the order's own id. The confirmation screen used to
 * read this back out of sessionStorage, which meant it only worked in the
 * session that placed the order: opening one from the order list, or reloading
 * on another device, showed nothing.
 */
export async function fetchPlacedOrder(orderRef: string, apiKey: string, storeId?: string): Promise<PlacedOrder | null> {
  if (!orderRef) return null;
  /*
   * Server 0051 finds only orders of the API key's restaurant. `storeId`
   * narrows it to this branch — passed only for the order this browser just
   * placed or paid for here. The order history lists the customer's orders
   * from every branch of the restaurant, and opening one from a sister branch
   * with the header answered "Bestellung nicht gefunden".
   */
  const res = await fetch(`${API_BASE_URL}/order/${encodeURIComponent(orderRef)}`, {
    headers: apiHeaders({ apiKey, storeId }),
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
    /*
     * Only a full refund turns the page into "this order was refunded". A
     * partial one (a missing drink) used to do the same, telling a customer
     * whose food was on its way that the order was cancelled.
     */
    refunded: o.payment?.status === 'refunded',
    partiallyRefunded: o.payment?.status === 'partiallyRefunded',
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
    // Only the order the URL names: a snapshot without a reference, or with
    // another one, says nothing about it.
    if (orderRef && parsed.orderRef !== orderRef) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Record that the cart was emptied for this snapshot — see `cartCleared`. */
export function markPlacedOrderCartCleared(slug: string, orderRef: string) {
  const placed = getPlacedOrder(slug, orderRef);
  if (!placed) return;
  savePlacedOrder(slug, { ...placed, cartCleared: true });
}

export function clearPlacedOrder(slug: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(key(slug));
  } catch {
    /* non-critical */
  }
}

/*
 * Orders whose return from an off-site payment (PayPal, Klarna) already
 * emptied the cart, per store. The return can land in a new tab — the PayPal
 * app opens one — where the session snapshot does not exist, so the "only
 * once" mark cannot live there; the cart itself is in localStorage, and so is
 * this. The last few are enough.
 */
const paidKey = (slug: string) => `pos-paid-cleared:${slug || 'default'}`;
const PAID_MEMORY = 20;

export function wasCartClearedForPaidOrder(slug: string, orderRef: string): boolean {
  if (typeof window === 'undefined' || !orderRef) return false;
  try {
    const list = JSON.parse(localStorage.getItem(paidKey(slug)) || '[]');
    return Array.isArray(list) && list.includes(orderRef);
  } catch {
    return false;
  }
}

export function markCartClearedForPaidOrder(slug: string, orderRef: string) {
  if (typeof window === 'undefined' || !orderRef) return;
  try {
    const raw = JSON.parse(localStorage.getItem(paidKey(slug)) || '[]');
    const list: string[] = Array.isArray(raw) ? raw.filter((x) => typeof x === 'string' && x !== orderRef) : [];
    list.push(orderRef);
    localStorage.setItem(paidKey(slug), JSON.stringify(list.slice(-PAID_MEMORY)));
  } catch {
    /* non-critical */
  }
}

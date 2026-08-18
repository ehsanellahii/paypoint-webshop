'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { useCart } from '~/contexts/cart-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { useStore } from '~/contexts/store-context';
import { fetchPlacedOrder, getPlacedOrder, type PlacedOrder } from '~/lib/lastOrder';
import { clearPreorderSlot } from '~/lib/preorderSlot';

/**
 * Everything the confirmation screens do that is not layout.
 *
 * Mobile and desktop draw this page very differently — one leads with the map,
 * the other with a receipt header — but they answer the same three questions:
 * did the payment succeed, does the order exist yet, and what should the
 * basket look like afterwards. Those answers were previously written twice and
 * had already drifted: the desktop screen fetched the order from the API and
 * the mobile one only ever read the session snapshot, so an online order
 * rendered as a blank screen on a phone.
 */

/*
 * Stripe appends these to `return_url` when a payment method takes the customer
 * off-site — PayPal and Klarna do, cards confirmed with `redirect: 'if_required'`
 * do not. `redirect_status` is the only signal we get that an off-site payment
 * was abandoned or declined, and ignoring it rendered a failed payment as a
 * confirmed order.
 */
type RedirectStatus = 'succeeded' | 'processing' | 'failed' | null;

/*
 * The order is created by Stripe's webhook, not by the browser, so arriving
 * here a moment before it lands is normal rather than exceptional. Poll for a
 * little over half a minute; past that something is genuinely wrong and the
 * customer is better served by a reference number and a phone number than by a
 * spinner that never stops.
 */
const POLL_INTERVAL_MS = 1500;
const POLL_ATTEMPTS = 20;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useConfirmation() {
  const { slug } = useStoreNavigation();
  const { clearCart } = useCart();
  const storeInfo = useStore();
  const searchParams = useSearchParams();

  const orderRef = searchParams?.get('order') || '';
  const redirectStatus = (searchParams?.get('redirect_status') as RedirectStatus) ?? null;

  /*
   * A failed off-site payment. The reservation is still on the server and the
   * basket is still in the browser, so the customer can go back and try
   * another method — nothing is cleared and no order is claimed.
   */
  const paymentFailed = redirectStatus === 'failed';
  /** Off-site payment still settling. Treated as pending, not as success. */
  const paymentProcessing = redirectStatus === 'processing';

  const [state, setState] = useState<{
    order: PlacedOrder | null;
    etaWindow: string | null;
    hydrated: boolean;
    /** True while the order exists on Stripe's side but not yet on ours. */
    waiting: boolean;
    /**
     * Polling ran out without the order ever appearing.
     *
     * Distinct from `waiting`, and the distinction matters: the snapshot on
     * screen was written *before* the customer paid, so it is a record of what
     * they tried to order, not proof that an order exists. Falling back to it
     * and calling the result accepted told a customer their food was being
     * prepared when nothing had reached the kitchen.
     */
    unresolved: boolean;
  }>({ order: null, etaWindow: null, hydrated: false, waiting: false, unresolved: false });

  /*
   * The cart is cleared exactly once, and only after the order is confirmed to
   * exist. Held in a ref because the effect can settle more than once and a
   * second clear would fight a basket the customer has started rebuilding.
   */
  const cleared = useRef(false);

  useEffect(() => {
    let cancelled = false;

    /*
     * Derived here rather than during render: it comes from the clock, and
     * reading `Date.now()` in the render path makes the displayed window drift
     * on every re-render.
     */
    const etaWindowFor = (placed: PlacedOrder | null) => {
      if (!placed || placed.etaLabel || placed.status) return null;
      const fmt = (ms: number) => {
        const d = new Date(ms);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      };
      const now = Date.now();
      return `${fmt(now + placed.etaLo * 60000)} – ${fmt(now + placed.etaHi * 60000)}`;
    };

    /*
     * sessionStorage can only be read after mount — the server cannot see it,
     * and rendering from it on the first pass would break hydration. It is a
     * first paint only; the API answer replaces it.
     */
    const snapshot = getPlacedOrder(slug, orderRef);

    // A declined off-site payment: show the snapshot as an attempt, and stop.
    if (paymentFailed) {
      setState({ order: snapshot, etaWindow: null, hydrated: true, waiting: false, unresolved: false });
      return;
    }

    setState({
      order: snapshot,
      etaWindow: etaWindowFor(snapshot),
      hydrated: !orderRef,
      waiting: false,
      unresolved: false,
    });
    if (!orderRef) return;

    const settle = (order: PlacedOrder | null, waiting: boolean, unresolved = false) => {
      if (cancelled) return;
      setState({ order, etaWindow: etaWindowFor(order), hydrated: true, waiting, unresolved });
    };

    void (async () => {
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
        const fetched = await fetchPlacedOrder(orderRef, storeInfo?.apiKey || '').catch(() => null);
        if (cancelled) return;

        if (fetched) {
          /*
           * The order exists on our side, so the payment landed and the webhook
           * ran. This is the only point at which the basket is safe to empty.
           */
          if (!cleared.current) {
            cleared.current = true;
            clearCart();
            clearPreorderSlot(slug);
          }
          settle(fetched, false);
          return;
        }

        /*
         * Nothing yet. For a cash order that means the reference is unknown and
         * waiting will not help; for an online one the webhook is simply in
         * flight, so keep the snapshot on screen and try again.
         */
        settle(snapshot, true);
        await sleep(POLL_INTERVAL_MS);
      }

      /*
       * Gave up. The order never appeared, so nothing here may claim it was
       * accepted — the customer has very likely been charged, and the honest
       * answer is that we cannot confirm it and they should call the
       * restaurant with the reference.
       */
      settle(snapshot, false, true);
    })();

    return () => {
      cancelled = true;
    };
    // `clearCart` is stable for the life of the provider; including it would
    // restart polling on every cart render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, orderRef, paymentFailed]);

  const { order, etaWindow, hydrated, waiting, unresolved } = state;

  return {
    /** Prefer the customer-facing code; the URL may carry an internal id. */
    orderRef: order?.orderRef || orderRef,
    order,
    etaWindow,
    hydrated,
    /** Order not on our side yet — the webhook is still in flight. */
    waiting: waiting || paymentProcessing,
    /**
     * We stopped waiting and it never arrived. Callers must not render a
     * receipt in this state — `order` here is the pre-payment snapshot.
     */
    unresolved,
    paymentFailed,
    /** A viewed past order carries `status`; a freshly placed one does not. */
    isPast: !!order?.status,
    /**
     * The payment was given back. A full refund also cancels the order, so the
     * receipt must not go on describing food that is coming.
     */
    refunded: !!order?.refunded,
    isDelivery: order?.isDelivery ?? false,
  };
}

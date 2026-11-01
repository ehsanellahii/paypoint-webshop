'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { useCart } from '~/contexts/cart-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { useStore } from '~/contexts/store-context';
import {
  fetchPlacedOrder,
  getPlacedOrder,
  isOnlinePayment,
  markCartClearedForPaidOrder,
  markPlacedOrderCartCleared,
  wasCartClearedForPaidOrder,
  type PlacedOrder,
} from '~/lib/lastOrder';
import { clearPreorderSlot } from '~/lib/preorderSlot';
import { clearOrderAttempt } from '~/lib/orderAttempt';

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
/*
 * A cash or card-reader order has no webhook to wait for: it exists the moment
 * the order call answered. A couple of retries cover a network blip, no more.
 */
const LOOKUP_ATTEMPTS = 3;

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
    /**
     * The order behind this reference could not be loaded, and it is not an
     * online payment we were waiting for — an unknown or foreign code, or an
     * old order the API would not return. Nothing about money is claimed.
     */
    lookupFailed: boolean;
    /** The URL names the order this browser session just placed. */
    fresh: boolean;
  }>({ order: null, etaWindow: null, hydrated: false, waiting: false, unresolved: false, lookupFailed: false, fresh: false });

  /*
   * The cart is cleared exactly once, only for the order this session just
   * placed, and only after it is confirmed to exist. Opening any other order —
   * one from the history, or a link with another restaurant's code — used to
   * empty the basket too. The snapshot remembers it was done (`cartCleared`),
   * so a reload does not do it again; the ref covers the effect settling twice.
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
      if (!placed || placed.etaLabel) return null;
      const fmt = (ms: number) => {
        const d = new Date(ms);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      };
      // From when it was placed, so a reload does not push the window later.
      const from = placed.placedAt || Date.now();
      return `${fmt(from + placed.etaLo * 60000)} – ${fmt(from + placed.etaHi * 60000)}`;
    };

    /*
     * sessionStorage can only be read after mount — the server cannot see it,
     * and rendering from it on the first pass would break hydration. It is a
     * first paint only; the API answer replaces it.
     */
    // Only the snapshot of *this* reference — see `getPlacedOrder`.
    const snapshot = orderRef ? getPlacedOrder(slug, orderRef) : null;
    const fresh = !!snapshot;
    /*
     * Whether there is a payment to wait for. Stripe's redirect says so; so
     * does the snapshot of an online order. A cash order — or a reference we
     * know nothing about — has no webhook coming, and waiting on one is what
     * put "Confirming payment" in front of a cash customer.
     */
    const online = redirectStatus !== null || (snapshot ? isOnlinePayment(snapshot.paymentName) : false);
    /*
     * Back from an off-site payment that succeeded. Usually in the tab that
     * placed it (`fresh`), but the PayPal app returns in a new Safari tab,
     * where there is no session snapshot.
     */
    const paidHere = redirectStatus === 'succeeded';
    /*
     * The branch is named only for an order placed or paid in this shop just
     * now. Opening one from the order history must not be: the history spans
     * every branch of the restaurant, and the server scopes the lookup to the
     * restaurant (the API key) anyway.
     */
    const lookupStoreId = fresh || redirectStatus !== null ? storeInfo?.storeId : undefined;

    // A declined off-site payment: show the snapshot as an attempt, and stop.
    if (paymentFailed) {
      setState({ order: snapshot, etaWindow: null, hydrated: true, waiting: false, unresolved: false, lookupFailed: false, fresh });
      return;
    }

    setState({
      order: snapshot,
      etaWindow: etaWindowFor(snapshot),
      hydrated: !orderRef,
      waiting: false,
      unresolved: false,
      lookupFailed: false,
      fresh,
    });
    if (!orderRef) return;

    const settle = (found: PlacedOrder | null, waiting: boolean, unresolved = false, lookupFailed = false) => {
      if (cancelled) return;
      /*
       * For the order just placed, the server's copy supplies items, totals
       * and status, and the snapshot what the customer was promised at the
       * checkout: the time window and the pre-order slot.
       */
      const order =
        found && fresh && snapshot && found !== snapshot
          ? { ...found, etaLo: snapshot.etaLo, etaHi: snapshot.etaHi, etaLabel: snapshot.etaLabel ?? found.etaLabel, placedAt: snapshot.placedAt }
          : found;
      setState({ order, etaWindow: etaWindowFor(order), hydrated: true, waiting, unresolved, lookupFailed, fresh });
    };

    /**
     * Empty the basket for the order just placed — once, and never for any
     * other. Also for an off-site payment returning in a new tab: the URL says
     * the payment succeeded and the lookup, scoped to this store, found the
     * order. Remembered in localStorage there, so a reload does not empty a
     * basket started since.
     */
    const clearForPlacedOrder = () => {
      if (cleared.current) return;
      if (fresh) {
        if (snapshot?.cartCleared) return;
        cleared.current = true;
        markPlacedOrderCartCleared(slug, orderRef);
      } else if (paidHere) {
        if (wasCartClearedForPaidOrder(slug, orderRef)) return;
        cleared.current = true;
        markCartClearedForPaidOrder(slug, orderRef);
      } else {
        return;
      }
      clearCart();
      clearPreorderSlot(slug);
      // The order exists: its Idempotency-Key has done its job.
      clearOrderAttempt(slug);
    };

    void (async () => {
      const attempts = online ? POLL_ATTEMPTS : LOOKUP_ATTEMPTS;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const fetched = await fetchPlacedOrder(orderRef, storeInfo?.apiKey || '', lookupStoreId).catch(() => null);
        if (cancelled) return;

        if (fetched) {
          /*
           * The order exists on our side, so the payment landed and the webhook
           * ran. This is the only point at which the basket is safe to empty.
           */
          clearForPlacedOrder();
          settle(fetched, false);
          return;
        }

        if (!online) {
          /*
           * A cash order this session just placed: the order call already
           * answered with its code, so it exists — the lookup is what failed.
           * Show the receipt from the snapshot rather than an error.
           */
          if (fresh) {
            clearForPlacedOrder();
            settle(snapshot, false);
            return;
          }
          if (attempt < attempts - 1) await sleep(POLL_INTERVAL_MS);
          continue;
        }

        /*
         * Online, and nothing yet: the webhook is simply in flight, so keep
         * the snapshot on screen and try again.
         */
        settle(snapshot, true);
        await sleep(POLL_INTERVAL_MS);
      }

      if (!online) {
        // An order we cannot load and were not waiting on: say exactly that.
        settle(null, false, true, true);
        return;
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

  const { order, etaWindow, hydrated, waiting, unresolved, lookupFailed, fresh } = state;

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
    /** `unresolved` because the order could not be loaded, not because a payment is unconfirmed. */
    lookupFailed,
    paymentFailed,
    /**
     * Anything but the order this session just placed (or just paid for at
     * Stripe). Decided by the snapshot, not by `status`: the API answer for a
     * brand-new order has a status too, which turned every fresh order into
     * "Order details" instead of the success screen.
     */
    isPast: !!order && !fresh && redirectStatus === null,
    /**
     * The payment was given back. A full refund also cancels the order, so the
     * receipt must not go on describing food that is coming.
     */
    refunded: !!order?.refunded,
    isDelivery: order?.isDelivery ?? false,
  };
}

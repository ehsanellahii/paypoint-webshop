'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

import { useStore } from '~/contexts/store-context';

/**
 * Which wallets this device can actually pay with.
 *
 * Apple Pay needs Safari on Apple hardware, a card in Wallet, and a domain
 * registered with Apple. Google Pay needs Chrome and a card on the Google
 * account. None of that is knowable from a user-agent string, so the question
 * is put to Stripe, which evaluates the lot — including whether the connected
 * account has the wallet enabled.
 *
 * Both start false and only ever turn on, so a row is never shown to somebody
 * who cannot use it. The cost of being wrong in that direction is a dead
 * option in the list; the other direction just hides a shortcut.
 */
/*
 * TEMPORARY — testing only.
 *
 * Forces the Google Pay row on regardless of what the device reports, so we can
 * see whether the Element renders the button once it is actually asked to. If
 * the button still does not appear, the cap is Stripe's parent payment method
 * configuration and not this gate.
 *
 * Revert before release: on a device that genuinely cannot pay this way the row
 * leads to a card form, and the order still records `googlePay`.
 */
const FORCE_GOOGLE_PAY = true;

export function useWalletAvailability() {
  const storeInfo = useStore();
  const [wallets, setWallets] = useState({
    applePay: false,
    googlePay: FORCE_GOOGLE_PAY,
  });

  useEffect(() => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
    if (!publishableKey || !storeInfo?.stripeChargesEnabled) return;

    let cancelled = false;

    void (async () => {
      try {
        /*
         * Not scoped to the connected account: this asks what the *device* can
         * do, and the store payload deliberately does not carry the account id.
         * Whether the restaurant has the wallet enabled is settled later by the
         * Element, which simply shows the card form instead.
         */
        const stripe = await loadStripe(publishableKey);
        if (!stripe || cancelled) return;

        /*
         * `canMakePayment` needs a well-formed request to answer, but it is
         * only ever asked whether the wallet exists — the amount here is a
         * placeholder and nothing is charged from it.
         */
        const request = stripe.paymentRequest({
          country: 'DE',
          currency: 'eur',
          total: { label: 'total', amount: 100 },
        });

        const result = await request.canMakePayment();
        if (cancelled || !result) return;

        setWallets({
          applePay: !!result.applePay,
          googlePay: FORCE_GOOGLE_PAY || !!result.googlePay,
        });
      } catch {
        // Leave both false: no wallet row is better than a broken one.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storeInfo?.stripeChargesEnabled]);

  return wallets;
}

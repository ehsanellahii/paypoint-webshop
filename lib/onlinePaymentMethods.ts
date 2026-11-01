/**
 * Which online payment rows the checkout may show (server 0052, 01.11.2026).
 *
 * The server says per store which online methods really work on the
 * restaurant's Stripe account — `onlinePaymentMethods` in the store payload:
 * card, Apple Pay and Google Pay (only when the shop's domain is registered on
 * that account), Klarna (once Stripe has activated it) and PayPal (never on
 * PayPoint's direct charges). Before this the shop offered PayPal and Klarna
 * to every store with Stripe, and both failed at the payment.
 *
 * Kept free of React and path aliases so it can be tested on its own.
 */

export type OnlinePaymentMethods = {
  card: boolean;
  applePay: boolean;
  googlePay: boolean;
  paypal: boolean;
  klarna: boolean;
};

/** The checkout's online rows (`PaymentMethod` ids in PaymentSheet). */
export type OnlineMethodId = 'cardWallets' | 'applePay' | 'googlePay' | 'paypal' | 'klarna';

const FLAG_OF: Record<OnlineMethodId, keyof OnlinePaymentMethods> = {
  cardWallets: 'card',
  applePay: 'applePay',
  googlePay: 'googlePay',
  paypal: 'paypal',
  klarna: 'klarna',
};

/**
 * The server's flags, as booleans — or null when the payload has none (a
 * server from before 0052), so the shop keeps its old behaviour there.
 */
export function parseOnlinePaymentMethods(raw: unknown): OnlinePaymentMethods | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  return {
    card: r.card === true,
    applePay: r.applePay === true,
    googlePay: r.googlePay === true,
    paypal: r.paypal === true,
    klarna: r.klarna === true,
  };
}

/**
 * May this online row be shown?
 *
 * - `canPayOnline` false (no Stripe on the store, or a build without the key):
 *   never.
 * - No flags from the server: as before — every online row, the wallets still
 *   subject to the device check.
 * - Flags: exactly what the server allows.
 * - `wallets` (the device check) given: Apple Pay / Google Pay also need the
 *   device to support them. Left out when only "is it offered at this store"
 *   is asked — checkout's guard before placing an order.
 */
export function isOnlineMethodShown(
  id: OnlineMethodId,
  {
    canPayOnline,
    flags,
    wallets,
  }: {
    canPayOnline: boolean;
    flags: OnlinePaymentMethods | null | undefined;
    wallets?: { applePay: boolean; googlePay: boolean };
  },
): boolean {
  if (!canPayOnline) return false;
  // PayPal never works on PayPoint's direct charges, so it is never offered,
  // not even by an older server that sends no flags.
  if (id === 'paypal') return false;
  if (flags && !flags[FLAG_OF[id]]) return false;
  if (wallets && (id === 'applePay' || id === 'googlePay')) return !!wallets[id];
  return true;
}

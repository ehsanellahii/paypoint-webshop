'use client';

import { useEffect } from 'react';

import { useCart } from '~/contexts/cart-context';
import { useStore } from '~/contexts/store-context';
import { useUser } from '~/contexts/user-context';
import { quoteMatches, requestVoucherQuote, VOUCHER_DROP_CODES, VOUCHER_MIN_CODES } from '~/lib/voucher';

/**
 * Keep the applied voucher honest while the checkout is open.
 *
 * The cart already recomputes the discount locally on every change; this asks
 * the server (0051 `/vouchers/apply`, a read-only quote) whenever the basket,
 * the order type or the signed-in customer changes, so its rounding is the one
 * on screen and a voucher that expired or reached its limit since it was
 * redeemed is taken off — with the reason in the voucher's error slot — rather
 * than refused when the order is placed.
 */
export function useVoucherRequote(orderType: string) {
  const storeInfo = useStore();
  const { user, clearUser } = useUser();
  const { appliedVoucher, totalPrice, applyVoucher, removeVoucher, isHydrated } = useCart();
  const customerId = user?._id || undefined;
  const authToken = user?.authToken || undefined;

  useEffect(() => {
    if (!isHydrated || !appliedVoucher || !storeInfo?.apiKey) return;
    if (!(totalPrice > 0)) return;
    if (quoteMatches(appliedVoucher, totalPrice, orderType, customerId)) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await requestVoucherQuote({
        apiKey: storeInfo.apiKey,
        adminId: storeInfo.adminId,
        storeId: storeInfo.storeId,
        code: appliedVoucher.code,
        subtotal: totalPrice,
        orderType,
        customerId,
        authToken,
      });
      if (cancelled) return;
      // The stored session was refused (pre-0051 or expired): sign out quietly; the quote was retried as a guest.
      if (result.authExpired) clearUser();
      if (result.ok) {
        applyVoucher(result.voucher);
        return;
      }
      if (VOUCHER_DROP_CODES.has(result.code)) {
        removeVoucher(result.code);
        return;
      }
      if (VOUCHER_MIN_CODES.has(result.code)) {
        /*
         * Below the minimum: kept, worth nothing until the basket grows. The
         * server's minimum is recorded (or, if it did not say, a floor just
         * above this basket) so the cart shows why.
         */
        const minimum = result.minOrderAmount ?? Math.max(appliedVoucher.minimumOrderValue ?? 0, totalPrice + 0.01);
        applyVoucher({ ...appliedVoucher, minimumOrderValue: minimum, quote: { subtotal: totalPrice, discount: 0, orderType, customerId } });
      }
      // No answer or a server fault: the local figure stands.
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isHydrated, appliedVoucher, totalPrice, orderType, customerId, authToken, storeInfo?.apiKey, storeInfo?.adminId, storeInfo?.storeId, applyVoucher, removeVoucher, clearUser]);
}

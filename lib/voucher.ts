import { API_BASE_URL, apiHeaders } from '~/lib/api';
import { computeVoucherDiscount, fromCents, toCents } from '~/lib/utils';

/**
 * A voucher held by the cart: its rules, not a frozen discount.
 *
 * The discount used to be stored once, at the moment the code was redeemed —
 * so 10 % of a 40 € basket stayed 4 € after the basket shrank to 8 €, and a
 * 15 € voucher could take an order below zero. The cart now keeps the rules
 * and works the discount out again on every change; the server's own quote
 * (`quote`) wins while the basket is still the one it priced, so the shop
 * shows exactly the rounding the order will be charged with.
 */
export type AppliedVoucher = {
  voucherId: string;
  code: string;
  title?: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderValue?: number;
  maximumDiscountValue?: number;
  validUntil?: string;
  /** The server's answer for one basket: its subtotal, order type and customer. */
  quote?: { subtotal: number; discount: number; orderType?: string; customerId?: string };
};

const num = (v: unknown): number | undefined => {
  const n = Number(v);
  return v === null || v === undefined || v === '' || !Number.isFinite(n) ? undefined : n;
};

/**
 * Read a `/vouchers/apply` answer.
 *
 * 0051 answers `{ voucherId, code, type, value, maxDiscount?, minOrderAmount?, discount }`.
 * The older `{ voucher: {...}, discountAmount }` is still understood so a shop
 * deployed a little ahead of its server does not break redeeming.
 */
export function parseVoucherQuote(data: any, subtotal: number, orderType?: string, customerId?: string): AppliedVoucher | null {
  const v = data?.voucher ?? data;
  if (!v) return null;
  const voucherId = String(v.voucherId ?? v._id ?? v.id ?? '');
  const code = String(v.code ?? '');
  if (!voucherId && !code) return null;
  const typeRaw = String(v.type ?? v.discountType ?? '').toLowerCase();
  const discount = num(data?.discount ?? data?.discountAmount ?? v.discountAmount);
  return {
    voucherId,
    code,
    title: v.title || undefined,
    description: v.description || undefined,
    discountType: typeRaw.startsWith('perc') ? 'percentage' : 'fixed',
    discountValue: Number(v.value ?? v.discountValue ?? 0) || 0,
    minimumOrderValue: num(v.minOrderAmount ?? v.minimumOrderValue),
    maximumDiscountValue: num(v.maxDiscount ?? v.maximumDiscountValue),
    validUntil: v.validUntil || undefined,
    quote: discount === undefined ? undefined : { subtotal, discount, orderType, customerId },
  };
}

/**
 * The discount on this basket, and whether it is below the voucher's minimum.
 * Never more than the food, never negative.
 */
export function voucherDiscount(v: AppliedVoucher | null | undefined, subtotal: number): { discount: number; belowMinimum: boolean } {
  const local = computeVoucherDiscount(v ?? null, subtotal);
  if (!v || local.belowMinimum) return local;
  if (v.quote && toCents(v.quote.subtotal) === toCents(subtotal)) {
    const cents = Math.min(Math.max(0, toCents(v.quote.discount)), Math.max(0, toCents(subtotal)));
    return { discount: fromCents(cents), belowMinimum: false };
  }
  return local;
}

/** Does the held quote still describe this basket? */
export function quoteMatches(v: AppliedVoucher | null | undefined, subtotal: number, orderType?: string, customerId?: string): boolean {
  if (!v?.quote) return false;
  return toCents(v.quote.subtotal) === toCents(subtotal) && (v.quote.orderType ?? '') === (orderType ?? '') && (v.quote.customerId ?? '') === (customerId ?? '');
}

export type VoucherQuoteResult =
  | { ok: true; voucher: AppliedVoucher; authExpired?: boolean }
  | { ok: false; code: string; status: number; minOrderAmount?: number; authExpired?: boolean };

/**
 * Ask the server what a code is worth on this basket (0051: read-only, works
 * for guests). With a signed-in customer the token goes along, so a voucher
 * bound to that customer is recognised.
 */
export async function requestVoucherQuote(args: {
  apiKey?: string;
  adminId?: string;
  storeId?: string;
  code: string;
  subtotal: number;
  orderType: string;
  customerId?: string;
  authToken?: string;
}): Promise<VoucherQuoteResult> {
  const { apiKey, adminId, storeId, code, subtotal, orderType, customerId, authToken } = args;

  const send = async (token?: string) => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/vouchers/apply`, {
        method: 'POST',
        headers: apiHeaders({ apiKey, adminId, storeId, authToken: token }),
        /*
         * The 0051 names, plus the old `promoCode` / `orderTotalAmount` so the
         * shop also works against a server that has not been updated yet
         * (0051 accepts both). The customer comes from the token alone.
         */
        body: JSON.stringify({
          code,
          subtotal,
          orderType,
          promoCode: code,
          orderTotalAmount: subtotal,
          ...(token && customerId ? { customerId } : {}),
        }),
      });
    } catch {
      return { res: null as Response | null, json: null as any };
    }
    return { res, json: await res.json().catch(() => ({})) };
  };

  let { res, json } = await send(authToken);
  let authExpired = false;
  /*
   * A stored session from before 0051 (or an expired one) is refused. The
   * customer is signed out by the caller, and the quote is asked again as a
   * guest — so a promotional code still works without an error.
   */
  if (res && authToken && res.status === 401 && (json?.code ?? json?.errorCode) !== 'INVALID_API_KEY') {
    authExpired = true;
    ({ res, json } = await send(undefined));
  }
  if (!res) return { ok: false, code: 'NETWORK', status: 0, authExpired };
  if (!res.ok || json?.success === false) {
    return {
      ok: false,
      code: String(json?.code ?? json?.errorCode ?? ''),
      status: res.status,
      minOrderAmount: num(json?.data?.minOrderAmount ?? json?.data?.minimumOrderValue),
      authExpired,
    };
  }
  const usedCustomer = authExpired ? undefined : customerId;
  const voucher = parseVoucherQuote(json?.data, subtotal, orderType, authToken && !authExpired ? usedCustomer : undefined);
  if (!voucher) return { ok: false, code: '', status: res.status, authExpired };
  return { ok: true, voucher, authExpired };
}

/** Refusals after which the voucher cannot stay on the basket. */
export const VOUCHER_DROP_CODES = new Set([
  'VOUCHER_NOT_FOUND',
  'VOUCHER_EXPIRED',
  'VOUCHER_LIMIT_REACHED',
  'VOUCHER_LOGIN_REQUIRED',
  'VOUCHER_INVALID',
  // Codes the server used before 0051.
  'LIMIT_EXCEEDED',
  'CUSTOMER_NOT_FOUND',
  'invalidVoucher',
  'voucherExpired',
]);

/** Below the voucher's minimum: kept, but worth nothing until the basket grows. */
export const VOUCHER_MIN_CODES = new Set(['VOUCHER_MIN_ORDER', 'MINIMUM_ORDER_VALUE_NOT_MET']);

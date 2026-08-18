'use client';

import React from 'react';
import { AlertCircle, Loader2, Ticket, X } from 'lucide-react';

import { API_BASE_URL, formatPrice, apiHeaders } from '~/lib/api';
import { getTranslatedVoucherApiErrorMessage } from '~/lib/errorMessages';
import { useCart } from '~/contexts/cart-context';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useUser, type Voucher } from '~/contexts/user-context';

/** The stub's two lines: "10" over "% RABATT", "5" over "€". */
function stubParts(v: { discountType?: string; discountValue?: number; minimumOrderValue?: number }, t: any) {
  const isPct = (v.discountType ?? '').toLowerCase().startsWith('perc');
  const big = String(v.discountValue ?? '');
  const small = isPct ? `% ${t.discount ?? 'OFF'}` : v.minimumOrderValue ? `€ ${t.from ?? 'from'} ${v.minimumOrderValue}€` : '€';
  return { big, small: small.toUpperCase() };
}

/**
 * Vouchers as its own screen, per the design: a redeem row, the applied voucher
 * as a torn ticket, and the customer's remaining offers below it. Deliberately
 * not the cart's `VoucherSection` — that is a panel meant to sit inside another
 * card, and dropping it here produced a card inside a screen with the heading
 * twice.
 */
export default function MobileVouchersPanel() {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const { user } = useUser();
  const { applyVoucher, removeVoucher, appliedVoucher, discountAmount, totalPrice } = useCart();
  const customerId = user?.id ?? user?._id;

  const [code, setCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const available = (user?.vouchers ?? []).filter((v) => v.code && v.code !== appliedVoucher?.code);

  const apply = async (raw: string) => {
    const value = raw.trim();
    if (!value || !storeInfo?.storeId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vouchers/apply`, {
        method: 'POST',
        headers: apiHeaders({ apiKey: storeInfo?.apiKey }),
        body: JSON.stringify({ storeId: storeInfo.storeId, customerId, promoCode: value, orderTotalAmount: totalPrice }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(getTranslatedVoucherApiErrorMessage(err.errorCode, err.message, t) ?? 'Failed');
      }
      const { voucher, discountAmount: discount } = (await res.json()).data;
      if (voucher && discount) {
        applyVoucher({ voucher, discountAmount: discount });
        window.dispatchEvent(new CustomEvent('voucher:applied', { detail: { code: voucher.code, saved: discount } }));
      }
      setCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : (t.voucherApplyFailed ?? 'Failed to apply voucher'));
    } finally {
      setLoading(false);
    }
  };

  const sectionLabel = (text: string, className = '') => (
    <div className={`text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground ${className}`}>{text}</div>
  );

  /** The notches and dashed rule that make a card read as a torn ticket. */
  const stub = (big: string, small: string, dark: boolean) => (
    <>
      <div className={`flex w-[66px] flex-none flex-col items-center justify-center ${dark ? 'bg-background text-white' : 'bg-black/[0.06] text-black'}`}>
        <span className="text-[22px] font-black leading-none">{big}</span>
        <span className={`text-[10.5px] font-extrabold ${dark ? 'text-muted-foreground' : 'opacity-70'}`}>{small}</span>
      </div>
      <div className={`absolute bottom-0 left-[66px] top-0 w-0 border-l-2 border-dashed ${dark ? 'border-elevated' : 'border-black/[0.18]'}`} aria-hidden />
      <div className="absolute -top-[7px] left-[59px] h-3.5 w-3.5 rounded-full bg-background" aria-hidden />
      <div className="absolute -bottom-[7px] left-[59px] h-3.5 w-3.5 rounded-full bg-background" aria-hidden />
    </>
  );

  return (
    <div className="pb-6">
      {/* Hero */}
      <div className="mb-4 flex items-center gap-[11px]">
        <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[13px] border border-white/10 bg-[linear-gradient(150deg,#262b42,#151827)]">
          <Ticket className="h-5 w-5 text-white" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <div className="text-[15.5px] font-extrabold tracking-[-0.02em]">{t.saveOnYourOrder ?? 'Save on your order'}</div>
          <div className="mt-0.5 text-[11.5px] font-medium text-muted-foreground">{t.enterCodeOrPickOffer ?? 'Enter a code or pick an offer'}</div>
        </div>
      </div>

      {/* Redeem */}
      <div className="flex gap-2">
        <div className="flex h-12 flex-1 items-center gap-[11px] rounded-[13px] border-[1.5px] border-border-strong bg-surface-1 px-3.5 focus-within:border-white/60">
          <Ticket className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t.voucherCode ?? 'VOUCHER CODE'}
            autoComplete="off"
            autoCapitalize="characters"
            disabled={loading}
            className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] font-extrabold uppercase tracking-[0.08em] text-white outline-none placeholder:font-bold placeholder:tracking-[0.06em] placeholder:text-muted-foreground"
          />
        </div>
        <button
          onClick={() => apply(code)}
          disabled={loading || !code.trim()}
          className="flex flex-none items-center justify-center rounded-[13px] bg-white px-[18px] text-[13.5px] font-extrabold text-black transition active:scale-[0.96] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (t.redeem ?? 'Redeem')}
        </button>
      </div>

      {error && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-error-text">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Applied — a white ticket, so it reads as held rather than offered. */}
      {appliedVoucher && (
        <>
          {sectionLabel(t.applied ?? 'Applied', 'mt-7')}
          <div className="relative mt-3 flex items-stretch overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#fff,#ededed)] shadow-[0_12px_30px_-14px_rgba(255,255,255,0.4)]">
            {stub(...(Object.values(stubParts(appliedVoucher, t)) as [string, string]), false)}
            <div className="flex min-w-0 flex-1 items-center gap-2.5 py-[15px] pl-5 pr-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-[7px]">
                  <span className="text-[14.5px] font-black tracking-[0.02em] text-black">{appliedVoucher.code}</span>
                  <span className="rounded-md bg-black px-2 py-0.5 text-[10px] font-extrabold tracking-[0.04em] text-white">{t.voucherActive ?? 'ACTIVE'}</span>
                </div>
                <div className="mt-[3px] truncate text-[12px] font-semibold text-[#555]">{appliedVoucher.title || `−${formatPrice(discountAmount)}`}</div>
              </div>
              <button
                onClick={() => removeVoucher()}
                aria-label={t.remove}
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-black/[0.07] text-black transition active:scale-90"
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* The customer's remaining offers. */}
      {available.length > 0 && (
        <>
          {sectionLabel(t.availableOffers ?? 'Available offers', 'mt-7')}
          <div className="mt-3 flex flex-col gap-3">
            {available.map((v: Voucher) => {
              const { big, small } = stubParts(v, t);
              return (
                <div key={v.code} className="relative flex items-stretch overflow-hidden rounded-[18px] border border-white/[0.06] bg-card">
                  {stub(big, small, true)}
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 py-[15px] pl-5 pr-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14.5px] font-extrabold tracking-[0.02em]">{v.code}</div>
                      <div className="mt-[3px] truncate text-[12px] font-medium text-muted-foreground">{v.title || v.description || ''}</div>
                    </div>
                    <button
                      onClick={() => apply(v.code!)}
                      disabled={loading}
                      className="flex-none rounded-[11px] bg-white px-3.5 py-2 text-[12.5px] font-extrabold text-black transition active:scale-95 disabled:opacity-50"
                    >
                      {t.redeem ?? 'Redeem'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

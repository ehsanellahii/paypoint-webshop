'use client';

import React from 'react';
import { Check, Loader2, Tag, X } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { useCart } from '~/contexts/cart-context';
import { API_BASE_URL, formatPrice, apiHeaders } from '@/lib/api';
import { useUser } from '~/contexts/user-context';
import { getTranslatedVoucherApiErrorMessage } from '~/lib/errorMessages';
import { useStore } from '~/contexts/store-context';

type Props = {
  disabled?: boolean; // disable input + buttons when submitting order etc.
  /*
   * 'card'  — the cart, where this is one panel among several and needs its own
   *           frame and heading.
   * 'plain' — inside the checkout voucher dialog, which already supplies both.
   *           Without this the dialog drew a card inside a card and said
   *           "Gutschein" twice.
   */
  variant?: 'card' | 'plain';
};

export default function VoucherSection({ disabled, variant = 'card' }: Props) {
  const isPlain = variant === 'plain';
  const storeInfo = useStore();
  const { user } = useUser();
  const { applyVoucher, removeVoucher, appliedVoucher, discountAmount } = useCart();
  const customerId = user?.id ?? user?._id;
  const { t } = useLanguage();
  const isVoucherApplied = Boolean(appliedVoucher);
  const { totalPrice } = useCart();

  const [voucherCode, setVoucherCode] = React.useState('');
  const [voucherLoading, setVoucherLoading] = React.useState(false);
  const [voucherError, setVoucherError] = React.useState<string | null>(null);

  const onApplyVoucher = async () => {
    setVoucherError(null);

    if (!storeInfo?.storeId) {
      // setVoucherError(t.storeNotFound ?? 'Store not found');
      return;
    }

    const code = voucherCode.trim();
    if (!code) {
      setVoucherError(t.enterVoucherCode ?? 'Enter voucher code');
      return;
    }

    setVoucherLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vouchers/apply`, {
        method: 'POST',
        headers: apiHeaders({ apiKey: storeInfo?.apiKey }),
        body: JSON.stringify({
          storeId: storeInfo.storeId,
          customerId,
          promoCode: code,
          orderTotalAmount: totalPrice,
        }),
      });
      if (!res.ok) {
        const resError = await res.json();
        const errorMessage = getTranslatedVoucherApiErrorMessage(resError.errorCode, resError.message, t);
        throw new Error(errorMessage ?? 'Failed to apply voucher');
      }
      const responseData = await res.json();
      const { voucher, discountAmount: discount } = responseData.data;
      if (voucher && discount) {
        applyVoucher({ voucher, discountAmount: discount });
        // Picked up by <VoucherFlash />, wherever it is mounted.
        window.dispatchEvent(new CustomEvent('voucher:applied', { detail: { code: voucher.code, saved: discount } }));
      }
      setVoucherCode('');
    } catch (e) {
      setVoucherError(e instanceof Error ? e.message : (t.voucherApplyFailed ?? 'Failed to apply voucher'));
    } finally {
      setVoucherLoading(false);
    }
  };

  const onRemoveVoucher = () => {
    setVoucherError(null);
    removeVoucher();
  };

  return (
    <div className={isPlain ? 'space-y-3' : 'mt-7 space-y-3 rounded-[16px] border border-border bg-surface-1 p-4'}>
      {!isPlain && (
        <div className='flex items-center gap-2 text-lg font-bold'>
          <Tag className='size-5' />
          <span>{t.voucher ?? 'Voucher'}</span>
        </div>
      )}

      {isVoucherApplied && appliedVoucher ? (
        /* The design's applied card: green-bordered, check in a tinted disc, code
           over its description, and a round remove button rather than a labelled one. */
        <div className='flex items-center gap-3 rounded-[14px] border-[1.5px] border-success bg-surface-3 p-3.5'>
          <span className='flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-success/[0.16] text-success'>
            <Check className='h-[18px] w-[18px]' strokeWidth={2.6} />
          </span>
          <div className='min-w-0 flex-1'>
            <div className='truncate text-[14.5px] font-extrabold'>{appliedVoucher?.code}</div>
            <div className='mt-px truncate text-[12px] font-medium text-muted-foreground'>
              {appliedVoucher?.title || `${t.discount ?? 'Discount'}: -${formatPrice(discountAmount)}`}
            </div>
          </div>
          <button
            type='button'
            onClick={onRemoveVoucher}
            aria-label={t.remove ?? 'Remove'}
            className='flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground transition hover:text-white disabled:opacity-50'
            disabled={disabled || voucherLoading}>
            <X className='h-4 w-4' strokeWidth={2.2} />
          </button>
        </div>
      ) : (
        <>
          <div className='flex gap-2.5'>
            <input
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              placeholder={t.enterVoucherCode ?? 'Enter voucher code'}
              className='h-[50px] flex-1 rounded-[13px] border-[1.5px] border-border-strong bg-surface-3 px-[15px] font-bold uppercase tracking-[0.04em] text-white outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-white/60'
              disabled={disabled || voucherLoading}
            />

            <button
              type='button'
              onClick={onApplyVoucher}
              className='flex h-[50px] w-24 shrink-0 items-center justify-center rounded-[13px] bg-primary text-sm font-extrabold text-selected-text transition active:scale-[0.97] disabled:opacity-50'
              disabled={disabled || voucherLoading || !voucherCode.trim()}>
              {voucherLoading ? <Loader2 className='size-4 animate-spin' /> : (t.redeem ?? t.apply ?? 'Redeem')}
            </button>
          </div>

          {voucherError && <p className='text-sm text-brand-red'>{voucherError}</p>}
        </>
      )}
    </div>
  );
}

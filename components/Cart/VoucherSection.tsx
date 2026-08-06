'use client';

import React from 'react';
import { Loader2, Tag, X } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { useCart } from '~/contexts/cart-context';
import { API_BASE_URL, formatPrice, X_API_KEY } from '@/lib/api';
import { useUser } from '~/contexts/user-context';
import { getTranslatedVoucherApiErrorMessage } from '~/lib/errorMessges';
import { useStore } from '~/contexts/store-context';

type Props = {
  disabled?: boolean; // disable input + buttons when submitting order etc.
};

export default function VoucherSection({ disabled }: Props) {
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
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': X_API_KEY || '',
        },
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
      if (voucher && discount) applyVoucher({ voucher, discountAmount: discount });
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
    <div className='mt-7 space-y-3 rounded-[16px] border border-border bg-surface-1 p-4'>
      <div className='flex items-center gap-2 text-lg font-bold'>
        <Tag className='size-5' />
        <span>{t.voucher ?? 'Voucher'}</span>
      </div>

      {isVoucherApplied && appliedVoucher ? (
        <div className='flex items-center justify-between rounded-[12px] border border-success/40 bg-surface-3 p-3'>
          <div className='flex flex-col'>
            <span className='font-bold'>
              {appliedVoucher?.title} - {appliedVoucher?.code}
            </span>
            <span className='text-sm text-success'>
              {t.discount ?? 'Discount'}: -{formatPrice(discountAmount)}
            </span>
          </div>

          <button
            type='button'
            onClick={onRemoveVoucher}
            className='inline-flex items-center gap-2 rounded-[10px] bg-surface-3 px-3 py-2 text-sm font-bold text-white hover:bg-elevated'
            disabled={disabled || voucherLoading}>
            <X className='size-4' />
            {t.remove ?? 'Remove'}
          </button>
        </div>
      ) : (
        <>
          <div className='flex gap-2'>
            <input
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              placeholder={t.enterVoucherCode ?? 'Enter voucher code'}
              className='h-12 flex-1 rounded-[12px] border border-border-strong bg-surface-3 px-4 font-bold uppercase tracking-[0.04em] text-white outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:border-white/60'
              disabled={disabled || voucherLoading}
            />

            <button
              type='button'
              onClick={onApplyVoucher}
              className='flex h-12 items-center justify-center rounded-[12px] bg-primary px-5 font-extrabold text-selected-text disabled:opacity-50'
              disabled={disabled || voucherLoading || !voucherCode.trim()}>
              {voucherLoading ? <Loader2 className='size-4 animate-spin' /> : (t.apply ?? 'Apply')}
            </button>
          </div>

          {voucherError && <p className='text-sm text-brand-red'>{voucherError}</p>}
        </>
      )}
    </div>
  );
}

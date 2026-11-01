'use client';

import { AlertCircle, X } from 'lucide-react';

import { SAFE_TOP } from '~/components/mobile/MobileShell';
import { useCart } from '~/contexts/cart-context';
import { useLanguage } from '~/contexts/language-context';

/**
 * "Einige Artikel sind nicht mehr verfügbar …" on a phone — the mobile
 * counterpart of the notice the desktop menu shows inline.
 *
 * Driven by the cart's `lastReconcile`: the menu check that took lines out of
 * the cart may have run anywhere (the menu load, the stored cart being read,
 * the checkout, which then sends the guest back here with a cart that has
 * shrunk or emptied). Without a word the guest would only see the items gone.
 *
 * The same small floating card as the table-code notice (TableTokenNotice):
 * over the top of the menu, under the cover's buttons, never over the cart bar,
 * and put away with its close button until the next removal. It sits below
 * every drawer, sheet and the zone gate (z 70 and up).
 */
export default function MobileCartRemovedNotice() {
  const { lastReconcile, dismissReconcileNotice } = useCart();
  const { t } = useLanguage();

  if (!lastReconcile || lastReconcile.removed <= 0) return null;

  return (
    <div role='status' className='pointer-events-none absolute inset-x-0 z-[69] flex justify-center px-3' style={{ top: `calc(${SAFE_TOP} + 52px)` }}>
      <div className='anim-fade pointer-events-auto flex w-full items-center gap-3 rounded-[18px] border border-border-strong bg-surface-1 p-3.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)]'>
        <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15'>
          <AlertCircle className='h-5 w-5 text-warning' strokeWidth={1.9} />
        </span>
        <div className='min-w-0 flex-1 text-[13px] font-semibold leading-snug text-white'>{t.cartItemsRemoved}</div>
        {/* 44px hit area around the design's 32px circle. */}
        <button type='button' onClick={dismissReconcileNotice} aria-label={t.dismiss} className='-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full'>
          <span className='flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-white transition active:scale-90'>
            <X className='h-4 w-4' strokeWidth={2.2} />
          </span>
        </button>
      </div>
    </div>
  );
}

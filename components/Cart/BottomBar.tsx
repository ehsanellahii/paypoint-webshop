'use client';

import { useCart } from '~/contexts/cart-context';
import { useLanguage } from '@/contexts/language-context';
import { formatPrice } from '@/lib/api';
import { isRestaurantOpen } from '~/lib/restaurantTimings';
import { useStore } from '~/contexts/store-context';

/**
 * Mobile-only floating cart bar (prototype `.wzcartbar`).
 * Pure trigger — the Cart dialog itself is hosted centrally in HomeScreen.
 */
export default function BottomBar({ onOpenCart }: { onOpenCart: () => void }) {
  const storeInfo = useStore();
  const { totalItems, totalPrice } = useCart();
  const { t } = useLanguage();
  const isClosed = !isRestaurantOpen(storeInfo?.timings || {});

  if (totalItems === 0) return null;

  return (
    <div
      className='fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-[rgba(20,20,22,0.98)] to-transparent px-3.5 pt-2.5 lg:hidden'
      style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }}>
      <button
        onClick={() => !isClosed && onOpenCart()}
        disabled={isClosed}
        data-cart-target='1'
        className='flex h-14 w-full items-center gap-3 rounded-2xl bg-primary px-2.5 text-selected-text shadow-[0_12px_30px_-8px_rgba(0,0,0,0.6)] transition active:scale-[0.98] disabled:opacity-60'>
        <span className='flex h-8 min-w-[30px] items-center justify-center rounded-[10px] bg-black px-2.5 text-sm font-extrabold text-white'>{totalItems}</span>
        <span className='flex-1 text-left text-[15.5px] font-extrabold'>{isClosed ? (t.closed ?? 'Closed') : (t.order ?? 'View order')}</span>
        <span className='pr-2 text-[15.5px] font-extrabold'>{formatPrice(totalPrice)}</span>
      </button>
    </div>
  );
}

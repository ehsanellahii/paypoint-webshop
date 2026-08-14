'use client';

import { Search, X, User, ChevronDown, MapPin } from 'lucide-react';
import { formatPrice } from '@/lib/api';
import { useAddress } from '~/contexts/address-context';
import { useLanguage } from '~/contexts/language-context';
import BrandMark from './BrandMark';

type Props = {
  query: string;
  onQueryChange: (v: string) => void;
  cartCount: number;
  subtotal: number;
  onOpenCart: () => void;
  onOpenAccount: () => void;
  onOpenAddress: () => void;
  onLogoClick?: () => void;
};

export default function MenuHeader({ query, onQueryChange, cartCount, subtotal, onOpenCart, onOpenAccount, onOpenAddress, onLogoClick }: Props) {
  const { t } = useLanguage();
  const { orderType, deliveryAddress } = useAddress();
  const showAddr = orderType === 'delivery';
  const addrShort = deliveryAddress ? `${deliveryAddress.route || ''} ${deliveryAddress.streetNumber || ''}`.trim() || deliveryAddress.formattedAddress : t.delivery;

  return (
    <header className='sticky top-0 z-40 border-b border-border bg-[rgba(20,20,22,0.92)] backdrop-blur-[14px]'>
      <div className='shell shell-pad flex h-[74px] items-center gap-4'>
        <BrandMark onClick={onLogoClick} />

        {showAddr && (
          <button
            onClick={onOpenAddress}
            className='flex min-w-0 shrink items-center gap-2.5 rounded-full bg-surface-1 py-0 pl-[5px] pr-4 text-sm font-bold text-white transition hover:bg-elevated sm:shrink-0'
            style={{ height: 44 }}
            aria-label='Change delivery address'>
            <span className='flex h-[34px] w-[34px] items-center justify-center rounded-full bg-surface-3'>
              <MapPin className='h-4 w-4' />
            </span>
            <span className='max-w-[220px] truncate'>{addrShort}</span>
            <ChevronDown className='h-4 w-4 text-muted-foreground' />
          </button>
        )}

        {/* Desktop search */}
        <div className='hidden flex-1 items-center gap-3 rounded-[13px] border border-border bg-surface-1 px-4 transition focus-within:border-white/60 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.12)] md:flex' style={{ height: 44 }}>
          <Search className='h-[18px] w-[18px] shrink-0 text-muted-foreground' />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t.searchMenu ?? 'Search the menu…'}
            className='min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-white outline-none'
          />
          {query && (
            <button onClick={() => onQueryChange('')} aria-label='Clear search' className='flex h-6 w-6 items-center justify-center rounded-full bg-control text-white transition hover:bg-control-hover'>
              <X className='h-3 w-3' />
            </button>
          )}
        </div>

        <div className='flex flex-1 md:hidden' />

        {/* Cart button */}
        {cartCount > 0 && (
          <button
            onClick={onOpenCart}
            data-cart-target='1'
            className='flex h-11 shrink-0 items-center gap-2.5 rounded-[13px] bg-primary px-2 text-selected-text transition hover:brightness-95'>
            <span className='flex h-7 min-w-[26px] items-center justify-center rounded-[9px] bg-black px-2 text-[13px] font-extrabold text-white'>{cartCount}</span>
            {/* `viewOrder`, not `order`: the design labels this "Bestellung ansehen", and the bottom bar already says the same. */}
            <span className='hidden text-sm font-extrabold sm:inline'>{t.viewOrder ?? 'View order'}</span>
            <span className='px-2 pl-1 text-sm font-extrabold'>{formatPrice(subtotal)}</span>
          </button>
        )}

        {/* Profile button */}
        <button
          onClick={onOpenAccount}
          data-cart-anchor='1'
          aria-label='Open account'
          className='flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border border-border bg-surface-1 text-white transition hover:border-border-strong hover:bg-elevated'>
          <User className='h-5 w-5' />
        </button>
      </div>
    </header>
  );
}

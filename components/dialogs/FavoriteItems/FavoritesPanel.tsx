'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Heart, ArrowRight } from 'lucide-react';
import { useResolvedFavorites } from './useResolvedFavorites';
import { useStore } from '~/contexts/store-context';
import { useCart } from '~/contexts/cart-context';
import { useLanguage } from '~/contexts/language-context';
import FavoriteButton from '~/components/FavoriteButton';
import SmartImage from '~/lib/SmartImage';
import { getImageURL, MenuProduct } from '~/lib/utils';
import { formatPrice } from '@/lib/api';
import { getFavoriteIds } from '~/lib/favorites';

/**
 * In-drawer favorites list (prototype `acctFav`): image · name · price, a heart
 * to remove (with the break animation), and a + to add to cart. Products that
 * require a customization open the product modal instead.
 */
export default function FavoritesPanel({ active, onOpenProduct, onBrowse }: { active: boolean; onOpenProduct: (p: MenuProduct) => void; onBrowse: () => void }) {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const { addToCart } = useCart();
  const storeKey = storeInfo?.slug || 'default';
  const logoURL = storeInfo?.settings?.logo || '';
  const { products, loading } = useResolvedFavorites(storeKey, active, storeInfo?.storeId || '', storeInfo?.adminId || '');

  // Keep the visible set in sync as the user removes hearts.
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const sync = () => setFavIds(new Set(getFavoriteIds(storeKey).map(String)));
    sync();
    window.addEventListener('favorites:changed', sync);
    return () => window.removeEventListener('favorites:changed', sync);
  }, [storeKey, active, products.length]);

  const visible = products.filter((p) => favIds.has(String(p._id ?? p.id)));

  const add = (p: MenuProduct) => {
    const requiresModal = p.haveCustomizations && (p.addOns || []).some((g) => (g.minimumQuantity ?? 0) > 0);
    if (requiresModal) {
      onOpenProduct(p);
      return;
    }
    addToCart(p, 1, {});
  };

  if (loading && visible.length === 0) {
    return (
      <div className='flex h-[40vh] items-center justify-center'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className='anim-fade flex flex-col items-center px-4 pb-8 pt-11 text-center'>
        <div className='anim-float relative flex h-24 w-24 items-center justify-center'>
          <div className='absolute inset-0 rounded-full bg-[rgba(255,107,94,0.1)]' />
          <div className='absolute inset-3.5 rounded-full bg-[rgba(255,107,94,0.14)]' />
          <Heart className='anim-beat relative h-11 w-11 fill-[#ff6b5e] text-[#ff6b5e]' />
        </div>
        <div className='mt-5 text-lg font-extrabold tracking-tight'>{t.noFavoriteItemsYet ?? 'No favorites yet'}</div>
        <p className='mt-2 max-w-[280px] text-[13.5px] font-medium leading-relaxed text-muted-foreground'>
          {t.savedItemsForRestaurant ?? 'Tap the ♥ on your favorite dishes — we’ll collect them here.'}
        </p>
        <button onClick={onBrowse} className='mt-5.5 inline-flex h-12 items-center gap-2 rounded-[14px] bg-primary px-5.5 text-sm font-extrabold text-selected-text transition active:scale-[0.97]'>
          {t.continueToMenu ?? 'Explore menu'}
          <ArrowRight className='h-4 w-4' strokeWidth={2.4} />
        </button>
      </div>
    );
  }

  return (
    <div className='flex flex-col'>
      {visible.map((p) => {
        const img = p.images?.length ? getImageURL(p.images[0]) : logoURL;
        return (
          <div key={p._id ?? p.id} className='flex items-center gap-3 border-b border-border py-3'>
            <div className='relative h-[54px] w-[54px] shrink-0 overflow-hidden rounded-xl bg-white'>
              <SmartImage fallbackSrc={logoURL} src={img} alt={p.name} fill className='object-cover' sizes='54px' />
            </div>
            <div className='min-w-0 flex-1'>
              <div className='truncate text-[14.5px] font-bold'>{p.name}</div>
              <div className='mt-0.5 text-[13px] font-extrabold'>{formatPrice(p.currentPrice)}</div>
            </div>
            <FavoriteButton storeKey={storeKey} productId={p._id} name={p.name} image={p.images?.[0]} price={p.currentPrice} />
            <button
              onClick={() => add(p)}
              aria-label='Add'
              className='flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-primary text-selected-text transition active:scale-[0.85]'>
              <Plus className='h-4 w-4' strokeWidth={2.6} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

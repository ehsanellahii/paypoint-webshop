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
  const { products, loading } = useResolvedFavorites(storeKey, active, storeInfo?.storeId || '', storeInfo?.adminId || '', storeInfo?.apiKey || '');

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

  /*
   * Row per the design: the dish reads down the left — name, description,
   * price — and the photo sits on the right with the heart tucked into its top
   * corner and the add button into its bottom one. The list was previously a
   * thumbnail-first row with no description, which read as a search result
   * rather than a saved dish.
   */
  return (
    <div className='flex flex-col'>
      <div className='text-[13px] font-medium text-muted-foreground'>{t.yourSavedDishes ?? 'Your saved dishes'}</div>
      {visible.map((p) => {
        const img = p.images?.length ? getImageURL(p.images[0]) : logoURL;
        return (
          <div
            key={p._id ?? p.id}
            onClick={() => onOpenProduct(p)}
            className='flex cursor-pointer items-center gap-3.5 border-b border-white/[0.07] py-[15px]'>
            <div className='min-w-0 flex-1'>
              <div className='text-sm font-bold leading-[1.25]'>{p.name}</div>
              {p.description && <div className='mt-[5px] line-clamp-2 text-xs font-medium leading-[1.4] text-muted-foreground'>{p.description}</div>}
              <div className='mt-[9px] text-sm font-extrabold'>{formatPrice(p.currentPrice)}</div>
            </div>

            <div className='relative shrink-0'>
              {/* Over the photo, so it gets the design's translucent disc. */}
              <span
                onClick={(e) => e.stopPropagation()}
                className='absolute -left-[7px] -top-[7px] z-[3] flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[rgba(28,28,30,0.78)] backdrop-blur-[4px]'>
                <FavoriteButton storeKey={storeKey} productId={p._id} name={p.name} image={p.images?.[0]} price={p.currentPrice} />
              </span>

              <div className='h-[88px] w-[88px] overflow-hidden rounded-xl bg-card'>
                <SmartImage fallbackSrc={logoURL} src={img} alt={p.name} fill className='object-cover' sizes='88px' />
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  add(p);
                }}
                aria-label={t.addToCart ?? 'Add'}
                className='absolute -bottom-[7px] -right-[7px] flex h-[31px] w-[31px] items-center justify-center rounded-full border-[3px] border-background bg-white text-black shadow-[0_2px_6px_rgba(0,0,0,0.4)] transition active:scale-[0.85]'>
                <Plus className='h-4 w-4' strokeWidth={2.6} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

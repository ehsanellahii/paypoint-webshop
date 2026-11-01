'use client';

import { Plus, Minus } from 'lucide-react';
import { formatPrice } from '@/lib/api';
import { cn, getImageURL, MenuProduct } from '~/lib/utils';
import FavoriteButton from './FavoriteButton';
import SoldOutLabel from './SoldOutLabel';
import { useStore } from '~/contexts/store-context';
import { useLanguage } from '~/contexts/language-context';
import { useCart } from '~/contexts/cart-context';
import { flyToCart } from '~/lib/flyToCart';
import { hasOptions, isSoldOut, requiresConfiguration } from '~/lib/productConfig';
import SmartImage from '~/lib/SmartImage';

interface ProductCardProps {
  product: MenuProduct;
  onClick: () => void;
}

const Stepper = ({
  className,
  qty,
  inc,
  dec,
}: {
  className?: string;
  qty: number;
  inc: (e: React.MouseEvent<HTMLButtonElement>) => void;
  dec: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) => {
  const { t } = useLanguage();
  return (
    <div className={cn('flex items-center gap-2 rounded-[15px] bg-white/95 px-2 py-1 shadow-[0_6px_18px_-6px_rgba(0,0,0,0.45)] backdrop-blur anim-heartin', className)}>
      <button onClick={dec} aria-label={t.decreaseQuantity} className='flex h-8 w-8 items-center justify-center rounded-full bg-control-light transition active:scale-[0.82]'>
        <Minus className='h-4 w-4 text-black' strokeWidth={2.8} />
      </button>
      <span className='min-w-5 text-center text-[17px] font-extrabold tabular-nums text-black'>{qty}</span>
      <button onClick={inc} aria-label={t.increaseQuantity} className='flex h-8 w-8 items-center justify-center rounded-full bg-black transition active:scale-[0.82]'>
        <Plus className='h-4 w-4 text-white' strokeWidth={2.8} />
      </button>
    </div>
  );
};

/** How many of this product are in the cart, over all its lines (sizes, extras, notes). */
const InCartBadge = ({ count, className }: { count: number; className?: string }) => (
  <span
    className={cn(
      'anim-pop pointer-events-none flex h-[25px] min-w-[25px] items-center justify-center rounded-[13px] border-[3px] border-surface-1 bg-primary px-1.5 text-[12.5px] font-extrabold text-selected-text',
      className
    )}>
    {count}
  </span>
);

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const storeInfo = useStore();
  const { t } = useLanguage();
  const storeKey = storeInfo?.slug || 'default';
  const logoURL = storeInfo?.settings?.logo || '';
  const { cart, addToCart, updateQuantity } = useCart();

  const hasPhoto = !!product.images?.length;
  const imageUrl = hasPhoto ? getImageURL(product.images[0]) : logoURL;

  const skus = product.skus ?? [];
  const hasSizeChoice = skus.length > 1;
  const soldOut = isSoldOut(product);
  /*
   * One tap adds only a plain product. Anything with something to choose — a
   * size, a required group, or optional extras such as "Mit Käse überbacken
   * +2 €" — opens the product modal, or the guest could never reach the
   * extras or the note (1.11.2026).
   */
  const opensModal = requiresConfiguration(product) || hasOptions(product);

  const lines = cart.filter((i) => i.product.id === product.id);
  const inCart = lines.reduce((sum, i) => sum + i.quantity, 0);
  // The stepper is for plain products only: on anything configurable a "+"
  // would add a copy of whichever line came first, size and extras unasked.
  const simpleLine = opensModal ? undefined : lines.find((i) => Object.keys(i.customizations || {}).length === 0);
  const qty = simpleLine?.quantity ?? 0;

  // "ab" the cheapest size the guest can still order.
  const orderable = skus.filter((sku) => sku.available !== false);
  const fromPrice = hasSizeChoice ? Math.min(...(orderable.length ? orderable : skus).map((sku) => sku.price)) : null;

  const activate = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    // A sold-out product opens its details, where the add button says why it is off.
    if (soldOut || opensModal) {
      onClick();
      return;
    }
    flyToCart(e.currentTarget, imageUrl || '');
    addToCart(product, 1, {});
  };

  const inc = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (simpleLine) updateQuantity(simpleLine.id, simpleLine.quantity + 1);
  };
  const dec = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (simpleLine) updateQuantity(simpleLine.id, simpleLine.quantity - 1);
  };

  return (
    <div
      onClick={activate}
      className={cn(
        'wzcard group relative flex cursor-pointer gap-4 rounded-[18px] border border-border bg-surface-1 p-4 transition',
        !soldOut && 'hover:-translate-y-[3px] hover:border-border-strong hover:bg-surface-2 hover:shadow-[0_12px_28px_rgba(0,0,0,0.38)]'
      )}>
      {/* Left: text */}
      <div className='flex min-w-0 flex-1 flex-col'>
        <div className={cn(soldOut && 'opacity-50')}>
          <div className='line-clamp-2 text-base font-bold leading-[1.25]'>{product.name}</div>
          {product.description && <div className='mt-1.5 line-clamp-2 text-[13px] font-medium leading-[1.45] text-muted-foreground'>{product.description}</div>}
        </div>

        <div className='mt-auto flex items-center justify-between gap-2 pt-3'>
          <span className='flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1'>
            <span className={cn('text-base font-extrabold', soldOut && 'opacity-50')}>
              {fromPrice != null ? `${t.from} ${formatPrice(fromPrice)}` : formatPrice(product.currentPrice)}
            </span>
            {soldOut && <SoldOutLabel />}
          </span>
          <FavoriteButton storeKey={storeKey} productId={product._id} name={product.name} image={product.images?.[0]} price={product.currentPrice} />
        </div>

        {/* No-photo: add / stepper sits under the text */}
        {!hasPhoto && !soldOut && (
          <div className='relative mt-3 self-end' onClick={(e) => e.stopPropagation()}>
            {qty > 0 ? (
              <Stepper qty={qty} inc={inc} dec={dec} />
            ) : (
              <>
                <button
                  onClick={activate}
                  aria-label={`${t.add}: ${product.name}`}
                  className='flex h-10 w-10 items-center justify-center rounded-full bg-primary text-selected-text shadow-[0_4px_10px_rgba(0,0,0,0.4)] transition hover:scale-[1.08] active:scale-[0.85]'>
                  <Plus className='h-[18px] w-[18px]' strokeWidth={2.6} />
                </button>
                {opensModal && inCart > 0 && <InCartBadge count={inCart} className='absolute -right-2 -top-2' />}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: image */}
      {hasPhoto && (
        <div className='relative shrink-0'>
          <div
            className={cn(
              'relative h-[116px] w-[116px] overflow-hidden rounded-[14px] min-[761px]:h-[104px] min-[761px]:w-[104px] min-[981px]:h-[124px] min-[981px]:w-[132px] min-[1181px]:h-[150px] min-[1181px]:w-[172px]',
              soldOut && 'opacity-40 grayscale'
            )}>
            <SmartImage
              src={imageUrl}
              alt={product.name}
              fallbackSrc={logoURL}
              fill
              className={cn('object-cover transition-transform duration-300', !soldOut && 'group-hover:scale-[1.09]')}
              // Covered, not contained: a 16:9 photo in the 172×150 slot is
              // drawn about 270px wide.
              sizes='270px'
            />
          </div>
          {!soldOut &&
            (qty > 0 ? (
              <div className='absolute right-1 top-1' onClick={(e) => e.stopPropagation()}>
                <Stepper qty={qty} inc={inc} dec={dec} />
              </div>
            ) : (
              <>
                {opensModal && inCart > 0 && <InCartBadge count={inCart} className='absolute -right-2 -top-2 z-[2]' />}
                <button
                  onClick={activate}
                  aria-label={`${t.add}: ${product.name}`}
                  className='absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-surface-1 bg-primary text-selected-text shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition hover:scale-[1.08] active:scale-[0.85]'>
                  <Plus className='h-[17px] w-[17px]' strokeWidth={2.6} />
                </button>
              </>
            ))}
        </div>
      )}
    </div>
  );
}

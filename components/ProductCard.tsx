'use client';

import { Plus, Minus } from 'lucide-react';
import { formatPrice } from '@/lib/api';
import { cn, getImageURL, MenuProduct } from '~/lib/utils';
import FavoriteButton from './FavoriteButton';
import { useStore } from '~/contexts/store-context';
import { useCart } from '~/contexts/cart-context';
import { flyToCart } from '~/lib/flyToCart';
import SmartImage from '~/lib/SmartImage';

interface ProductCardProps {
  product: MenuProduct;
  onClick: () => void;
}

const POPULAR = /margherita|salami|hawaii|cheeseburger|bestseller/i;
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
}) => (
  <div className={cn('flex items-center gap-2 rounded-[15px] bg-white/95 px-2 py-1 shadow-[0_6px_18px_-6px_rgba(0,0,0,0.45)] backdrop-blur anim-heartin', className)}>
    <button onClick={dec} aria-label='less' className='flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f0f2] transition active:scale-[0.82]'>
      <Minus className='h-4 w-4 text-black' strokeWidth={2.8} />
    </button>
    <span className='min-w-5 text-center text-[17px] font-extrabold tabular-nums text-black'>{qty}</span>
    <button onClick={inc} aria-label='more' className='flex h-8 w-8 items-center justify-center rounded-full bg-black transition active:scale-[0.82]'>
      <Plus className='h-4 w-4 text-white' strokeWidth={2.8} />
    </button>
  </div>
);

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const storeInfo = useStore();
  const storeKey = storeInfo?.slug || 'default';
  const logoURL = storeInfo?.settings?.logo || '';
  const { cart, addToCart, updateQuantity } = useCart();

  const hasPhoto = !!product.images?.length;
  const imageUrl = hasPhoto ? getImageURL(product.images[0]) : logoURL;

  // Products with a required customization group must be configured in the modal.
  const requiresModal = product.haveCustomizations && (product.addOns || []).some((g) => (g.minimumQuantity ?? 0) > 0);

  // The "simple" (no-customization) cart line for this product.
  const simpleLine = cart.find((i) => i.product.id === product.id && Object.keys(i.customizations || {}).length === 0);
  const qty = simpleLine?.quantity ?? 0;
  const popular = POPULAR.test(product.name || '');

  const quickAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (requiresModal) {
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
      //@ts-expect-error Wrong type error
      onClick={quickAdd}
      className='wzcard group relative flex cursor-pointer gap-4 rounded-[18px] border border-border bg-surface-1 p-4 transition hover:-translate-y-[3px] hover:border-border-strong hover:bg-surface-2 hover:shadow-[0_12px_28px_rgba(0,0,0,0.38)]'>
      {/* Left: text */}
      <div className='flex min-w-0 flex-1 flex-col'>
        {popular && (
          <div className='mb-2 inline-flex items-center gap-1.5 self-start text-[12px] font-bold text-star'>
            <svg width='13' height='13' viewBox='0 0 24 24' fill='currentColor'>
              <path d='M12 2.5l2.9 6 6.5.6-4.9 4.3 1.5 6.4L12 16.9 5.9 19.8l1.5-6.4L2.5 9.1l6.5-.6z' />
            </svg>
            Popular
          </div>
        )}
        <div className='line-clamp-2 text-base font-bold leading-[1.25]'>{product.name}</div>
        {product.description && <div className='mt-1.5 line-clamp-2 text-[13px] font-medium leading-[1.45] text-muted-foreground'>{product.description}</div>}

        <div className='mt-auto flex items-center justify-between pt-3'>
          <span className='text-base font-extrabold'>{formatPrice(product.currentPrice)}</span>
          <FavoriteButton storeKey={storeKey} productId={product._id} name={product.name} image={product.images?.[0]} price={product.currentPrice} />
        </div>

        {/* No-photo: add / stepper sits under the text */}
        {!hasPhoto && (
          <div className='mt-3 self-end' onClick={(e) => e.stopPropagation()}>
            {qty > 0 ? (
              <Stepper qty={qty} inc={inc} dec={dec} />
            ) : (
              <button
                onClick={quickAdd}
                aria-label='Add'
                className='flex h-10 w-10 items-center justify-center rounded-full bg-primary text-selected-text shadow-[0_4px_10px_rgba(0,0,0,0.4)] transition hover:scale-[1.08] active:scale-[0.85]'>
                <Plus className='h-[18px] w-[18px]' strokeWidth={2.6} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right: image */}
      {hasPhoto && (
        <div className='relative shrink-0'>
          <div className='img-shimmer relative h-[124px] w-[132px] overflow-hidden rounded-[14px] md:h-[150px] md:w-[172px]'>
            <SmartImage
              src={imageUrl}
              alt={product.name}
              fallbackSrc={logoURL}
              fill
              className='object-cover transition-transform duration-300 group-hover:scale-[1.09]'
              sizes='172px'
            />
          </div>
          {qty > 0 ? (
            <div className='absolute right-1 top-1' onClick={(e) => e.stopPropagation()}>
              <Stepper qty={qty} inc={inc} dec={dec} />
            </div>
          ) : (
            <button
              onClick={quickAdd}
              aria-label='Add'
              className='absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-surface-1 bg-primary text-selected-text shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition hover:scale-[1.08] active:scale-[0.85]'>
              <Plus className='h-[17px] w-[17px]' strokeWidth={2.6} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

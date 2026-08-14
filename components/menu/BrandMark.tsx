'use client';

/* eslint-disable @next/next/no-img-element */
import { useStore } from '~/contexts/store-context';
import { cn } from '~/lib/utils';

/**
 * The store's logo, used as the brand mark everywhere.
 *
 * The design replaced the typographic wordmark with the logo image at three
 * sizes — 48px in the header, 76px in the auth hero, 150px in the menu hero.
 * A plain <img> rather than next/image: the height is fixed and the width is
 * intrinsic, so there is nothing to optimise by layout and every tenant serves
 * a different host.
 *
 * Stores without a logo fall back to the brand name in the script face, so the
 * header is never empty.
 */
const HEIGHTS = {
  header: 'h-12 rounded-[10px]', // 48px
  auth: 'h-[76px] rounded-[14px]',
  hero: 'h-[150px] rounded-[20px]',
} as const;

const FALLBACK_TEXT = {
  header: 'text-[25px]',
  auth: 'text-[34px]',
  hero: 'text-[42px] sm:text-[62px]',
} as const;

export default function BrandMark({ size = 'header', onClick }: { size?: keyof typeof HEIGHTS; onClick?: () => void }) {
  const storeInfo = useStore();
  const logo = storeInfo?.settings?.logo || storeInfo?.logo || '';
  const brand = storeInfo?.brandName || 'Restaurant';

  const content = logo ? (
    /*
     * No alignment of its own: the navbar centres it in a row, while the auth
     * heroes are column flex and pin it with `items-start` (without which
     * `align-self: stretch` beats `w-auto` and squashes the artwork).
     */
    <img src={logo} alt={brand} className={cn('block w-auto', HEIGHTS[size])} />
  ) : (
    <span className={cn('font-script leading-none text-white', FALLBACK_TEXT[size])}>{brand}</span>
  );

  if (!onClick) return content;
  return (
    <button type='button' onClick={onClick} aria-label={brand} className='flex shrink-0 items-center'>
      {content}
    </button>
  );
}

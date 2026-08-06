'use client';

import Image from 'next/image';
import { useStore } from '~/contexts/store-context';

/**
 * Brand mark used in the header / hero.
 * If the store has a logo we show it; otherwise we render the brand name in the
 * prototype's script font with a small tagline underneath.
 */
export default function BrandMark({ size = 'sm', onClick }: { size?: 'sm' | 'lg'; onClick?: () => void }) {
  const storeInfo = useStore();
  const logo = storeInfo?.settings?.logo || storeInfo?.logo || '';
  const brand = storeInfo?.brandName || 'Restaurant';

  const scriptSize = size === 'lg' ? 'text-[34px]' : 'text-[25px]';
  const tagSize = size === 'lg' ? 'text-[10px]' : 'text-[8.5px]';

  return (
    <div onClick={onClick} className={onClick ? 'flex items-center gap-3 cursor-pointer' : 'flex items-center gap-3'}>
      {logo ? (
        <div className='relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white'>
          <Image src={logo} alt={brand} fill className='object-contain' sizes='40px' />
        </div>
      ) : null}
      <div className='flex flex-col leading-[0.9]'>
        <span className={`font-script ${scriptSize} leading-none text-white`}>{brand}</span>
        <span className={`font-display font-extrabold ${tagSize} mt-0.5 tracking-[0.18em]`}>
          <span className='text-brand-green'>ONLINE</span> <span className='text-[#cfd2d6]'>·</span> <span className='text-brand-red'>ORDER</span>
        </span>
      </div>
    </div>
  );
}

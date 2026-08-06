'use client';

import { useStore } from '~/contexts/store-context';
import { useLanguage } from '~/contexts/language-context';
import { getTodayTimings, isRestaurantOpen } from '~/lib/restaurantTimings';

export default function MenuHero() {
  const storeInfo = useStore();
  const { t } = useLanguage();
  const brand = storeInfo?.brandName || 'Restaurant';
  const cover = storeInfo?.settings?.logo || storeInfo?.logo || '';
  const open = isRestaurantOpen(storeInfo?.timings || {});
  const { close } = getTodayTimings(storeInfo?.timings);
  const address = [storeInfo?.address, storeInfo?.city].filter(Boolean).join(' · ');

  return (
    <div className='mx-auto max-w-[1320px] px-4 pt-7 md:px-8'>
      <div className='relative h-[196px] overflow-hidden rounded-3xl sm:h-[260px]'>
        {/* Background */}
        <div
          className='absolute inset-0 bg-surface-3 bg-cover bg-center'
          style={cover ? { backgroundImage: `url(${cover})`, filter: 'contrast(1.04) saturate(1.05) brightness(0.55)' } : { background: 'linear-gradient(135deg,#26262a,#141416)' }}
        />
        <div className='absolute inset-0 bg-[rgba(15,15,17,0.32)]' />

        <div className='absolute inset-0 flex flex-col justify-end p-7 md:p-10'>
          {/* Open badge */}
          <div className='mb-3.5 inline-flex self-start items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.05em]'>
            <span className={`h-[7px] w-[7px] rounded-full ${open ? 'bg-success anim-pulse-ring' : 'bg-brand-red'}`} />
            {open ? `${t.openUntil ?? 'Open until'} ${close}` : (t.closed ?? 'Closed')}
          </div>

          <div className='leading-[0.95]'>
            <span className='font-script text-[42px] leading-[0.85] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[62px]'>{brand}</span>
          </div>
          {address && <div className='mt-3 text-sm font-medium text-[#d6d8dc]'>{address}</div>}
        </div>
      </div>
    </div>
  );
}

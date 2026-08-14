'use client';

import { Clock, Leaf, Star } from 'lucide-react';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { getStoreCover } from '~/lib/storeMedia';
import BrandMark from '~/components/menu/BrandMark';

/**
 * Left brand panel of the auth card (prototype: the `wzauthhero` block, shared
 * verbatim by the login, OTP and delivery-zone screens). Hidden below 760px,
 * where the prototype collapses the card to the form alone.
 */
export default function AuthHero({ title, sub }: { title: string; sub?: string }) {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const cover = getStoreCover(storeInfo);

  return (
    <div className='relative hidden min-h-[600px] min-w-0 flex-col justify-between overflow-hidden p-[46px_44px] md:flex'>
      {/* Design: `background-size:100% auto; background-position:center top`.
          `bg-cover` zoomed the photo in and cropped the sides. */}
      <div
        className='absolute inset-0 bg-[#0f0f11] bg-top bg-no-repeat'
        style={cover ? { backgroundImage: `url("${cover}")`, backgroundSize: '100% auto' } : undefined}
      />
      <div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(15,15,17,0.55),rgba(15,15,17,0.82))]' />

      <div className='relative flex flex-col items-start leading-[0.9]'>
        <BrandMark size='auth' />
      </div>

      <div className='relative'>
        <h2 className='m-0 max-w-[340px] font-serif text-[38px] font-extrabold leading-[1.08] tracking-[-0.02em]'>{title}</h2>
        {sub ? (
          <p className='mt-4 max-w-[330px] text-[15px] font-medium leading-relaxed text-fg-on-photo-2'>{sub}</p>
        ) : (
          <div className='mt-[26px] flex flex-col gap-3.5'>
            {[
              { icon: Clock, text: t.zoneFeature1, tint: 'text-white' },
              { icon: Leaf, text: t.zoneFeature2, tint: 'text-brand-green' },
              { icon: Star, text: t.zoneFeature3, tint: 'text-star' },
            ].map(({ icon: Icon, text, tint }, i) => (
              <div key={i} className='flex items-center gap-3'>
                <span className='flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-white/[0.12] backdrop-blur'>
                  <Icon className={`h-[19px] w-[19px] ${tint}`} strokeWidth={1.7} />
                </span>
                <span className='text-[14.5px] font-semibold text-fg-strong'>{text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

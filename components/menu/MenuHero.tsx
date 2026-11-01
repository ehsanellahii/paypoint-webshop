'use client';

import { useAddress } from '~/contexts/address-context';
import { useStore } from '~/contexts/store-context';
import BrandMark from './BrandMark';
import { useLanguage } from '~/contexts/language-context';
import { deliveryLaterLabel, orderingStatus } from '~/lib/restaurantTimings';
import { getStoreCover } from '~/lib/storeMedia';
import { formatStoreAddress } from '~/lib/storeAddress';

export default function MenuHero() {
  const storeInfo = useStore();
  const { t } = useLanguage();
  const { orderType } = useAddress();
  const cover = getStoreCover(storeInfo);
  /*
   * By the hours of the selected order type: a delivery reads the store's
   * delivery hours when it has its own. Delivery not started yet while pickup
   * is open is its own state — "Lieferung ab 14:00 · Abholung jetzt möglich",
   * never "Geschlossen".
   */
  const status = orderingStatus(storeInfo, orderType);
  const open = status.state === 'open';
  const close = status.state === 'open' ? status.close : '';
  const pickupOffered = storeInfo?.settings?.orderTypes?.takeaway ?? true;
  // "Adalbertstraße 36, 10179 Berlin" — the free text already carries the city, so joining it again printed it twice.
  const address = formatStoreAddress(storeInfo);

  return (
    <div className='shell shell-pad pt-7'>
      {/*
        A minimum height, not a fixed one. The design's hero is 260px, but its
        own content — badge, the 150px brand mark and the address — adds up to
        more than that, so with `justify-end` the badge was pushed out through
        the top edge. Letting the box grow keeps the design's height wherever
        the content fits and honours its padding where it doesn't.
      */}
      <div className='relative flex min-h-49 flex-col overflow-hidden rounded-3xl sm:min-h-65'>
        {/* Background */}
        <div
          className='absolute inset-0 bg-surface-3 bg-cover bg-center'
          style={cover ? { backgroundImage: `url("${cover}")`, filter: 'contrast(1.04) saturate(1.05) brightness(0.55)' } : { background: 'linear-gradient(135deg,#26262a,#141416)' }}
        />
        <div className='absolute inset-0 bg-[rgba(15,15,17,0.32)]' />

        {/* In flow, so it drives the height; `flex-1` keeps it bottom-aligned
            while the box is still at its minimum. */}
        <div className='relative flex flex-1 flex-col justify-end p-7 md:p-10'>
          {/* Open badge */}
          {status.state === 'deliveryLater' ? (
            <div className='mb-3.5 inline-flex self-start items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.05em]'>
              <span className='h-[7px] w-[7px] rounded-full bg-warning' />
              {deliveryLaterLabel(status.deliveryOpensAt, t)}
              {pickupOffered ? ` · ${t.pickupPossibleNow}` : ''}
            </div>
          ) : (
            <div className='mb-3.5 inline-flex self-start items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.05em]'>
              <span className={`h-[7px] w-[7px] rounded-full ${open ? 'bg-success anim-pulse-ring' : 'bg-brand-red'}`} />
              {open ? `${t.openUntil ?? 'Open until'} ${close}` : (t.closed ?? 'Closed')}
            </div>
          )}

          <div className='leading-[0.95]'>
            <BrandMark size='hero' />
          </div>
          {address && <div className='mt-3 text-sm font-medium text-fg-on-photo'>{address}</div>}
        </div>
      </div>
    </div>
  );
}

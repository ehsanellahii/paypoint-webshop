'use client';

import { X, Star, MapPin, Phone } from 'lucide-react';
import { Dialog } from '@base-ui/react/dialog';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { cn } from '~/lib/utils';
import BrandMark from './BrandMark';

type Props = { open: boolean; onClose: () => void };

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const DAY_LABELS: Record<'de' | 'en', Record<string, string>> = {
  de: { monday: 'Montag', tuesday: 'Dienstag', wednesday: 'Mittwoch', thursday: 'Donnerstag', friday: 'Freitag', saturday: 'Samstag', sunday: 'Sonntag' },
  en: { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' },
};

export default function RestaurantInfoModal({ open, onClose }: Props) {
  const { t, language } = useLanguage();
  const storeInfo = useStore();
  const timings = (storeInfo?.timings as Record<string, { open: string; close: string }> | null | undefined) || {};
  const labels = DAY_LABELS[language === 'de' ? 'de' : 'en'];
  const todayKey = DAY_ORDER[(new Date().getDay() + 6) % 7]; // JS 0=Sun → shift to Mon-first

  const rows = DAY_ORDER.filter((k) => timings[k]?.open && timings[k]?.close);
  const address = [storeInfo?.address, storeInfo?.postalCode, storeInfo?.city].filter(Boolean).join(', ');

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 z-[59] bg-black/74 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0' />
        <Dialog.Viewport className='fixed inset-0 z-[59] flex items-center justify-center p-4'>
          <Dialog.Popup className='anim-scalein flex max-h-[88vh] w-[520px] max-w-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[0_40px_90px_-20px_rgba(0,0,0,0.8)]'>
            <Dialog.Close aria-label={t.close} className='absolute right-[18px] top-[18px] z-[4] flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-white transition active:scale-90'>
              <X className='h-[18px] w-[18px]' strokeWidth={2.2} />
            </Dialog.Close>

            <div className='min-h-0 flex-1 overflow-y-auto scrollbar-hide p-7'>
              <Dialog.Title className='sr-only'>{storeInfo?.brandName}</Dialog.Title>
              <BrandMark size='lg' />

              <div className='mt-4 flex flex-wrap items-center gap-2.5 text-[13.5px] font-semibold text-[#b9bbbf]'>
                <span className='inline-flex items-center gap-1.5'>
                  <Star className='h-[15px] w-[15px] fill-star text-star' />
                  <span className='font-bold text-white'>4.8</span> (820+)
                </span>
                <span className='opacity-35'>·</span>
                <span>
                  {t.deliveryTime ?? 'Delivery time'} <span className='font-bold text-white'>30–40 Min.</span>
                </span>
              </div>

              {/* Opening hours */}
              <h3 className='mb-3 mt-7 text-base font-extrabold'>{t.openingHours ?? 'Opening hours'}</h3>
              {rows.length > 0 ? (
                <div className='overflow-hidden rounded-[14px] bg-surface-3'>
                  {rows.map((k, i) => (
                    <div key={k} className={cn('flex items-center justify-between px-4 py-3', i < rows.length - 1 && 'border-b border-white/5', k === todayKey && 'bg-white/[0.04]')}>
                      <span className={cn('text-sm font-bold', k === todayKey ? 'text-white' : 'text-white')}>{labels[k]}</span>
                      <span className='text-sm font-semibold text-[#b9bbbf]'>
                        {timings[k].open} – {timings[k].close}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='rounded-[14px] bg-surface-3 px-4 py-3 text-sm text-muted-foreground'>—</div>
              )}

              {/* Address & contact */}
              <h3 className='mb-3 mt-7 text-base font-extrabold'>{t.addressContact ?? 'Address & contact'}</h3>
              <div className='flex flex-col gap-2.5'>
                {address && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-3 rounded-[14px] bg-surface-3 p-3.5 transition hover:bg-elevated'>
                    <MapPin className='h-5 w-5 text-muted-foreground' />
                    <span className='text-sm font-semibold'>{address}</span>
                  </a>
                )}
                {storeInfo?.phone && (
                  <a href={`tel:${storeInfo.phone}`} className='flex items-center gap-3 rounded-[14px] bg-surface-3 p-3.5 transition hover:bg-elevated'>
                    <Phone className='h-5 w-5 text-muted-foreground' />
                    <span className='text-sm font-semibold text-white'>{storeInfo.phone}</span>
                  </a>
                )}
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

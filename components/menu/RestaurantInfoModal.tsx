'use client';

import { X, MapPin, Phone, Mail, Globe, AlertTriangle } from 'lucide-react';
import { Dialog } from '@base-ui/react/dialog';
import { useAddress } from '~/contexts/address-context';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { formatPrice } from '@/lib/api';
import { cn, formatEtaRange, getPostalRateInfo } from '~/lib/utils';

type Props = { open: boolean; onClose: () => void };

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const DAY_LABELS: Record<'de' | 'en', Record<string, string>> = {
  de: { monday: 'Montag', tuesday: 'Dienstag', wednesday: 'Mittwoch', thursday: 'Donnerstag', friday: 'Freitag', saturday: 'Samstag', sunday: 'Sonntag' },
  en: { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' },
};

export default function RestaurantInfoModal({ open, onClose }: Props) {
  const { t, language } = useLanguage();
  const storeInfo = useStore();
  const { deliveryAddress } = useAddress();
  const timings = (storeInfo?.timings as Record<string, { open: string; close: string }> | null | undefined) || {};
  const labels = DAY_LABELS[language === 'de' ? 'de' : 'en'];
  const todayKey = DAY_ORDER[(new Date().getDay() + 6) % 7]; // JS 0=Sun → shift to Mon-first

  const rows = DAY_ORDER.filter((k) => timings[k]?.open && timings[k]?.close);
  const address = [storeInfo?.address, storeInfo?.postalCode, storeInfo?.city].filter(Boolean).join(', ');

  // The branch line only earns its place when it says something the heading
  // does not — many stores name the branch after the firm.
  const branch = storeInfo?.name && storeInfo.name !== storeInfo?.brandName ? storeInfo.name : '';
  const name = storeInfo?.brandName || storeInfo?.name || '';
  const logo = storeInfo?.settings?.logo || storeInfo?.logo || '';
  const rate = getPostalRateInfo(Number(deliveryAddress?.postalCode || 0), storeInfo?.postalRates || []);

  /*
   * The customer's own zone first, then the store-wide figure. Older store
   * records predate `deliveryTime`, so the schema default of 30 was never
   * written to them — falling back to any configured zone keeps a real number
   * on screen instead of a "missing" marker for a store that does set one.
   */
  const etaMinutes =
    rate.deliveryTime ?? storeInfo?.deliveryTime ?? storeInfo?.postalRates?.find((r) => r.deliveryTime)?.deliveryTime ?? null;
  const eta = formatEtaRange(etaMinutes);

  // "Burritos · Nachos · Quesadillas · €€"
  const cuisine = [...(storeInfo?.cuisineTags ?? []), storeInfo?.priceLevel].filter(Boolean).join(' · ');

  /**
   * Marks a value the backend never supplied, so an incomplete store record is
   * obvious in the UI rather than showing as a silently absent line.
   *
   * These are visible to customers — they are meant to be, while the data is
   * being filled in. Gate on NODE_ENV once every store is complete.
   */
  function Missing({ label, compact }: { label: string; compact?: boolean }) {
    return (
      <span
        title={`${label}: ${t.notProvided}`}
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-dashed border-warning/60 text-[11px] font-bold uppercase tracking-[0.03em] text-warning',
          compact ? 'px-1 py-0.5' : 'px-1.5 py-[3px]',
        )}>
        <AlertTriangle className='h-3 w-3 shrink-0' strokeWidth={2.2} />
        {compact ? '' : `${label} ${t.notProvided}`}
      </span>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 z-[59] bg-black/74 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0' />
        <Dialog.Viewport className='fixed inset-0 z-[59] flex items-center justify-center p-4'>
          <Dialog.Popup className='anim-scalein relative flex max-h-[88vh] w-[520px] max-w-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[0_40px_90px_-20px_rgba(0,0,0,0.8)]'>
            <Dialog.Close aria-label={t.close} className='absolute right-[18px] top-[18px] z-[4] flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-white transition active:scale-90'>
              <X className='h-[18px] w-[18px]' strokeWidth={2.2} />
            </Dialog.Close>

            <div className='min-h-0 flex-1 overflow-y-auto scrollbar-hide p-7'>
              {/* Identity row — logo beside the name, per the design. The name
                  used to be screen-reader-only, so the dialog opened with a
                  logo and no statement of whose restaurant this is. */}
              <div className='flex items-center gap-3.5 pr-12'>
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt={name} className='h-[52px] w-[52px] shrink-0 rounded-[13px] object-cover' />
                ) : (
                  <span className='flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[13px] bg-surface-3'>
                    <Missing label={t.fieldLogo} compact />
                  </span>
                )}
                <div className='min-w-0'>
                  <Dialog.Title className='truncate text-[21px] font-black leading-tight tracking-[-0.02em]'>{name}</Dialog.Title>
                  <div className='mt-1 truncate text-[13px] font-semibold text-muted-foreground'>
                    {cuisine || branch || <Missing label={t.fieldCuisine} />}
                  </div>
                </div>
              </div>

              {/* Meta row */}
              <div className='mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[13.5px] font-semibold text-fg-secondary'>
                <span>
                  {t.deliveryTime ?? 'Delivery time'}{' '}
                  {eta ? <span className='font-bold text-white'>{eta} Min.</span> : <Missing label={t.fieldDeliveryTime} />}
                </span>
                <span className='opacity-35'>·</span>
                <span>
                  {t.minimumOrderValue ?? 'MOV'}{' '}
                  {rate.minimumOrderAmount != null ? (
                    <span className='font-bold text-white'>{formatPrice(rate.minimumOrderAmount)}</span>
                  ) : (
                    <Missing label={t.fieldMinimumOrder} />
                  )}
                </span>
              </div>

              {/* Opening hours */}
              <h3 className='mb-3 mt-7 text-base font-extrabold'>{t.openingHours ?? 'Opening hours'}</h3>
              {rows.length > 0 ? (
                <div className='overflow-hidden rounded-[14px] bg-surface-3'>
                  {rows.map((k, i) => (
                    <div key={k} className={cn('flex items-center justify-between px-4 py-3', i < rows.length - 1 && 'border-b border-white/5', k === todayKey && 'bg-white/[0.04]')}>
                      <span className={cn('text-sm font-bold', k === todayKey ? 'text-white' : 'text-white')}>{labels[k]}</span>
                      <span className='text-sm font-semibold text-fg-secondary'>
                        {timings[k].open} – {timings[k].close}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='rounded-[14px] bg-surface-3 px-4 py-3'>
                  <Missing label={t.fieldOpeningHours} />
                </div>
              )}

              {/* Address & contact */}
              <h3 className='mb-3 mt-7 text-base font-extrabold'>{t.addressContact ?? 'Address & contact'}</h3>
              <div className='flex flex-col gap-2.5'>
                {!address && (
                  <div className='rounded-[14px] bg-surface-3 p-3.5'>
                    <Missing label={t.fieldAddress} />
                  </div>
                )}
                {!storeInfo?.phone && (
                  <div className='rounded-[14px] bg-surface-3 p-3.5'>
                    <Missing label={t.fieldPhone} />
                  </div>
                )}
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
                {storeInfo?.email && (
                  <a href={`mailto:${storeInfo.email}`} className='flex items-center gap-3 rounded-[14px] bg-surface-3 p-3.5 transition hover:bg-elevated'>
                    <Mail className='h-5 w-5 text-muted-foreground' />
                    <span className='truncate text-sm font-semibold text-white'>{storeInfo.email}</span>
                  </a>
                )}
                {storeInfo?.website && (
                  <a
                    href={/^https?:\/\//i.test(storeInfo.website) ? storeInfo.website : `https://${storeInfo.website}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-3 rounded-[14px] bg-surface-3 p-3.5 transition hover:bg-elevated'>
                    <Globe className='h-5 w-5 text-muted-foreground' />
                    <span className='truncate text-sm font-semibold text-white'>{storeInfo.website}</span>
                  </a>
                )}
              </div>

              {/* Closing description, as in the design. */}
              <p className='mt-6 text-[12.5px] font-medium leading-relaxed text-muted-foreground-2'>
                {storeInfo?.about ? (
                  <span className='whitespace-pre-line'>{storeInfo.about}</span>
                ) : (
                  <Missing label={t.fieldDescription} />
                )}
              </p>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

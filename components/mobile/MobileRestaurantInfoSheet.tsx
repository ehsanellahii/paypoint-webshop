'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight, Info, Mail, MapPin, Phone, Shield } from 'lucide-react';

import MobileSheet, { SheetDivider, SheetGroup } from '~/components/mobile/MobileSheet';
import { useAddress } from '~/contexts/address-context';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { berlinClockAt } from '~/lib/berlinTime';
import { dayHoursText, deliveryLaterLabel, nextOpeningLabel, orderingStatus, windowsFor, WEEKDAY_KEYS, type WeeklyHours } from '~/lib/restaurantTimings';
import { formatStoreAddress } from '~/lib/storeAddress';
import { cn } from '~/lib/utils';

/** Monday first, as a week is read in Germany; values are the timings' day index (0 = Sunday). */
const WEEK = [1, 2, 3, 4, 5, 6, 0] as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className='mb-2.5 mt-6 text-[12px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground'>{children}</div>;
}

/** One week of hours, Monday first, today marked — the opening hours, or a store's own delivery hours. */
function WeekHours({ timings, todayIndex }: { timings: WeeklyHours; todayIndex: number }) {
  const { t } = useLanguage();
  return (
    <SheetGroup>
      {WEEK.map((d, i) => {
        // Every window of the day ("11:30 – 15:00, 17:30 – 22:00"); none for a day ticked closed.
        const hours = dayHoursText(timings, d);
        const isToday = d === todayIndex;
        return (
          <div key={d} className={cn('flex items-center justify-between gap-3 px-4 py-3', i < WEEK.length - 1 && 'border-b border-white/[0.06]', isToday && 'bg-white/[0.04]')}>
            <span className={cn('text-[14.5px]', isToday ? 'font-extrabold text-white' : 'font-semibold text-fg-strong')}>
              {t[WEEKDAY_KEYS[d]]}
              {isToday && <span className='ml-2 text-[12px] font-bold text-muted-foreground'>{t.today}</span>}
            </span>
            <span className={cn('text-right text-[14px] font-semibold tabular-nums', hours ? 'text-fg-secondary' : 'text-muted-foreground-2')}>
              {hours ?? t.closedToday}
            </span>
          </div>
        );
      })}
    </SheetGroup>
  );
}

/** A tappable row inside a `SheetGroup` — the account drawer's row, as a link or a button. */
function LinkRow({ icon: Icon, label, href, onClick, external }: { icon: typeof Phone; label: string; href?: string; onClick?: () => void; external?: boolean }) {
  const inner = (
    <>
      <Icon className='h-[21px] w-[21px] shrink-0 text-white' strokeWidth={1.8} />
      <span className='min-w-0 flex-1 break-words text-[15px] font-semibold text-white'>{label}</span>
      <ChevronRight className='h-[18px] w-[18px] shrink-0 text-muted-foreground' strokeWidth={2} />
    </>
  );
  const cls = 'flex min-h-[52px] w-full items-center gap-3.5 px-4 py-[13px] text-left transition active:bg-white/[0.04]';
  return href ? (
    <a href={href} className={cls} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {inner}
    </a>
  ) : (
    <button type='button' onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/**
 * The restaurant's details on a phone: today's status, the week's hours,
 * address, phone and the legal pages. Opened from the mobile menu header.
 *
 * Hours are read in Berlin time, like everything else about opening — a guest
 * abroad still sees the kitchen's own day and clock.
 */
export default function MobileRestaurantInfoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const router = useRouter();
  const { base, withToken } = useStoreNavigation();
  const { orderType } = useAddress();

  const timings = (storeInfo?.timings ?? null) as WeeklyHours;
  /*
   * Today's status by the hours of the selected order type, as the menu header
   * says it: delivery hours for a delivery when the store has its own.
   */
  const status = orderingStatus(storeInfo, orderType);
  const next = status.state === 'closed' ? nextOpeningLabel(storeInfo, t, undefined, orderType) : null;
  const pickupOffered = !storeInfo?.tableInfo?.token && (storeInfo?.settings?.orderTypes?.takeaway ?? true);
  const todayIndex = berlinClockAt().dayIndex;
  const hasHours = WEEK.some((d) => windowsFor(timings, d).length > 0);
  // A store with delivery hours of its own: a second week, "Lieferzeiten" (a day without delivery reads "Geschlossen").
  const deliveryTimings = (storeInfo?.deliveryTimings ?? null) as WeeklyHours;
  const hasDeliveryWeek = !!deliveryTimings;

  const address = formatStoreAddress(storeInfo);
  const phone = storeInfo?.phone?.trim() || '';
  const email = storeInfo?.email?.trim() || '';
  const cuisine = (storeInfo?.cuisineTags ?? []).filter(Boolean).join(' · ');

  const openLegal = (page: 'impressum' | 'datenschutz') => {
    onClose();
    router.push(withToken(`${base}/${page}`));
  };

  return (
    <MobileSheet open={open} onClose={onClose} title={storeInfo?.brandName || t.restaurantInfo} maxHeight='88%'>
      {cuisine && <div className='-mt-2 mb-3 text-center text-[13px] font-semibold text-muted-foreground'>{cuisine}</div>}

      {/* Today's status — and, when closed, when it opens next. */}
      <div className='flex items-center gap-2.5 rounded-2xl bg-card px-4 py-3.5'>
        <span
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            status.state === 'open' ? 'bg-success anim-pulse-ring' : status.state === 'deliveryLater' ? 'bg-warning' : 'bg-brand-red',
          )}
        />
        <span className='min-w-0 flex-1 text-[14.5px] font-bold text-white'>
          {status.state === 'open'
            ? t.openNowUntil.replace('{time}', status.close)
            : status.state === 'deliveryLater'
              ? `${deliveryLaterLabel(status.deliveryOpensAt, t)}${pickupOffered ? ` · ${t.pickupPossibleNow}` : ''}`
              : next
                ? `${t.closed} · ${next}`
                : t.closed}
        </span>
      </div>

      {hasHours && (
        <>
          <SectionLabel>{hasDeliveryWeek ? t.openingHoursPickup : t.openingHours}</SectionLabel>
          <WeekHours timings={timings} todayIndex={todayIndex} />
        </>
      )}

      {hasDeliveryWeek && (
        <>
          <SectionLabel>{t.deliveryHours}</SectionLabel>
          <WeekHours timings={deliveryTimings} todayIndex={todayIndex} />
        </>
      )}

      {(address || phone || email) && (
        <>
          <SectionLabel>{t.addressContact}</SectionLabel>
          <SheetGroup>
            {address && <LinkRow icon={MapPin} label={address} href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`} external />}
            {address && (phone || email) && <SheetDivider />}
            {phone && <LinkRow icon={Phone} label={phone} href={`tel:${phone.replace(/[^\d+]/g, '')}`} />}
            {phone && email && <SheetDivider />}
            {email && <LinkRow icon={Mail} label={email} href={`mailto:${email}`} />}
          </SheetGroup>
        </>
      )}

      <SectionLabel>{t.legal}</SectionLabel>
      <SheetGroup>
        <LinkRow icon={Info} label={t.imprint} onClick={() => openLegal('impressum')} />
        <SheetDivider />
        <LinkRow icon={Shield} label={t.privacy} onClick={() => openLegal('datenschutz')} />
      </SheetGroup>

      {storeInfo?.about && <p className='mt-5 whitespace-pre-line text-[12.5px] font-medium leading-relaxed text-muted-foreground-2'>{storeInfo.about}</p>}
    </MobileSheet>
  );
}

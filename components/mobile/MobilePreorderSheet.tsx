'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, Check, Clock, X } from 'lucide-react';
import { Dialog } from '@base-ui/react/dialog';

import WheelColumn, { Wheel, type WheelOption } from './WheelPicker';
import type { PreorderSlot } from '~/components/menu/PreorderModal';
import { generateDaySlots } from '~/lib/generateTimeSlotsWithinHours';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useAddress } from '~/contexts/address-context';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/**
 * Pre-order picker for mobile: two scroll wheels, day and time.
 *
 * Deliberately different from the desktop sheet, which uses day chips and a
 * time input — the handover calls this out as intentional rather than an
 * inconsistency, because a wheel suits a thumb and a list suits a pointer.
 * Both produce the same `PreorderSlot`.
 */
export default function MobilePreorderSheet({ open, onClose, onConfirm, onStandard }: { open: boolean; onClose: () => void; onConfirm: (slot: PreorderSlot) => void; onStandard?: () => void }) {
  const { t, language } = useLanguage();
  const storeInfo = useStore();
  const { orderType } = useAddress();
  const isDelivery = orderType === 'delivery';

  const [dayOffset, setDayOffset] = useState(0);
  const [time, setTime] = useState('');

  const days = useMemo(() => {
    const out: (WheelOption & { key: string; offset: number })[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const weekday = d.toLocaleDateString(language === 'de' ? 'de-DE' : 'en-GB', { weekday: 'long' });
      out.push({
        value: String(i),
        label: i === 0 ? (t.today ?? 'Today') : i === 1 ? (t.tomorrow ?? 'Tomorrow') : weekday,
        key: DAY_KEYS[d.getDay()],
        offset: i,
      });
    }
    return out;
  }, [language, t]);

  /*
   * Slots come from the store's hours for the chosen day — today from the next
   * half hour after now, other days across their whole window, and never past
   * midnight, since a 02:00 close belongs to the following date.
   */
  const times = useMemo(
    () => generateDaySlots({ weeklyHours: storeInfo?.timings as any, dayOffset, intervalMinutes: 30 }),
    [storeInfo?.timings, dayOffset],
  );

  // The chosen time may not exist on a newly chosen day; fall back to the first.
  const activeTime = times.includes(time) ? time : times[0];

  const confirm = () => {
    const day = days.find((d) => d.offset === dayOffset) ?? days[0];
    onConfirm({ dayOffset: day.offset, time: activeTime, label: `${day.label} ${activeTime}` });
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 z-[62] bg-black/70 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0' />
        <Dialog.Viewport className='fixed inset-0 z-[62] flex items-end justify-center'>
          {/* Bottom sheet, on the design's own sheet surface and 26px radius. */}
          <Dialog.Popup
            className='w-full max-w-[440px] rounded-t-[26px] bg-surface-1 px-[18px] pt-2.5'
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 30px)', animation: 'dzslideup .28s cubic-bezier(.22,.8,.3,1) both' }}>
            <div className='mx-auto mb-2.5 h-[5px] w-10 rounded-[3px] bg-elevated' aria-hidden />
            {/* Cancel on the left, close on the right — the design's own header. */}
            <div className='mb-2 flex items-center justify-between'>
              <button onClick={onClose} className='py-1.5 text-[15px] font-semibold text-error-text'>
                {t.cancel ?? 'Cancel'}
              </button>
              <Dialog.Close aria-label={t.close} className='flex h-9 w-9 items-center justify-center rounded-full bg-card text-white transition active:scale-[0.94]'>
                <X className='h-4 w-4' strokeWidth={2.2} />
              </Dialog.Close>
            </div>

            <Dialog.Title className='mb-3.5 block text-[30px] font-black tracking-[-0.02em] text-fg-strong'>
              {isDelivery ? (t.deliverySpeedLabel ?? 'Delivery time') : (t.pickupTime ?? 'Pickup time')}
            </Dialog.Title>

            {/* Standard — dimmed, since the sheet is open on the scheduled mode. */}
            <button
              onClick={() => {
                onStandard?.();
                onClose();
              }}
              className='flex w-full items-center gap-3.5 border-b border-white/[0.08] py-3.5 text-left transition active:opacity-70'>
              <span className='flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-card'>
                <Clock className='h-5 w-5 text-muted-foreground' strokeWidth={1.8} />
              </span>
              <span className='min-w-0 flex-1'>
                <span className='block text-base font-bold text-fg-tertiary'>{t.standard ?? 'Standard'}</span>
                <span className='mt-0.5 block text-[13px] font-medium text-muted-foreground'>{isDelivery ? t.preorderSubDelivery : t.preorderSubPickup}</span>
              </span>
            </button>

            {/* The mode this sheet is for, in the accent. */}
            <div className='flex w-full items-center gap-3.5 border-b border-white/[0.08] py-3.5'>
              <span className='flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-primary'>
                <CalendarClock className='h-5 w-5 text-selected-text' strokeWidth={1.8} />
              </span>
              <span className='min-w-0 flex-1'>
                <span className='block text-base font-bold text-primary'>{t.chooseDeliveryTime ?? 'Choose a time'}</span>
                <span className='mt-0.5 block text-[13px] font-medium text-primary/70'>
                  {days[dayOffset]?.label} · {activeTime}
                </span>
              </span>
              <Check className='h-5 w-5 shrink-0 text-success' strokeWidth={2.6} />
            </div>

            <Wheel>
              <WheelColumn
                ariaLabel={t.day ?? 'Day'}
                className='flex-[1.3]'
                options={days}
                value={String(dayOffset)}
                onChange={(v) => setDayOffset(Number(v))}
              />
              <WheelColumn
                ariaLabel={t.time ?? 'Time'}
                className='flex-1'
                options={times.map((tm) => ({ value: tm, label: tm }))}
                value={activeTime}
                onChange={setTime}
              />
            </Wheel>

            <button onClick={confirm} className='mt-4 h-14 w-full rounded-2xl bg-primary text-[15.5px] font-extrabold text-selected-text transition active:scale-[0.98]'>
              {t.save ?? 'Save'}
            </button>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

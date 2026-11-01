'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, Check, Clock, X } from 'lucide-react';
import { Dialog } from '@base-ui/react/dialog';

import WheelColumn, { Wheel, type WheelOption } from './WheelPicker';
import { bookableDays } from '~/lib/generateTimeSlotsWithinHours';
import { formatSlotDay, formatSlotLabel, PREORDER_PICKER_LEAD_MINUTES, type PreorderSlot } from '~/lib/preorderSlot';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useAddress } from '~/contexts/address-context';

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

  // The chosen day as a Berlin date; null until the guest turns the wheel.
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [time, setTime] = useState('');

  /*
   * The next 7 Berlin days with the times the store's hours allow — from half
   * an hour after now, and with a night store's small hours (00:00 – 05:30)
   * under the calendar date they fall on. Rebuilt on every opening so the
   * wheel never offers a time that has passed meanwhile.
   */
  const days = useMemo(() => {
    const now = Date.now();
    return bookableDays({ weeklyHours: storeInfo?.timings, now, intervalMinutes: 30, minLeadMinutes: PREORDER_PICKER_LEAD_MINUTES }).map(
      (d): WheelOption & { date: string; slots: string[] } => ({
        value: d.date,
        label: formatSlotDay(d.date, { today: t.today, tomorrow: t.tomorrow }, language, now),
        date: d.date,
        slots: d.slots,
      }),
    );
    // `open` is a dependency on purpose: it is what makes "now" current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, t, storeInfo?.timings, open]);

  // Until the guest picks a day, the first one that still has a time on offer.
  const day = days.find((d) => d.date === pickedDate) ?? days.find((d) => d.slots.length > 0) ?? days[0];
  const times = day?.slots ?? [];

  // The chosen time may not exist on a newly chosen day; fall back to the first.
  const activeTime = times.includes(time) ? time : (times[0] ?? '');

  const confirm = () => {
    // No time on offer that day: saving would book "Heute undefined".
    if (!day || !activeTime) return;
    const slot = { date: day.date, time: activeTime };
    onConfirm({ ...slot, label: formatSlotLabel(slot, { today: t.today, tomorrow: t.tomorrow }, language) });
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
                  {day?.label} · {activeTime}
                </span>
              </span>
              <Check className='h-5 w-5 shrink-0 text-success' strokeWidth={2.6} />
            </div>

            <Wheel>
              <WheelColumn
                ariaLabel={t.day ?? 'Day'}
                className='flex-[1.3]'
                options={days}
                value={day?.date ?? ''}
                onChange={setPickedDate}
              />
              <WheelColumn
                ariaLabel={t.time ?? 'Time'}
                className='flex-1'
                options={times.map((tm) => ({ value: tm, label: tm }))}
                value={activeTime}
                onChange={setTime}
              />
            </Wheel>

            <button onClick={confirm} disabled={!activeTime} className='mt-4 h-14 w-full rounded-2xl bg-primary text-[15.5px] font-extrabold text-selected-text transition active:scale-[0.98] disabled:opacity-60'>
              {t.save ?? 'Save'}
            </button>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

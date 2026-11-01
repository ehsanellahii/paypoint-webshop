'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Clock, X } from 'lucide-react';
import { Dialog } from '@base-ui/react/dialog';
import { bookableDays, shortDate } from '~/lib/generateTimeSlotsWithinHours';
import { formatSlotDay, formatSlotLabel, PREORDER_PICKER_LEAD_MINUTES, type PreorderSlot } from '~/lib/preorderSlot';
import { dayKeyOf } from '~/lib/berlinTime';
import { dayHoursText } from '~/lib/restaurantTimings';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useAddress } from '~/contexts/address-context';
import { cn } from '~/lib/utils';

/**
 * A confirmed pre-order slot: a Berlin calendar date and time. Defined in
 * `lib/preorderSlot.ts`; re-exported here because the screens import it from
 * the picker.
 */
export type { PreorderSlot };

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (slot: PreorderSlot) => void;
  /**
   * "Standard" in the design's sheet — drop any slot and go back to the normal
   * window. Optional: callers without a standard mode just close.
   */
  onStandard?: () => void;
};

export default function PreorderModal({ open, onClose, onConfirm, onStandard }: Props) {
  const { t, language } = useLanguage();
  const storeInfo = useStore();
  const { orderType } = useAddress();
  const isDelivery = orderType === 'delivery';

  // The chosen day as a Berlin date; null until the guest picks one.
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [time, setTime] = useState('');

  /*
   * The next 7 Berlin days with their bookable times. Rebuilt each time the
   * modal opens, so a modal opened again later does not offer times that have
   * passed meanwhile. A night store's small hours (00:00 – 05:30) are listed
   * under the date they fall on.
   */
  const days = useMemo(() => {
    const now = Date.now();
    return bookableDays({ weeklyHours: storeInfo?.timings, now, intervalMinutes: 30, minLeadMinutes: PREORDER_PICKER_LEAD_MINUTES }).map((d) => ({
      ...d,
      label: formatSlotDay(d.date, { today: t.today, tomorrow: t.tomorrow }, language, now),
      short: shortDate(d.date),
      key: dayKeyOf(d.dayIndex),
    }));
    // `open` is a dependency on purpose: it is what makes "now" current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, t, storeInfo?.timings, open]);

  // Until the guest picks a day, the first one that still has a time on offer.
  const day = days.find((d) => d.date === pickedDate) ?? days.find((d) => d.slots.length > 0) ?? days[0];

  // The selected day's opening hours (both windows on a split day), shown next to the time label.
  const window = useMemo(() => (day ? (dayHoursText(storeInfo?.timings, day.dayIndex) ?? '') : ''), [day, storeInfo?.timings]);

  const times = day?.slots ?? [];

  /* A day change can strip the chosen time, so fall back to the first on offer. */
  const activeTime = times.includes(time) ? time : (times[0] ?? '');

  const confirm = () => {
    // Nothing bookable on this day: there is no slot to save.
    if (!day || !activeTime) return;
    const slot = { date: day.date, time: activeTime };
    onConfirm({ ...slot, label: formatSlotLabel(slot, { today: t.today, tomorrow: t.tomorrow }, language) });
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 z-[59] bg-black/74 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0' />
        <Dialog.Viewport className='fixed inset-0 z-[59] flex items-center justify-center p-4'>
          <Dialog.Popup className='anim-scalein w-[500px] max-w-full rounded-3xl border border-border bg-card p-6 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.8)]'>
            <div className='mb-1.5 flex items-center justify-between'>
              <Dialog.Title className='m-0 font-display text-2xl font-extrabold tracking-tight'>{t.preorder}</Dialog.Title>
              <Dialog.Close aria-label={t.close} className='flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 text-muted-foreground transition hover:text-white'>
                <X className='h-4 w-4' strokeWidth={2.2} />
              </Dialog.Close>
            </div>
            <p className='mb-4 text-[13px] font-medium text-muted-foreground'>{isDelivery ? (t.preorderSubDelivery ?? 'Choose the day and time of your delivery') : (t.preorderSubPickup ?? 'Choose the day and time of your pickup')}</p>

            {/* Days */}
            <div className='mb-2.5 text-[12px] font-bold uppercase tracking-[0.04em] text-muted-foreground'>{t.day ?? 'Day'}</div>
            <div className='noscroll -mx-0.5 flex gap-2.5 overflow-x-auto px-0.5'>
              {days.map((d) => {
                const on = d.date === day?.date;
                return (
                  <button
                    key={d.date}
                    onClick={() => setPickedDate(d.date)}
                    className={cn('flex min-w-[72px] shrink-0 flex-col items-center gap-[3px] rounded-2xl border p-3.5 transition', on ? 'border-white bg-primary' : 'border-border bg-surface-1')}>
                    <span className={cn('text-[11px] font-bold uppercase tracking-[0.02em]', on ? 'text-selected-text/70' : 'text-muted-foreground')}>{d.label}</span>
                    <span className={cn('text-[17px] font-extrabold', on ? 'text-selected-text' : 'text-white')}>{d.short}</span>
                  </button>
                );
              })}
            </div>

            {/*
              Time is a select rather than a wrap of chips: the design replaced the
              chips with a single input on desktop, where a pointer makes picking
              from a list quicker than scanning twenty targets. The options are
              still the store's bookable slots, so nothing unbookable is offerable.
            */}
            <div className='mb-2.5 mt-5 flex items-center justify-between'>
              <span className='text-[12px] font-bold uppercase tracking-[0.04em] text-muted-foreground'>{t.time ?? 'Time'}</span>
              {window && <span className='text-[12px] font-semibold text-muted-foreground-2'>{window}</span>}
            </div>
            <div className='flex h-[58px] items-center gap-3 rounded-2xl border-[1.5px] border-border bg-background px-3.5 transition focus-within:border-white/60'>
              <Clock className='h-5 w-5 shrink-0 text-muted-foreground' strokeWidth={1.8} />
              <select
                value={activeTime}
                onChange={(e) => setTime(e.target.value)}
                aria-label={t.time ?? 'Time'}
                className='min-w-0 flex-1 appearance-none border-none bg-transparent text-[15px] font-bold text-white'>
                {times.map((tm) => (
                  <option key={tm} value={tm} className='bg-card font-bold text-white'>
                    {tm}
                  </option>
                ))}
              </select>
              <ChevronDown className='h-4 w-4 shrink-0 text-muted-foreground' strokeWidth={2.2} />
            </div>

            <button onClick={confirm} disabled={!activeTime} className='mt-5 h-14 w-full rounded-2xl bg-primary text-[15.5px] font-extrabold text-selected-text transition active:scale-[0.98] disabled:opacity-60'>
              {t.confirmPreorder ?? 'Confirm pre-order'}
            </button>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

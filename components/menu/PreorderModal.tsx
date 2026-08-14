'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Clock, X } from 'lucide-react';
import { Dialog } from '@base-ui/react/dialog';
import { generateDaySlots } from '~/lib/generateTimeSlotsWithinHours';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useAddress } from '~/contexts/address-context';
import { cn } from '~/lib/utils';

/**
 * A confirmed pre-order slot. `dayOffset` is days from today (0 = today) —
 * the exact Berlin datetime is resolved at checkout so timezone handling stays
 * in one place.
 */
export type PreorderSlot = {
  dayOffset: number;
  time: string; // 'HH:MM'
  label: string; // e.g. "Tomorrow 18:00"
};

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

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;


export default function PreorderModal({ open, onClose, onConfirm, onStandard }: Props) {
  const { t, language } = useLanguage();
  const storeInfo = useStore();
  const { orderType } = useAddress();
  const isDelivery = orderType === 'delivery';

  const [dayIdx, setDayIdx] = useState(0);
  const [time, setTime] = useState('18:00');

  // Build the next 7 days.
  const days = useMemo(() => {
    const out: { idx: number; label: string; date: string; key: (typeof DAY_KEYS)[number] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const weekday = d.toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', { weekday: 'long' });
      out.push({
        idx: i,
        label: i === 0 ? (t.today ?? 'Today') : i === 1 ? (t.tomorrow ?? 'Tomorrow') : weekday,
        date: `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`,
        key: DAY_KEYS[d.getDay()],
      });
    }
    return out;
  }, [language, t]);

  // The selected day's opening window, shown next to the time label.
  const window = useMemo(() => {
    const key = days[dayIdx]?.key;
    const timings = storeInfo?.timings as Record<string, { open: string; close: string }> | null | undefined;
    const win = timings && key ? timings[key] : undefined;
    return win?.open && win?.close ? `${win.open} – ${win.close}` : '';
  }, [days, dayIdx, storeInfo?.timings]);

  // Same rules as the mobile sheet: today from the next half hour, other days
  // across their window, never past midnight.
  const times = useMemo(
    () => generateDaySlots({ weeklyHours: storeInfo?.timings as any, dayOffset: dayIdx, intervalMinutes: 30 }),
    [storeInfo?.timings, dayIdx],
  );

  /* A day change can strip the chosen time, so fall back to the first on offer. */
  const activeTime = times.includes(time) ? time : (times[0] ?? '');

  const confirm = () => {
    const day = days[dayIdx];
    onConfirm({ dayOffset: day.idx, time, label: `${day.label} ${time}` });
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
                const on = d.idx === dayIdx;
                return (
                  <button
                    key={d.idx}
                    onClick={() => setDayIdx(d.idx)}
                    className={cn('flex min-w-[72px] shrink-0 flex-col items-center gap-[3px] rounded-2xl border p-3.5 transition', on ? 'border-white bg-primary' : 'border-border bg-surface-1')}>
                    <span className={cn('text-[11px] font-bold uppercase tracking-[0.02em]', on ? 'text-selected-text/70' : 'text-muted-foreground')}>{d.label}</span>
                    <span className={cn('text-[17px] font-extrabold', on ? 'text-selected-text' : 'text-white')}>{d.date}</span>
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

            <button onClick={confirm} className='mt-5 h-14 w-full rounded-2xl bg-primary text-[15.5px] font-extrabold text-selected-text transition active:scale-[0.98]'>
              {t.confirmPreorder ?? 'Confirm pre-order'}
            </button>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

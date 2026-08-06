'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Dialog } from '@base-ui/react/dialog';
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
};

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function toMinutes(hhmm: string) {
  const [h, m] = (hhmm || '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
function fromMinutes(mins: number) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const FALLBACK_TIMES = ['11:30', '12:00', '12:30', '13:00', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'];

export default function PreorderModal({ open, onClose, onConfirm }: Props) {
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

  // Time slots for the selected day, based on opening hours (fallback list otherwise).
  const times = useMemo(() => {
    const key = days[dayIdx]?.key;
    const timings = storeInfo?.timings as Record<string, { open: string; close: string }> | null | undefined;
    const win = timings && key ? timings[key] : undefined;
    if (!win?.open || !win?.close) return FALLBACK_TIMES;
    let start = Math.ceil(toMinutes(win.open) / 30) * 30;
    let end = toMinutes(win.close);
    if (end <= start) end += 24 * 60; // overnight
    const slots: string[] = [];
    for (let m = start; m <= end - 30 && slots.length < 20; m += 30) slots.push(fromMinutes(m));
    return slots.length ? slots : FALLBACK_TIMES;
  }, [days, dayIdx, storeInfo?.timings]);

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

            {/* Times */}
            <div className='mb-2.5 mt-5 text-[12px] font-bold uppercase tracking-[0.04em] text-muted-foreground'>{t.time ?? 'Time'}</div>
            <div className='thinbar flex max-h-[150px] flex-wrap gap-2.5 overflow-y-auto'>
              {times.map((tm) => {
                const on = tm === time;
                return (
                  <button
                    key={tm}
                    onClick={() => setTime(tm)}
                    className={cn('min-w-[74px] flex-none rounded-[14px] border py-3 text-center text-[14.5px] font-bold transition', on ? 'border-white bg-primary text-selected-text' : 'border-border bg-surface-1 text-white')}>
                    {tm}
                  </button>
                );
              })}
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

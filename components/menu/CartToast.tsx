'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { CartAddedDetail } from '~/contexts/cart-context';
import { useLanguage } from '~/contexts/language-context';

const CONFETTI = [
  { left: '18%', w: 7, h: 11, color: '#ff8a5c', round: '2px', dur: '1s', delay: '0.02s' },
  { left: '34%', w: 8, h: 8, color: '#7fd4f0', round: '50%', dur: '1.15s', delay: '0.12s' },
  { left: '50%', w: 7, h: 12, color: '#ffd166', round: '2px', dur: '0.95s', delay: '0s' },
  { left: '64%', w: 8, h: 8, color: '#fff', round: '50%', dur: '1.2s', delay: '0.18s' },
  { left: '78%', w: 7, h: 11, color: '#ff6b8a', round: '2px', dur: '1.05s', delay: '0.08s' },
  { left: '44%', w: 7, h: 7, color: '#9b8cff', round: '50%', dur: '1.1s', delay: '0.24s' },
];

export default function CartToast() {
  const { t } = useLanguage();
  const [toast, setToast] = useState<CartAddedDetail | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onAdded = (e: Event) => {
      const detail = (e as CustomEvent<CartAddedDetail>).detail;
      if (timer.current) clearTimeout(timer.current);
      setToast(detail);
      timer.current = setTimeout(() => setToast(null), 2400);
    };
    window.addEventListener('cart:added', onAdded);
    return () => {
      window.removeEventListener('cart:added', onAdded);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!toast) return null;

  return (
    <>
      {/* Confetti */}
      <div className='pointer-events-none fixed inset-x-0 z-[70]' style={{ bottom: 88 }} aria-hidden>
        <div className='relative mx-auto' style={{ width: 320, maxWidth: 'calc(100vw - 24px)' }}>
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className='absolute bottom-0'
              style={{ left: c.left, width: c.w, height: c.h, background: c.color, borderRadius: c.round, animation: `wzconf ${c.dur} ease-out ${c.delay} forwards` }}
            />
          ))}
        </div>
      </div>

      {/* Toast card */}
      <div
        role='status'
        className='anim-fade fixed z-[71] overflow-hidden rounded-[18px] border border-border-strong bg-surface-1 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)]'
        style={{ bottom: 'calc(28px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', width: 'min(320px, calc(100vw - 24px))' }}>
        <div className='flex items-center gap-3 p-3.5'>
          <div className='relative shrink-0'>
            <div className='h-[46px] w-[46px] rounded-xl bg-white bg-cover bg-center' style={toast.image ? { backgroundImage: `url(${toast.image})` } : undefined} />
            <div className='absolute -bottom-1.5 -right-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-[3px] border-surface-1 bg-white'>
              <Check className='h-[11px] w-[11px] text-black' strokeWidth={2.8} />
            </div>
          </div>
          <div className='min-w-0 flex-1'>
            <div className='text-sm font-extrabold text-white'>{t.added ?? 'Added'}</div>
            <div className='mt-0.5 truncate text-[12.5px] font-medium text-muted-foreground'>{toast.name}</div>
          </div>
        </div>
      </div>
    </>
  );
}

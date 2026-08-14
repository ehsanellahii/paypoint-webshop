'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { formatPrice } from '~/lib/api';
import { useLanguage } from '~/contexts/language-context';

export type VoucherFlashDetail = { code: string; saved: number };

/** Falling confetti, matching the add-to-cart toast's particle set. */
const CONFETTI = [
  { left: '30%', size: 9, color: '#46d17f', round: '2px', dur: '1.5s', delay: '0.05s' },
  { left: '50%', size: 10, color: '#ffd166', round: '2px', dur: '1.7s', delay: '0s' },
  { left: '68%', size: 8, color: '#fff', round: '50%', dur: '1.4s', delay: '0.25s' },
];

/**
 * Full-screen confirmation shown the moment a voucher is accepted (the design's
 * "voucher flash"). Listens for a window event rather than taking props, so any
 * screen that can apply a code gets it without threading state through.
 */
export default function VoucherFlash() {
  const { t } = useLanguage();
  const [detail, setDetail] = useState<VoucherFlashDetail | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onApplied = (e: Event) => {
      setDetail((e as CustomEvent<VoucherFlashDetail>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setDetail(null), 1800);
    };
    window.addEventListener('voucher:applied', onApplied);
    return () => {
      window.removeEventListener('voucher:applied', onApplied);
      clearTimeout(timer);
    };
  }, []);

  if (!detail) return null;

  return (
    <div role='status' className='fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden bg-[rgba(20,20,22,0.86)] backdrop-blur-[6px]'>
      <div className='pointer-events-none absolute inset-x-0 top-0' aria-hidden>
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            className='absolute top-0'
            style={{
              left: c.left,
              width: c.size,
              height: c.size,
              background: c.color,
              borderRadius: c.round,
              animation: `wzconf ${c.dur} ease-in ${c.delay} infinite`,
            }}
          />
        ))}
      </div>

      <div className='anim-pop flex flex-col items-center'>
        <div className='flex h-[92px] w-[92px] items-center justify-center rounded-full bg-success'>
          <Check className='h-[46px] w-[46px] text-[#08130c]' strokeWidth={2.4} />
        </div>
        <div className='mt-[22px] text-2xl font-extrabold tracking-[-0.02em]'>{t.voucherActivated}</div>
        <div className='mt-2 text-[14.5px] font-semibold text-muted-foreground'>
          {t.voucher} <span className='font-extrabold text-white'>{detail.code}</span> · {formatPrice(detail.saved)} {t.saved}
        </div>
      </div>
    </div>
  );
}

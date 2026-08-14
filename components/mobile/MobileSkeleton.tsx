'use client';

import MobileShell, { MobileScreen } from './MobileShell';

/**
 * Placeholder for the mobile menu while its data loads.
 *
 * Mobile needs its own: the desktop skeleton is built around the wide shell and
 * its two-column grid, so reusing it meant a phone briefly rendered a
 * desktop-shaped page before swapping — a visible layout jump on first paint.
 * The shapes here mirror the mobile menu's cover, logo badge and rows.
 */
export default function MobileSkeleton() {
  return (
    <MobileShell>
      <MobileScreen>
        <div className='img-shimmer h-[226px] w-full' />
        <div className='relative -mt-[52px]'>
          <svg viewBox='0 0 100 50' preserveAspectRatio='none' className='block h-[52px] w-full' aria-hidden>
            <path d='M0,0 Q50,70 100,0 L100,52 L0,52 Z' className='fill-background' />
          </svg>
          <div className='img-shimmer absolute left-1/2 top-[-18px] h-[100px] w-[100px] -translate-x-1/2 rounded-3xl' />

          <div className='bg-background px-[18px] pb-24 pt-11'>
            <div className='img-shimmer mx-auto h-7 w-40 rounded-lg' />
            <div className='img-shimmer mx-auto mt-2.5 h-3 w-56 rounded' />
            <div className='img-shimmer mx-auto mt-3 h-3 w-32 rounded' />

            <div className='mt-6 flex gap-6'>
              {[64, 48, 56].map((w, i) => (
                <div key={i} className='img-shimmer h-4 rounded' style={{ width: w }} />
              ))}
            </div>

            {[0, 1, 2, 3].map((i) => (
              <div key={i} className='mt-5 flex items-start gap-3'>
                <div className='min-w-0 flex-1'>
                  <div className='img-shimmer h-4 w-3/4 rounded' />
                  <div className='img-shimmer mt-2 h-3 w-full rounded' />
                  <div className='img-shimmer mt-2 h-3.5 w-16 rounded' />
                </div>
                <div className='img-shimmer h-[79px] w-[118px] shrink-0 rounded-xl' />
              </div>
            ))}
          </div>
        </div>
      </MobileScreen>
    </MobileShell>
  );
}

'use client';

import MobileShell, { MobileScreen, SAFE_TOP } from './MobileShell';

/**
 * One grey block. Every shape below is one of these, so the shimmer stays a
 * single definition rather than a class repeated across five screens.
 */
function Bar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`img-shimmer ${className ?? ''}`} style={style} />;
}

/**
 * The header the cart, checkout and account screens share: a round back button
 * on the left and a centred title. Heights match each screen's own header so
 * the real one lands where the placeholder was.
 */
function TopBar({ className, title = 'w-28' }: { className?: string; title?: string }) {
  return (
    <div className={`relative flex flex-none items-center justify-center px-[18px] ${className ?? ''}`}>
      <Bar className='absolute left-[18px] h-10 w-10 rounded-full' />
      <Bar className={`h-4 rounded ${title}`} />
    </div>
  );
}

/**
 * The bar the cart and checkout pin to the bottom. Drawn in the skeleton too,
 * because it is the one part of those screens visible without scrolling and a
 * placeholder that omits it reads as a shorter page.
 */
function FooterBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className='absolute inset-x-0 bottom-0 z-[6] bg-background px-[18px] pt-3'
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}>
      {children}
    </div>
  );
}

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

/**
 * Cart: header, a few line items, the totals card, and the pinned CTA.
 *
 * The item rows are the photo-right shape the cart actually uses, not the
 * menu's — the two screens differ enough that the menu's placeholder read as
 * the wrong page for the moment it was up.
 */
export function MobileCartSkeleton() {
  return (
    <MobileShell className='flex flex-col'>
      <TopBar className='mt-3 h-[54px]' title='w-28' />

      <div className='noscroll min-h-0 flex-1 overflow-y-auto px-[18px] pb-[140px] pt-1.5'>
        {[0, 1, 2].map((i) => (
          <div key={i} className='mt-3 flex items-center gap-3 rounded-[18px] bg-card p-3'>
            <Bar className='h-[62px] w-[62px] shrink-0 rounded-xl' />
            <div className='min-w-0 flex-1'>
              <Bar className='h-4 w-2/3 rounded' />
              <Bar className='mt-2 h-3 w-1/3 rounded' />
            </div>
            <Bar className='h-8 w-[86px] shrink-0 rounded-full' />
          </div>
        ))}

        <div className='mt-5 rounded-[18px] bg-card p-[18px]'>
          {[0, 1, 2].map((i) => (
            <div key={i} className='mt-3 flex items-center justify-between first:mt-0'>
              <Bar className='h-3 w-24 rounded' />
              <Bar className='h-3 w-14 rounded' />
            </div>
          ))}
          <div className='mt-4 h-px bg-border' />
          <div className='mt-4 flex items-center justify-between'>
            <Bar className='h-4 w-20 rounded' />
            <Bar className='h-5 w-20 rounded' />
          </div>
        </div>
      </div>

      <FooterBar>
        <Bar className='h-[52px] w-full rounded-full' />
      </FooterBar>
    </MobileShell>
  );
}

/**
 * Checkout: the store logo in the header, then the stack of sections — address,
 * order type, time, payment — and the pinned pay bar.
 */
export function MobileCheckoutSkeleton() {
  return (
    <MobileShell className='flex flex-col'>
      <div className='relative mt-2.5 flex h-[50px] flex-none items-center justify-center px-[18px]'>
        <Bar className='absolute left-[18px] h-10 w-10 rounded-full' />
        <Bar className='h-[42px] w-[42px] rounded-[9px]' />
      </div>

      <div className='noscroll min-h-0 flex-1 overflow-y-auto px-[18px] pb-[150px] pt-1'>
        {/* Address: the map card, with its tappable address row beneath. */}
        <Bar className='h-3 w-32 rounded' />
        <div className='mt-2.5 overflow-hidden rounded-[18px] bg-card'>
          <Bar className='h-[132px] w-full rounded-none' />
          <div className='flex items-center gap-2.5 px-3.5 py-3.5'>
            <Bar className='h-8 w-8 shrink-0 rounded-[10px]' />
            <div className='min-w-0 flex-1'>
              <Bar className='h-3.5 w-1/2 rounded' />
              <Bar className='mt-1.5 h-3 w-2/3 rounded' />
            </div>
          </div>
        </div>

        {/* Delivery or pickup. */}
        <Bar className='mt-6 h-3 w-24 rounded' />
        <Bar className='mt-2.5 h-[46px] w-full rounded-full' />

        {/* Time, then payment methods. */}
        {[0, 1].map((i) => (
          <div key={i}>
            <Bar className='mt-6 h-3 w-28 rounded' />
            <div className='mt-2.5 rounded-[18px] bg-card p-[18px]'>
              <div className='flex items-center gap-3'>
                <Bar className='h-9 w-9 shrink-0 rounded-[10px]' />
                <Bar className='h-3.5 w-1/2 rounded' />
              </div>
              <div className='mt-4 flex items-center gap-3'>
                <Bar className='h-9 w-9 shrink-0 rounded-[10px]' />
                <Bar className='h-3.5 w-2/5 rounded' />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        className='absolute inset-x-0 bottom-0 z-[6] border-t border-white/[0.08] bg-background px-[18px] pt-3'
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}>
        <div className='flex items-center justify-between'>
          <Bar className='h-3 w-16 rounded' />
          <Bar className='h-5 w-20 rounded' />
        </div>
        <Bar className='mt-3 h-[52px] w-full rounded-full' />
      </div>
    </MobileShell>
  );
}

/**
 * Confirmation: the map hero and the sheet curving over it, with the tracking
 * card's three-segment progress bar in place.
 */
export function MobileConfirmationSkeleton() {
  return (
    <MobileShell>
      <MobileScreen>
        {/* Floats over the map, as on the real screen. */}
        <Bar className='absolute left-[18px] z-[8] h-10 w-10 rounded-full' style={{ top: SAFE_TOP }} />
        <Bar className='h-[300px] w-full rounded-none' />

        <div className='relative z-[2] -mt-[26px] rounded-t-[26px] bg-background px-5 pb-10 pt-6'>
          <div className='flex items-center gap-3.5'>
            <Bar className='h-[46px] w-[46px] shrink-0 rounded-full' />
            <div className='min-w-0 flex-1'>
              <Bar className='h-5 w-2/5 rounded-lg' />
              <Bar className='mt-2 h-3 w-3/5 rounded' />
            </div>
          </div>

          <div className='mt-[22px] rounded-[18px] bg-card p-[18px]'>
            <div className='flex items-baseline justify-between'>
              <Bar className='h-3 w-28 rounded' />
              <Bar className='h-3 w-16 rounded' />
            </div>
            <Bar className='mt-1.5 h-7 w-32 rounded-lg' />
            <div className='mt-3.5 flex gap-1.5'>
              {[0, 1, 2].map((i) => (
                <div key={i} className='h-[5px] flex-1 rounded-[3px] bg-track' />
              ))}
            </div>
            <div className='mt-2.5 flex justify-between'>
              {[0, 1, 2].map((i) => (
                <Bar key={i} className='h-2.5 w-16 rounded' />
              ))}
            </div>
          </div>

          {[0, 1].map((i) => (
            <div key={i} className='mt-3.5 rounded-[18px] bg-card p-[18px]'>
              <Bar className='h-3 w-24 rounded' />
              <Bar className='mt-2.5 h-3.5 w-3/4 rounded' />
              <Bar className='mt-2 h-3.5 w-1/2 rounded' />
            </div>
          ))}
        </div>
      </MobileScreen>
    </MobileShell>
  );
}

/**
 * Product: the photo, the sheet overlapping its lower edge, one option group,
 * and the quantity stepper beside the add button.
 */
export function MobileProductSkeleton() {
  return (
    <MobileShell className='flex flex-col'>
      {/* The close button floats over the photo rather than sitting in a header. */}
      <Bar className='absolute right-4 top-4 z-[7] h-[46px] w-[46px] rounded-full' />

      <div className='noscroll min-h-0 flex-1 overflow-y-auto bg-background'>
        <Bar className='h-[210px] w-full rounded-none' />

        <div className='relative z-[2] -mt-[30px] px-5 pb-[120px] pt-1'>
          <Bar className='mt-[30px] h-7 w-3/4 rounded-lg' />
          <Bar className='mt-2.5 h-5 w-24 rounded' />
          <Bar className='mt-3 h-3 w-full rounded' />
          <Bar className='mt-2 h-3 w-5/6 rounded' />

          <div className='mt-[26px] h-px bg-border' />

          {[0, 1].map((group) => (
            <div key={group} className='mt-[26px]'>
              <Bar className='h-[18px] w-1/3 rounded' />
              <Bar className='mt-1.5 h-3 w-24 rounded' />
              {[0, 1, 2].map((row) => (
                <div key={row} className='mt-3.5 flex items-center gap-3'>
                  <Bar className='h-[22px] w-[22px] shrink-0 rounded-full' />
                  <Bar className='h-3.5 flex-1 rounded' />
                  <Bar className='h-3.5 w-12 shrink-0 rounded' />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div
        className='absolute inset-x-0 bottom-0 z-[6] flex items-center gap-3 bg-background px-4 pt-3'
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}>
        <Bar className='h-[52px] w-[124px] shrink-0 rounded-full' />
        <Bar className='h-[52px] flex-1 rounded-full' />
      </div>
    </MobileShell>
  );
}

/**
 * Account: favourites, orders and vouchers all render a header and a list of
 * cards, so one placeholder covers every section.
 */
export function MobileAccountSkeleton() {
  return (
    <MobileShell className='flex flex-col'>
      <TopBar className='mt-3 h-[54px]' title='w-32' />

      <div className='noscroll min-h-0 flex-1 overflow-y-auto px-[18px] pb-10 pt-1'>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className='mt-3 flex items-center gap-3 rounded-[18px] bg-card p-3.5'>
            <Bar className='h-[52px] w-[52px] shrink-0 rounded-xl' />
            <div className='min-w-0 flex-1'>
              <Bar className='h-3.5 w-1/2 rounded' />
              <Bar className='mt-2 h-3 w-2/3 rounded' />
            </div>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}

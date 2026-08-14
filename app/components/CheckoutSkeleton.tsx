import React from 'react';

const Block = ({ className, style }: { className?: string; style?: React.CSSProperties }) => <div style={style} className={`img-shimmer rounded-[10px] ${className ?? ''}`} />;

/**
 * Checkout's own fallback: slim header, photo hero, then the form column beside
 * the summary card. Shaped like the real screen so the page does not jump when
 * it resolves — the menu skeleton used to stand in here and reflowed into a
 * completely different layout.
 */
const CheckoutSkeleton = () => (
  <div className='min-h-screen bg-background'>
    {/* Slim shop header */}
    <div className='sticky top-0 z-40 border-b border-border bg-[rgba(20,20,22,0.92)] backdrop-blur-[14px]'>
      <div className='shell shell-pad flex h-[74px] items-center gap-4'>
        <Block className='h-9 w-32' />
        <div className='flex-1' />
        <Block className='h-11 w-11 rounded-[13px]' />
      </div>
    </div>

    {/* Hero */}
    <div className='mx-auto max-w-[1400px]'>
      <Block className='h-[216px] w-full rounded-none' />
    </div>

    <div className='mx-auto max-w-[1100px] px-4 pb-20 pt-6 sm:px-8'>
      <div className='grid grid-cols-1 items-start gap-7 min-[900px]:grid-cols-[1fr_380px]'>
        {/* Left — order type, address, fields, payment */}
        <div className='flex flex-col gap-3.5'>
          <Block className='h-[52px] w-full rounded-[14px]' />
          <Block className='h-[218px] w-full rounded-[18px]' />
          {[0, 1, 2].map((i) => (
            <Block key={i} className='h-[54px] w-full rounded-[14px]' />
          ))}
          <Block className='mt-2 h-4 w-32' />
          <Block className='h-[70px] w-full rounded-[14px]' />
          <Block className='h-[70px] w-full rounded-[14px]' />
        </div>

        {/* Right — summary card */}
        <div className='rounded-[20px] border border-border bg-surface-1 p-5'>
          <Block className='h-5 w-40' />
          <div className='mt-4 flex flex-col gap-3'>
            {[0, 1].map((i) => (
              <div key={i} className='flex items-center gap-3'>
                <Block className='h-7 w-9 rounded-[9px]' />
                <Block className='h-4 flex-1' />
                <Block className='h-4 w-14' />
              </div>
            ))}
          </div>
          <div className='mt-5 flex flex-col gap-2.5 border-t border-border pt-4'>
            <div className='flex justify-between'>
              <Block className='h-4 w-24' /> <Block className='h-4 w-16' />
            </div>
            <div className='flex justify-between'>
              <Block className='h-4 w-20' /> <Block className='h-4 w-12' />
            </div>
          </div>
          <Block className='mt-5 h-[54px] w-full rounded-2xl' />
        </div>
      </div>
    </div>
  </div>
);

export default CheckoutSkeleton;

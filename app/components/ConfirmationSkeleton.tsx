import React from 'react';

const Block = ({ className, style }: { className?: string; style?: React.CSSProperties }) => <div style={style} className={`img-shimmer rounded-[10px] ${className ?? ''}`} />;

/**
 * Confirmation's own fallback: back button, the status headline, then the map
 * card beside the receipt. Matches the real screen's two-column shape so the
 * page settles in place rather than reflowing out of the menu skeleton.
 */
const ConfirmationSkeleton = () => (
  <div className='min-h-screen bg-background'>
    {/* Slim shop header */}
    <div className='sticky top-0 z-40 border-b border-border bg-[rgba(20,20,22,0.92)] backdrop-blur-[14px]'>
      <div className='shell shell-pad flex h-[74px] items-center gap-4'>
        <Block className='h-9 w-32' />
        <div className='flex-1' />
        <Block className='h-11 w-11 rounded-[13px]' />
      </div>
    </div>

    <div className='mx-auto max-w-[1080px] px-4 pb-24 pt-7 md:px-8'>
      <Block className='h-11 w-28 rounded-[13px]' />

      {/* Status headline */}
      <div className='mt-6 flex flex-col gap-3'>
        <Block className='h-[34px] w-44 rounded-full' />
        <Block className='h-9 w-[320px] max-w-full' />
        <Block className='h-5 w-[420px] max-w-full' />
      </div>

      <div className='mt-7 grid grid-cols-1 items-start gap-6 md:grid-cols-[1fr_380px]'>
        {/* Map + progress */}
        <div className='overflow-hidden rounded-[22px] border border-border bg-surface-1'>
          <Block className='h-[240px] w-full rounded-none' />
          <div className='flex items-center gap-2 p-5'>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className='img-shimmer h-[5px] flex-1 rounded-[3px]' />
            ))}
          </div>
        </div>

        {/* Receipt */}
        <div className='rounded-[20px] border border-border bg-surface-1 p-5'>
          <Block className='h-5 w-36' />
          <div className='mt-4 flex flex-col gap-3'>
            {[0, 1, 2].map((i) => (
              <div key={i} className='flex items-center gap-3'>
                <Block className='h-[42px] w-[42px] rounded-[11px]' />
                <Block className='h-4 flex-1' />
                <Block className='h-4 w-14' />
              </div>
            ))}
          </div>
          <div className='mt-5 flex justify-between border-t border-border pt-4'>
            <Block className='h-5 w-20' />
            <Block className='h-5 w-20' />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default ConfirmationSkeleton;

import React from 'react';

const Block = ({ className, style }: { className?: string; style?: React.CSSProperties }) => <div style={style} className={`img-shimmer rounded-[10px] ${className ?? ''}`} />;

const LoadingSkeleton = () => {
  return (
    <div className='min-h-screen bg-background'>
      {/* Header */}
      <div className='sticky top-0 z-40 border-b border-border bg-[rgba(20,20,22,0.92)] backdrop-blur-[14px]'>
        <div className='mx-auto flex h-[74px] max-w-[1320px] items-center gap-4 px-4 md:px-8'>
          <Block className='h-9 w-32' />
          <Block className='hidden h-11 flex-1 md:block' />
          <div className='flex flex-1 md:hidden' />
          <Block className='h-11 w-11 rounded-[13px]' />
        </div>
      </div>

      {/* Hero */}
      <div className='mx-auto max-w-[1320px] px-4 pt-7 md:px-8'>
        <Block className='h-[196px] w-full rounded-3xl sm:h-[260px]' />
      </div>

      {/* Meta bar */}
      <div className='mx-auto max-w-[1320px] border-b border-border-strong px-4 py-[18px] md:px-8'>
        <div className='flex flex-wrap items-center gap-3'>
          <Block className='h-12 w-56 rounded-3xl' />
          <Block className='h-5 w-40' />
        </div>
      </div>

      {/* Category nav */}
      <div className='border-b border-border-strong'>
        <div className='mx-auto flex h-[60px] max-w-[1320px] items-center gap-2 px-4 md:px-8'>
          {[64, 90, 72, 84, 68, 96].map((w, i) => (
            <Block key={i} className='h-[42px] rounded-[21px]' style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* Menu sections */}
      <main className='mx-auto max-w-[1320px] px-4 pt-6 md:px-8'>
        {[1, 2].map((section) => (
          <section key={section} className='mb-12'>
            <div className='mb-5 flex items-center gap-3'>
              <div className='h-[26px] w-[5px] rounded-[3px] bg-surface-3' />
              <Block className='h-7 w-48' />
            </div>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className='flex gap-4 rounded-[18px] border border-border bg-surface-1 p-4'>
                  <div className='flex flex-1 flex-col gap-2'>
                    <Block className='h-4 w-3/4' />
                    <Block className='h-3 w-full' />
                    <Block className='h-3 w-1/2' />
                    <div className='mt-auto pt-3'>
                      <Block className='h-5 w-16' />
                    </div>
                  </div>
                  <Block className='h-[124px] w-[132px] rounded-[14px] md:h-[150px] md:w-[172px]' />
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};

export default LoadingSkeleton;

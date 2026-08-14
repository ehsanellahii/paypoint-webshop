'use client';

import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useScrollDetection, useSmoothScroll } from '@/hooks/useScrollDetection';
import { MenuCategory } from '~/lib/utils';
import { useLanguage } from '~/contexts/language-context';
import { cn } from '~/lib/utils';

type Props = {
  categories: MenuCategory[];
  activeCategory: string;
  onCategoryClick: (id: string) => void;
  query: string;
  onQueryChange: (v: string) => void;
};

export default function CategoryNavBar({ categories, activeCategory, onCategoryClick, query, onQueryChange }: Props) {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = useScrollDetection(scrollRef, 'horizontal');
  const { scrollBy } = useSmoothScroll(scrollRef);

  // Center the active chip
  useEffect(() => {
    const bar = scrollRef.current;
    if (!bar) return;
    const timer = setTimeout(() => {
      const active = bar.querySelector<HTMLButtonElement>(`button[data-cat="${activeCategory}"]`);
      if (!active) return;
      const target = active.offsetLeft - bar.clientWidth / 2 + active.offsetWidth / 2;
      bar.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [activeCategory]);

  const handleClick = (id: string) => {
    // `scroll-margin-top` on the section owns the offset (see `.menu-anchor`),
    // so there is no pixel value to keep in sync here.
    document.getElementById(`category-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onCategoryClick(id);
  };

  const step = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    scrollBy(dir === 'left' ? -Math.round(el.clientWidth * 0.7) : Math.round(el.clientWidth * 0.7), 'horizontal');
  };

  return (
    <div className='sticky top-[74px] z-30 border-b border-border-strong bg-[rgba(20,20,22,0.96)] shadow-[0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-[14px]'>
      <div className='relative shell'>
        <div ref={scrollRef} className='noscroll shell-pad flex h-[60px] items-center gap-1.5 overflow-x-auto'>
          {categories.map((c) => {
            const active = activeCategory === c.id;
            return (
              <button
                key={c.id}
                data-cat={c.id}
                onClick={() => handleClick(c.id)}
                className={cn(
                  'h-[42px] shrink-0 whitespace-nowrap rounded-[21px] px-[18px] text-[14.5px] transition',
                  active ? 'bg-primary font-extrabold text-selected-text' : 'font-semibold text-fg-secondary hover:bg-white/[0.06] hover:text-white'
                )}>
                {c.name}
              </button>
            );
          })}
          <div className='w-11 shrink-0' />
        </div>

        {/* Left / right fade + arrows */}
        {scroll.canScrollLeft && (
          <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center bg-gradient-to-l from-transparent to-[rgba(20,20,22,0.96)] pl-2 pr-10'>
            <button onClick={() => step('left')} aria-label='Scroll left' className='pointer-events-auto flex h-[30px] w-[30px] items-center justify-center rounded-full border border-border-strong bg-surface-2 text-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)] hover:bg-surface-suggest'>
              <ChevronLeft className='h-[15px] w-[15px]' />
            </button>
          </div>
        )}
        {scroll.canScrollRight && (
          <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center bg-gradient-to-r from-transparent to-[rgba(20,20,22,0.96)] pl-10 pr-2'>
            <button onClick={() => step('right')} aria-label='Scroll right' className='pointer-events-auto flex h-[30px] w-[30px] items-center justify-center rounded-full border border-border-strong bg-surface-2 text-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)] hover:bg-surface-suggest'>
              <ChevronRight className='h-[15px] w-[15px]' />
            </button>
          </div>
        )}
      </div>

      {/* Mobile search */}
      <div className='border-t border-border px-4 py-2.5 md:hidden'>
        <div className='flex h-11 items-center gap-2.5 rounded-[13px] border border-border bg-surface-1 px-4'>
          <Search className='h-[18px] w-[18px] shrink-0 text-muted-foreground' />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t.searchMenu ?? 'Search the menu…'}
            aria-label={t.searchMenu ?? 'Search the menu'}
            className='min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-white outline-none'
          />
          {query && (
            <button onClick={() => onQueryChange('')} aria-label='Clear search' className='flex h-6 w-6 items-center justify-center rounded-full bg-control text-white'>
              <X className='h-3 w-3' />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

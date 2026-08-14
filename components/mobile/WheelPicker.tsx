'use client';

import { useEffect, useRef } from 'react';
import { cn } from '~/lib/utils';

/** Row height and viewport, from the design. */
export const ITEM_H = 44;
export const WHEEL_H = 220;
/** Padding that lets the first and last rows reach the centre line. */
const PAD = (WHEEL_H - ITEM_H) / 2;

export type WheelOption = { value: string; label: string };

/**
 * One column of an iOS-style scroll wheel.
 *
 * Selection is driven by native scroll snapping rather than a drag handler:
 * `scroll-snap-type: y mandatory` gives real momentum and rubber-banding for
 * free, and it keeps working with a trackpad, a mouse wheel and keyboard
 * scrolling. The selected row is simply whichever one sits on the centre line,
 * derived from `scrollTop`.
 */
export default function WheelColumn({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  options: WheelOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Set while we scroll programmatically, so it is not read back as a choice. */
  const syncing = useRef(false);

  const index = Math.max(0, options.findIndex((o) => o.value === value));

  // Keep the wheel aligned when the value changes from outside (initial mount,
  // or the time list being rebuilt after the day changes).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = index * ITEM_H;
    if (Math.abs(el.scrollTop - target) < 1) return;
    syncing.current = true;
    el.scrollTo({ top: target, behavior: 'auto' });
    // One frame is enough for the scroll event to fire and be ignored.
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  }, [index, options.length]);

  const onScroll = () => {
    if (syncing.current) return;
    if (settle.current) clearTimeout(settle.current);
    // Snapping finishes after the scroll events stop; read the value then, so a
    // flick past several rows reports once rather than for every row crossed.
    settle.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const next = options[Math.round(el.scrollTop / ITEM_H)];
      if (next && next.value !== value) onChange(next.value);
    }, 90);
  };

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      role='listbox'
      aria-label={ariaLabel}
      tabIndex={0}
      className={cn('noscroll snap-y snap-mandatory overflow-y-auto', className)}
      style={{ height: WHEEL_H, paddingBlock: PAD, boxSizing: 'border-box' }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <div
            key={option.value}
            role='option'
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex snap-center items-center justify-center text-center transition-colors',
              selected ? 'text-[17px] font-extrabold text-white' : 'text-[15px] font-semibold text-muted-foreground'
            )}
            style={{ height: ITEM_H }}>
            {option.label}
          </div>
        );
      })}
    </div>
  );
}

/** The two columns plus the centre highlight the rows scroll under. */
export function Wheel({ children }: { children: React.ReactNode }) {
  return (
    <div className='relative mt-4' style={{ height: WHEEL_H }}>
      <div
        className='pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-xl bg-white/[0.07]'
        style={{ height: ITEM_H }}
        aria-hidden
      />
      <div className='flex' style={{ height: WHEEL_H }}>
        {children}
      </div>
    </div>
  );
}

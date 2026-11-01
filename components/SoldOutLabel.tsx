'use client';

import { useLanguage } from '~/contexts/language-context';
import { cn } from '~/lib/utils';

/**
 * "Ausverkauft" on a menu card or row (desktop and mobile alike).
 *
 * Neutral on purpose: the shape of the "Pflicht" badge in the product modal,
 * but in the surface greys rather than the store accent, so it reads as a
 * state of the item and not as something to tap. The tokens resolve to the
 * mobile palette under `[data-device='mobile']`.
 */
export default function SoldOutLabel({ className }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-border-strong bg-surface-3 px-2.5 py-[3px] text-[11px] font-extrabold uppercase tracking-[0.04em] text-fg-secondary',
        className
      )}>
      {t.productSoldOut}
    </span>
  );
}

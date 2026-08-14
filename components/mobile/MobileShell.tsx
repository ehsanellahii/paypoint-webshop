'use client';

import { cn } from '~/lib/utils';

/**
 * Frame for a mobile screen.
 *
 * The design renders each screen inside a phone bezel so its prototype reads as
 * a device; below 900px it drops the bezel and goes full-bleed at up to 440px.
 * Only that full-bleed state ships — the bezel, the fake status bar and the
 * screen label are presentation scaffolding.
 *
 * Screens are absolutely positioned inside a fixed viewport-height frame rather
 * than flowing in the document, because they scroll independently and several
 * pin a footer (the cart bar, the checkout CTA) to the bottom. `100dvh` so the
 * frame tracks the mobile browser's collapsing address bar instead of being
 * overlapped by it.
 */
export default function MobileShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className='mx-auto h-[100dvh] w-full max-w-[440px] overflow-hidden bg-background'>
      <div className={cn('relative h-full w-full', className)}>{children}</div>
    </div>
  );
}

/**
 * Scrolling body of a screen. `noscroll` hides the bar — on a phone the native
 * scrollbar is an overlay anyway, and the design shows none.
 */
export function MobileScreen({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('noscroll absolute inset-0 overflow-y-auto bg-background', className)}>{children}</div>;
}

/**
 * Top inset for content that floats over a screen's cover image.
 *
 * The design hardcodes `top: 58px` to clear its mock status bar. A browser has
 * no status bar, but a phone does have a notch or a dynamic island in
 * standalone mode — so this is the safe-area inset plus a small margin, which
 * collapses to just the margin in a normal tab.
 */
export const SAFE_TOP = 'calc(env(safe-area-inset-top, 0px) + 18px)';

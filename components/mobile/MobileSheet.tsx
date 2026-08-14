'use client';

import { Dialog } from '@base-ui/react/dialog';
import { ChevronLeft } from 'lucide-react';

import { cn } from '~/lib/utils';

/**
 * The design's mobile bottom sheet.
 *
 * Every overlay on a phone is one of these — payment, address, support,
 * language, order detail, schedule, logout confirm. A centred dialog is wrong
 * here for two reasons: it has to share the viewport with the keyboard, and a
 * thumb reaches the bottom of the screen far more easily than its middle.
 *
 * Built on `Dialog` rather than a bare div so focus trapping, Escape and the
 * scroll lock come for free; only the placement and chrome differ from the
 * desktop popup.
 *
 * Spec, from the design's own sheets: a 26px top radius on `--surface-1`, an
 * 18px gutter, a 40×5 grab handle, and a centred 17px title.
 */
export default function MobileSheet({
  open,
  onClose,
  title,
  onBack,
  backLabel,
  /** Cap on the sheet's height, as a percentage of the viewport. */
  maxHeight = '80%',
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Renders the design's back circle to the left of the title. */
  onBack?: () => void;
  backLabel?: string;
  maxHeight?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 z-[80] bg-black/55 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0' />
        <Dialog.Viewport className='fixed inset-0 z-[81] flex items-end justify-center'>
          <Dialog.Popup
            className={cn('noscroll w-full max-w-[440px] overflow-y-auto rounded-t-[26px] bg-surface-1 px-[18px] pt-2.5', className)}
            style={{
              maxHeight,
              // Clear the home indicator on top of the design's 30px.
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 30px)',
              animation: 'dzslideup .28s cubic-bezier(.22,.8,.3,1) both',
            }}>
            <div className='mx-auto mb-3.5 h-[5px] w-10 rounded-[3px] bg-elevated' aria-hidden />
            {title ? (
              <div className='relative mb-3.5 flex items-center justify-center'>
                {onBack && (
                  <button
                    type='button'
                    onClick={onBack}
                    aria-label={backLabel}
                    className='absolute left-0 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-background text-muted-foreground transition active:scale-90'>
                    <ChevronLeft className='h-[18px] w-[18px]' strokeWidth={2.2} />
                  </button>
                )}
                <Dialog.Title className='text-[17px] font-extrabold text-white'>{title}</Dialog.Title>
              </div>
            ) : (
              // A dialog still needs an accessible name even where the design
              // shows no visible heading.
              <Dialog.Title className='sr-only'>Sheet</Dialog.Title>
            )}
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A row group on the sheet's raised surface, as the design's lists are. */
export function SheetGroup({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('overflow-hidden rounded-2xl bg-card', className)}>{children}</div>;
}

/** Hairline between rows in a `SheetGroup`, inset past the icon column. */
export function SheetDivider() {
  return <div className='ml-[51px] h-px bg-white/[0.06]' />;
}

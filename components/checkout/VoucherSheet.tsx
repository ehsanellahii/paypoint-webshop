'use client';

import { X } from 'lucide-react';
import { Dialog } from '@base-ui/react/dialog';
import { useLanguage } from '~/contexts/language-context';
import VoucherSection from '~/components/Cart/VoucherSection';

type Props = {
  open: boolean;
  onClose: () => void;
  disabled?: boolean;
};

/** Wraps the existing voucher apply/remove logic in a checkout sheet. */
export default function VoucherSheet({ open, onClose, disabled }: Props) {
  const { t } = useLanguage();

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 z-[62] bg-black/70 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0' />
        <Dialog.Viewport className='fixed inset-0 z-[62] flex items-center justify-center p-4'>
          <Dialog.Popup className='anim-scalein w-[460px] max-w-full rounded-[22px] border border-border bg-card p-5.5'>
            <div className='flex items-center justify-between'>
              <Dialog.Title className='text-lg font-extrabold'>{t.voucher ?? 'Voucher'}</Dialog.Title>
              <Dialog.Close aria-label={t.close} className='flex h-[34px] w-[34px] items-center justify-center rounded-full bg-surface-3 text-muted-foreground transition hover:text-white'>
                <X className='h-4 w-4' strokeWidth={2.2} />
              </Dialog.Close>
            </div>
            {/* VoucherSection carries its own top margin */}
            <div className='-mt-3'>
              <VoucherSection disabled={disabled} />
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

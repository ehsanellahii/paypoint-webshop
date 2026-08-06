'use client';

import { X, Banknote, CreditCard, Check } from 'lucide-react';
import { Dialog } from '@base-ui/react/dialog';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useAddress } from '~/contexts/address-context';
import { cn } from '~/lib/utils';

export type PaymentMethod = 'cash' | 'card';

type Props = {
  open: boolean;
  onClose: () => void;
  value: PaymentMethod | null;
  onSelect: (m: PaymentMethod) => void;
};

export default function PaymentSheet({ open, onClose, value, onSelect }: Props) {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const { orderType } = useAddress();
  const isDelivery = orderType === 'delivery';

  const isCashAvailable = storeInfo?.settings?.paymentMethods?.cash;
  const isCardAvailable = storeInfo?.settings?.paymentMethods?.ecCardReader;

  const row = (method: PaymentMethod, Icon: typeof Banknote, label: string) => {
    const active = value === method;
    return (
      <button
        key={method}
        type='button'
        onClick={() => {
          onSelect(method);
          onClose();
        }}
        className={cn('flex w-full items-center gap-3.5 rounded-[14px] p-3.5 text-left transition', active ? 'bg-surface-3' : 'bg-surface-3/60 hover:bg-surface-3')}>
        <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-card'>
          <Icon className='h-5 w-5' />
        </span>
        <span className='min-w-0 flex-1'>
          <span className='block text-[15px] font-bold'>{label}</span>
          <span className='mt-0.5 block text-xs font-medium text-muted-foreground'>{isDelivery ? (t.onDelivery ?? 'On delivery') : (t.onPickup ?? 'On pickup')}</span>
        </span>
        <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', active ? 'border-white bg-white' : 'border-[#55575c]')}>
          {active && <Check className='h-3 w-3 text-black' strokeWidth={3} />}
        </span>
      </button>
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 z-[62] bg-black/70 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0' />
        <Dialog.Viewport className='fixed inset-0 z-[62] flex items-center justify-center p-4'>
          <Dialog.Popup className='anim-scalein w-[440px] max-w-full rounded-[22px] border border-border bg-card p-5.5'>
            <div className='mb-4 flex items-center justify-between'>
              <Dialog.Title className='text-lg font-extrabold'>{t.paymentMethod}</Dialog.Title>
              <Dialog.Close aria-label={t.close} className='flex h-[34px] w-[34px] items-center justify-center rounded-full bg-surface-3 text-muted-foreground transition hover:text-white'>
                <X className='h-4 w-4' strokeWidth={2.2} />
              </Dialog.Close>
            </div>
            <div className='flex flex-col gap-2.5'>
              {isCashAvailable && row('cash', Banknote, t.cash)}
              {isCardAvailable && row('card', CreditCard, t.posCardPayment)}
              {!isCashAvailable && !isCardAvailable && <div className='py-6 text-center text-sm text-muted-foreground'>{t.notAvailable}</div>}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

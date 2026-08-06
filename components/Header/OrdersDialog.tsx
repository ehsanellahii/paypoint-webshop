'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/language-context';
import { useUser } from '~/contexts/user-context';
import OrdersPanel from './OrdersPanel';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function OrdersDialog({ open, onOpenChange }: Props) {
  const { t } = useLanguage();
  const { user } = useUser();
  const userId = user?.id ?? user?._id;
  const [count, setCount] = useState(0);
  const title = useMemo(() => t?.orders ?? 'Orders', [t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-5xl flex-col rounded-3xl border border-border bg-card p-0 text-foreground'>
        <DialogHeader className='border-b-0 p-6 pb-0'>
          <DialogTitle className='w-full border-b border-border py-2 text-center font-display text-xl font-extrabold sm:py-4 md:py-8 md:text-3xl'>{title}</DialogTitle>
        </DialogHeader>

        <OrdersPanel active={open} onLoaded={setCount} />

        <div className='flex items-center justify-between border-t border-border bg-card px-6 py-4'>
          <div className='text-sm text-muted-foreground'>
            {userId ? (
              <span>
                {t?.totalOrders ?? 'Total orders'}: <span className='font-bold text-foreground'>{count}</span>
              </span>
            ) : (
              <span>{t?.notLoggedIn ?? 'Not logged in'}</span>
            )}
          </div>
          <button onClick={() => onOpenChange(false)} className='rounded-[12px] bg-surface-3 px-4 py-3 font-bold text-white transition hover:bg-elevated'>
            {t?.close ?? 'Close'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

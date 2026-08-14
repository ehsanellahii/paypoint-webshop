'use client';

import { User } from 'lucide-react';
import BrandMark from './BrandMark';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';

/**
 * Slim shop header for the checkout / confirmation routes — brand mark (back to
 * menu) + account button. Matches the prototype, where those screens show the
 * shop header without the menu's search / address / cart controls.
 */
export default function ShopHeaderMinimal({ onOpenAccount }: { onOpenAccount: () => void }) {
  const { toMenu } = useStoreNavigation();

  return (
    <header className='sticky top-0 z-40 border-b border-border bg-[rgba(20,20,22,0.92)] backdrop-blur-[14px]'>
      <div className='shell shell-pad flex h-[74px] items-center gap-4'>
        <BrandMark onClick={toMenu} />
        <div className='flex-1' />
        <button
          onClick={onOpenAccount}
          data-cart-anchor='1'
          aria-label='Open account'
          className='flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border border-border bg-surface-1 text-white transition hover:border-border-strong hover:bg-elevated'>
          <User className='h-5 w-5' />
        </button>
      </div>
    </header>
  );
}

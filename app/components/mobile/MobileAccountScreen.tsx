'use client';

import { ChevronLeft } from 'lucide-react';

import MobileShell, { MobileScreen } from '~/components/mobile/MobileShell';
import FavoritesPanel from '~/components/dialogs/FavoriteItems/FavoritesPanel';
import OrdersPanel from '~/components/Header/OrdersPanel';
import MobileVouchersPanel from '~/components/mobile/MobileVouchersPanel';
import VoucherFlash from '~/components/checkout/VoucherFlash';
import { useLanguage } from '~/contexts/language-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import type { AccountSection } from '~/lib/accountSections';



/**
 * Favorites / orders / vouchers / invite as full screens.
 *
 * The panels themselves are shared with the desktop drawer — only the chrome
 * differs, so a change to how an order card looks lands in both places.
 */
export default function MobileAccountScreen({ section }: { section: AccountSection }) {
  const { t } = useLanguage();
  const { back, toMenu, toProduct } = useStoreNavigation();

  const title: Record<AccountSection, string> = {
    favorites: t.favoriteProducts,
    orders: t.orders,
    vouchers: t.vouchers,
  };

  return (
    <MobileShell className='flex flex-col'>
      <div className='relative mt-3 flex h-[54px] flex-none items-center justify-center px-[18px]'>
        <button onClick={back} aria-label={t.back} className='absolute left-[18px] flex h-10 w-10 items-center justify-center rounded-full bg-card text-white transition active:scale-90'>
          <ChevronLeft className='h-5 w-5' strokeWidth={2.2} />
        </button>
        <h1 className='text-[17px] font-extrabold text-white'>{title[section]}</h1>
      </div>

      <MobileScreen className='!relative !inset-auto min-h-0 flex-1 px-[18px] pb-10 pt-1'>
        {section === 'favorites' && (
          <FavoritesPanel active onOpenProduct={(p) => toProduct(String(p.id))} onBrowse={toMenu} />
        )}

        {section === 'orders' && <OrdersPanel active compact wrapperClassName='' onReordered={toMenu} />}

        {/* Its own screen layout — VoucherSection is the cart's in-card panel. */}
        {section === 'vouchers' && <MobileVouchersPanel />}
      </MobileScreen>

      <VoucherFlash />
    </MobileShell>
  );
}

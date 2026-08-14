'use client';

import { Bike, ShoppingBag, Clock } from 'lucide-react';
import { useAddress } from '~/contexts/address-context';
import { useStore } from '~/contexts/store-context';
import { useLanguage } from '~/contexts/language-context';
import { getPostalRateInfo } from '~/lib/utils';
import { formatPrice } from '@/lib/api';
import { getTodayTimings, isRestaurantOpen } from '~/lib/restaurantTimings';
import { cn } from '~/lib/utils';

type Props = {
  onRequireAddress: () => void;
  onOpenInfo?: () => void;
  onOpenPreorder?: () => void;
  preorderLabel?: string;
};

export default function MenuMetaBar({ onRequireAddress, onOpenInfo, onOpenPreorder, preorderLabel }: Props) {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const { orderType, setOrderType, deliveryAddress } = useAddress();

  const isPickupAvailable = storeInfo?.settings?.orderTypes?.takeaway ?? true;
  const isDeliveryAvailable = storeInfo?.settings?.orderTypes?.delivery ?? false;
  const isDineIn = !!storeInfo?.tableInfo?.token;

  const isDelivery = orderType === 'delivery';
  const open = isRestaurantOpen(storeInfo?.timings || {});
  const { close } = getTodayTimings(storeInfo?.timings);

  const rate = getPostalRateInfo(Number(deliveryAddress?.postalCode || 0), storeInfo?.postalRates || []);

  const chooseDelivery = () => {
    if (!deliveryAddress) onRequireAddress();
    else setOrderType('delivery');
  };

  if (isDineIn) return null;

  const seg = (active: boolean) =>
    cn(
      'inline-flex items-center gap-2 rounded-[19px] px-4 text-[13.5px] font-bold transition',
      active ? 'bg-primary text-selected-text' : 'text-fg-secondary hover:bg-white/[0.06] hover:text-white'
    );

  return (
    <div className='shell shell-pad border-b border-border-strong py-[18px]'>
      <div className='flex flex-wrap items-center gap-3.5'>
        {/* Order type toggle */}
        {(isPickupAvailable || isDeliveryAvailable) && (
          <div className='flex items-center gap-1.5 rounded-3xl border border-border bg-surface-1 p-[5px]'>
            {isDeliveryAvailable && (
              <button onClick={chooseDelivery} className={seg(isDelivery)} style={{ height: 38 }}>
                <Bike className='h-4 w-4' />
                {t.delivery}
                {rate.deliveryTime ? ` ${rate.deliveryTime} Min.` : ''}
              </button>
            )}
            {isPickupAvailable && (
              <button onClick={() => setOrderType('pickup')} className={seg(!isDelivery)} style={{ height: 38 }}>
                <ShoppingBag className='h-[15px] w-[15px]' />
                {t.pickup}
              </button>
            )}
          </div>
        )}

        {/* Info row */}
        <div className='flex flex-wrap items-center gap-3 text-[13.5px] font-semibold text-muted-foreground'>
          {open ? (
            <span>
              {t.openUntil ?? 'Open until'} {close}
            </span>
          ) : (
            <span className='text-brand-red'>{t.closed ?? 'Closed'}</span>
          )}
          {isDelivery && rate.minimumOrderAmount != null && (
            <>
              <span className='opacity-40'>·</span>
              <span>
                {t.minimumOrderValue ?? 'MOV'}: <span className='font-bold text-white'>{formatPrice(rate.minimumOrderAmount)}</span>
              </span>
            </>
          )}
          {isDelivery && rate.deliveryCharges != null && (
            <>
              <span className='opacity-40'>·</span>
              <span className='inline-flex items-center gap-1.5'>
                <Bike className='h-[15px] w-[15px]' />
                <span className='font-bold text-white'>{rate.deliveryCharges > 0 ? formatPrice(rate.deliveryCharges) : (t.free ?? 'Free')}</span>
              </span>
            </>
          )}
          {onOpenInfo && (
            <>
              <span className='opacity-40'>·</span>
              <button onClick={onOpenInfo} className='font-bold text-link'>
                {t.restaurantDetails ?? 'Restaurant details'}
              </button>
            </>
          )}
        </div>

        {onOpenPreorder && (
          <button
            onClick={onOpenPreorder}
            className='ml-auto inline-flex items-center gap-2 rounded-[21px] border border-border bg-surface-1 px-[18px] text-[13.5px] font-bold text-white transition hover:border-border-strong hover:bg-elevated'
            style={{ height: 42 }}>
            <Clock className='h-4 w-4' />
            {preorderLabel ?? (t.preorder ?? 'Pre-order')}
          </button>
        )}
      </div>
    </div>
  );
}

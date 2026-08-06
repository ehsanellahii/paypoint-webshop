/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from 'react';
import { useAddress } from '~/contexts/address-context';
import { cn } from '~/lib/utils';
import DeliveryAddressModal from '../dialogs/DeliveryAddressModal';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';

type OrderType = 'pickup' | 'delivery' | 'dineIn';

function OrderTypeToggle({
  t,
  value,
  onChange,
  isPickupAvailable,
  isDeliveryAvailable,
  isDineInAvailable,
  className,
}: {
  t: any;
  value: OrderType;
  onChange: (v: OrderType) => void;
  isPickupAvailable: boolean;
  isDeliveryAvailable: boolean;
  isDineInAvailable: boolean;
  className?: string;
}) {
  const options = useMemo(() => {
    const items: { key: OrderType; label: string; available: boolean }[] = [];

    if (isDineInAvailable) {
      items.push({ key: 'dineIn', label: t.dineIn ?? 'Dine In', available: true });
    } else {
      items.push({ key: 'pickup', label: t.pickup ?? 'Pickup', available: isPickupAvailable });
      items.push({ key: 'delivery', label: t.delivery ?? 'Delivery', available: isDeliveryAvailable });
    }

    return items.filter((x) => x.available);
  }, [t, isPickupAvailable, isDeliveryAvailable, isDineInAvailable]);
  if (options.length < 1) return null;

  return (
    <div className={cn('bg-gray-200 rounded-full flex items-center p-1', className)} role='radiogroup' aria-label='Order type'>
      {options.map((opt) => (
        <button
          key={opt.key}
          type='button'
          role='radio'
          aria-checked={value === opt.key}
          onClick={() => onChange(opt.key)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition',
            value === opt.key ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'
          )}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const OrderTypeAndAddressControl = () => {
  const storeInfo = useStore();
  const { t } = useLanguage();
  const isPickupAvailable = storeInfo?.settings?.orderTypes?.takeaway ?? true;
  const isDeliveryAvailable = storeInfo?.settings?.orderTypes?.delivery ?? false;
  const isDineInAvailable = false; // storeInfo?.settings?.orderTypes?.dineIn ?? false;

  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const { orderType, setOrderType, deliveryAddress, setDeliveryAddress } = useAddress();
  const onChooseDelivery = () => {
    setIsDeliveryModalOpen(true);
  };

  useEffect(() => {
    const available: OrderType[] = [];

    if (isDineInAvailable) available.push('dineIn');
    else {
      if (isPickupAvailable) available.push('pickup');
      if (isDeliveryAvailable) available.push('delivery');
    }

    if (available.length === 0) return;

    if (!available.includes(orderType)) {
      setOrderType(available[0]); // first available becomes selected
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPickupAvailable, isDeliveryAvailable, isDineInAvailable, orderType]);
  return (
    <>
      <div className='flex flex-col lg:flex-row flex-wrap gap-2 justify-start items-center lg:items-start lg:justify-start pr-1 pt-2 lg:pt-0'>
        <div className='md:mr-2'>
          <OrderTypeToggle
            t={t}
            value={orderType}
            onChange={(v) => {
              if (v === 'delivery' && !deliveryAddress) {
                onChooseDelivery();
              } else {
                setOrderType(v);
              }
            }}
            isPickupAvailable={isPickupAvailable}
            isDeliveryAvailable={isDeliveryAvailable}
            isDineInAvailable={isDineInAvailable}
            className='mr-2'
          />
        </div>

        {orderType === 'delivery' && deliveryAddress && (
          <button
            onClick={() => setIsDeliveryModalOpen(true)}
            className=' bg-gray-200 hover:bg-gray-300 transition rounded-full flex gap-x-2 px-4 py-3 text-sm text-left hover:cursor-pointer flex-wrap'
            aria-label='Change delivery address'>
            <h5 className='font-medium text-gray-800'>{t.deliverTo}</h5>
            <p className='text-gray-600 truncate max-w-[320px]'>
              {deliveryAddress.route}, {deliveryAddress.streetNumber}, {deliveryAddress.postalCode} {deliveryAddress.locality}
            </p>
          </button>
        )}
      </div>{' '}
      <DeliveryAddressModal
        open={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        onSelect={(addr) => {
          setDeliveryAddress(addr); // ✅ persisted + global
          setIsDeliveryModalOpen(false);
        }}
        googleApiKey={storeInfo?.posGoogleApiKey || ''}
        onSuccess={() => {
          if (orderType !== 'delivery') setOrderType('delivery');
        }}
      />
    </>
  );
};

export default OrderTypeAndAddressControl;

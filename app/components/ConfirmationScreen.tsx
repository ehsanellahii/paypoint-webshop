'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, FileText, MapPin, CreditCard, Loader2, HelpCircle, ChevronRight, ChevronLeft } from 'lucide-react';

import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { formatPrice } from '~/lib/api';
import { buildStaticMap, buildRouteMap } from '~/lib/staticMap';
import { getPlacedOrder, type PlacedOrder } from '~/lib/lastOrder';
import { useAddress } from '~/contexts/address-context';
import ShopHeaderMinimal from '~/components/menu/ShopHeaderMinimal';
import UserDrawer from '~/components/Header/UserDrawer';
import { getStatusMeta } from '~/components/Header/OrdersPanel';

export default function ConfirmationScreen() {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const { deliveryAddress } = useAddress();
  const { slug, toMenu } = useStoreNavigation();
  const searchParams = useSearchParams();
  const orderRef = searchParams?.get('order') || '';

  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    setOrder(getPlacedOrder(slug, orderRef));
    setHydrated(true);
  }, [slug, orderRef]);

  const isDelivery = order?.isDelivery ?? false;

  const now = Date.now();
  const fmtTime = (ms: number) => {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  // A viewed past order carries `status`; a freshly placed one does not.
  const isPast = !!order?.status;
  const statusMeta = order?.status ? getStatusMeta(order.status, t) : null;
  const eta = order?.etaLabel ?? (isPast ? (statusMeta?.label ?? '—') : order ? `${fmtTime(now + order.etaLo * 60000)} – ${fmtTime(now + order.etaHi * 60000)}` : '—');
  const isScheduled = !isPast && !!order?.etaLabel;

  const mapKey = storeInfo?.posGoogleApiKey || storeInfo?.adminGoogleApiKey || '';
  const storeCoord = storeInfo?.coordinates ? { lat: storeInfo.coordinates.latitude, lng: storeInfo.coordinates.longitude } : null;
  // Delivery: draw the store → customer route line. Fall back to a single
  // customer marker if the store has no coordinates.
  const routeUrl = isDelivery && deliveryAddress ? buildRouteMap(storeCoord, { lat: deliveryAddress.lat, lng: deliveryAddress.lng }, mapKey, 560, 260) : '';
  const mapUrl = routeUrl || (isDelivery && deliveryAddress ? buildStaticMap(deliveryAddress.lat, deliveryAddress.lng, mapKey, 560, 260) : '');

  if (!hydrated) {
    return (
      <div className='min-h-screen bg-background text-foreground'>
        <ShopHeaderMinimal onOpenAccount={() => setAccountOpen(true)} />
        <div className='flex min-h-[60vh] items-center justify-center'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background text-foreground'>
      <ShopHeaderMinimal onOpenAccount={() => setAccountOpen(true)} />
      <div className='mx-auto max-w-[1080px] px-4 pb-24 pt-7 md:px-8'>
        <button onClick={toMenu} className='mb-6 inline-flex h-11 items-center gap-2 rounded-[13px] border border-border bg-surface-1 px-4 text-sm font-bold text-white transition hover:bg-surface-2'>
          <ChevronLeft className='h-[17px] w-[17px]' strokeWidth={2.2} />
          {t.backToHome ?? 'Back to home'}
        </button>

        {/* Success hero */}
        <div className='mb-7 flex flex-col items-center text-center'>
          <div className='relative flex h-[84px] w-[84px] items-center justify-center'>
            <div className='absolute inset-0 rounded-full bg-success/10' />
            <div className='absolute inset-[11px] rounded-full bg-success/20' />
            <div className='anim-pop relative flex h-[54px] w-[54px] items-center justify-center rounded-full bg-success'>
              <Check className='h-7 w-7 text-[#0f2a1a]' strokeWidth={2.6} />
            </div>
          </div>
          <h1 className='mt-4 text-[30px] font-extrabold tracking-tight'>{isPast ? (t.orderDetails ?? 'Order details') : (t.orderConfirmed ?? 'Order confirmed')}</h1>
          <p className='mt-2 max-w-[380px] text-sm font-medium leading-relaxed text-muted-foreground'>
            {isPast ? `${t.order ?? 'Order'} ${order?.orderRef}` : isScheduled ? `${t.preorder} · ${order?.etaLabel}` : (t.orderConfirmedDeliverySub ?? 'The kitchen is preparing your food.')}
          </p>
        </div>

        {!order ? (
          <div className='rounded-2xl border border-border bg-surface-1 p-8 text-center'>
            <div className='text-lg font-extrabold'>{t.orderConfirmed ?? 'Order confirmed'}</div>
            {orderRef && (
              <div className='mt-2 text-sm text-muted-foreground'>
                {t.orderNumber ?? 'Order number'}: <span className='font-extrabold text-white'>{orderRef}</span>
              </div>
            )}
            <button onClick={toMenu} className='mt-5 h-12 rounded-2xl bg-primary px-6 text-sm font-extrabold text-selected-text'>
              {t.backToHome ?? 'Back to home'}
            </button>
          </div>
        ) : (
          <div className='grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.5fr_1fr]'>
            {/* LEFT — tracking */}
            <div className='flex flex-col gap-4'>
              <div className='overflow-hidden rounded-[22px] border border-border bg-surface-1'>
                <div
                  className='relative h-[240px] bg-surface-3 bg-cover bg-center'
                  style={mapUrl ? { backgroundImage: `url(${mapUrl})` } : { background: 'linear-gradient(135deg,#26262a,#141416)' }}>
                  <div className='absolute left-4 top-4 inline-flex h-[34px] items-center gap-2 rounded-[11px] bg-[rgba(15,15,17,0.78)] px-3.5 text-[12.5px] font-bold text-success backdrop-blur'>
                    <span className='h-2 w-2 rounded-full bg-success shadow-[0_0_0_4px_rgba(70,209,127,0.25)]' />
                    {isPast ? (statusMeta?.label ?? '') : isScheduled ? (t.preorder ?? 'Pre-ordered') : (t.inProgress ?? 'In progress')}
                  </div>
                </div>
                <div className='p-5'>
                  <div className='text-[13px] font-semibold text-muted-foreground'>{isPast ? (t.status ?? 'Status') : isDelivery ? (t.estimatedDelivery ?? 'Estimated delivery') : (t.readyForPickup ?? 'Ready for pickup')}</div>
                  <div className='mt-1 text-[30px] font-extrabold tracking-tight'>{eta}</div>
                  <div className='mt-4 flex gap-1.5'>
                    <div className='h-[5px] flex-1 rounded-[3px] bg-success' />
                    <div className='h-[5px] flex-1 rounded-[3px] bg-[#3a3c40]' />
                    <div className='h-[5px] flex-1 rounded-[3px] bg-[#3a3c40]' />
                  </div>
                  <div className='mt-2.5 flex justify-between text-xs font-semibold text-muted-foreground'>
                    <span className='text-white'>{t.preparation ?? 'Preparation'}</span>
                    <span>{isDelivery ? (t.onTheWay ?? 'On the way') : (t.ready ?? 'Ready')}</span>
                    <span>{isDelivery ? (t.delivered ?? 'Delivered') : (t.pickedUp ?? 'Picked up')}</span>
                  </div>
                </div>
              </div>

              {isDelivery && !isPast && (
                <div className='flex items-center gap-3 rounded-[18px] border border-border bg-surface-1 p-4'>
                  <div className='flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-card'>
                    <Loader2 className='h-[18px] w-[18px] animate-spin text-white' />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='text-[15px] font-bold'>{t.courierBeingAssigned ?? 'Courier being assigned'}</div>
                    <div className='mt-0.5 text-[12.5px] font-medium text-muted-foreground'>{t.courierBeingAssignedSub ?? ''}</div>
                  </div>
                </div>
              )}

              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div className='flex items-center gap-3 rounded-2xl border border-border bg-surface-1 p-4'>
                  <FileText className='h-5 w-5 shrink-0 text-muted-foreground' />
                  <div className='min-w-0'>
                    <div className='text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground'>{t.orderNumber ?? 'Order number'}</div>
                    <div className='mt-0.5 text-[14.5px] font-extrabold'>{order.orderRef || '—'}</div>
                  </div>
                </div>
                <div className='flex items-center gap-3 rounded-2xl border border-border bg-surface-1 p-4'>
                  <MapPin className='h-5 w-5 shrink-0 text-muted-foreground' />
                  <div className='min-w-0'>
                    <div className='text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground'>{isDelivery ? (t.deliverTo ?? 'Delivery to') : (t.pickupAt ?? 'Pickup at')}</div>
                    <div className='mt-0.5 truncate text-[13px] font-semibold'>{order.addressLine}</div>
                  </div>
                </div>
                <div className='flex items-center gap-3 rounded-2xl border border-border bg-surface-1 p-4'>
                  <CreditCard className='h-5 w-5 shrink-0 text-muted-foreground' />
                  <div className='min-w-0'>
                    <div className='text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground'>{t.payment ?? 'Payment'}</div>
                    <div className='mt-0.5 text-[13px] font-semibold'>{order.paymentName}</div>
                  </div>
                </div>
              </div>

              {/* Full-width support row — opens the account drawer (support view) */}
              <button onClick={() => setAccountOpen(true)} className='flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-1 p-4 text-left transition hover:bg-surface-2'>
                <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-surface-3'>
                  <HelpCircle className='h-5 w-5 text-muted-foreground' />
                </span>
                <div className='min-w-0 flex-1'>
                  <div className='text-[15px] font-bold'>{t.problemWithOrder ?? 'Problem with your order?'}</div>
                  <div className='mt-0.5 text-[12.5px] font-medium text-muted-foreground'>{t.helpAndSupport ?? 'Help & support'}</div>
                </div>
                <ChevronRight className='h-[17px] w-[17px] shrink-0 text-[#55575c]' />
              </button>
            </div>

            {/* RIGHT — order summary */}
            <div className='rounded-[22px] border border-border bg-surface-1 p-5 lg:sticky lg:top-6'>
              <div className='text-[12px] font-bold uppercase tracking-[0.04em] text-muted-foreground'>{t.yourOrder ?? 'Your order'}</div>
              <div className='mt-4 flex flex-col gap-3.5'>
                {order.items.map((item, i) => (
                  <div key={i} className='flex items-center gap-3'>
                    <div className='w-6 shrink-0 text-sm font-extrabold'>{item.qty}×</div>
                    <div className='h-[42px] w-[42px] shrink-0 rounded-[11px] bg-white bg-cover bg-center' style={item.image ? { backgroundImage: `url(${item.image})` } : undefined} />
                    <div className='min-w-0 flex-1 text-[13.5px] font-semibold leading-tight text-[#e7e8ea]'>{item.name}</div>
                    <div className='shrink-0 text-sm font-bold'>{formatPrice(item.lineTotal)}</div>
                  </div>
                ))}
              </div>
              <div className='mt-4 flex items-baseline justify-between border-t border-border pt-4'>
                <span className='text-[15px] font-extrabold'>{t.total ?? 'Total'}</span>
                <span className='text-xl font-extrabold'>{formatPrice(order.total)}</span>
              </div>
              <button onClick={toMenu} className='mt-5 h-14 w-full rounded-2xl bg-primary text-[15px] font-extrabold text-selected-text transition active:scale-[0.98]'>
                {t.backToHome ?? 'Back to home'}
              </button>
            </div>
          </div>
        )}
      </div>

      <UserDrawer open={accountOpen} onClose={() => setAccountOpen(false)} onOpenOrders={() => undefined} storeSlug={storeInfo?.slug} />
    </div>
  );
}

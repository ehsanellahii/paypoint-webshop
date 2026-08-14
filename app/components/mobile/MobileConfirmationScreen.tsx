'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, ChevronLeft, CreditCard, FileText, HelpCircle, Loader2, MapPin } from 'lucide-react';

import MobileShell, { MobileScreen, SAFE_TOP } from '~/components/mobile/MobileShell';
import UserDrawer from '~/components/Header/UserDrawer';
import { getStatusMeta } from '~/components/Header/OrdersPanel';
import { formatPrice } from '~/lib/api';
import SmartImage from '~/lib/SmartImage';
import { buildStaticMap } from '~/lib/staticMap';
import RouteMap from '~/components/checkout/RouteMap';
import { getPlacedOrder, type PlacedOrder } from '~/lib/lastOrder';
import { useAddress } from '~/contexts/address-context';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';

/**
 * Order confirmation as a full screen (mobile).
 *
 * The map is the hero here rather than a card, with the sheet curving over its
 * lower edge; desktop instead puts a success header above a two-column layout.
 */
export default function MobileConfirmationScreen() {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const { deliveryAddress } = useAddress();
  const { slug, toMenu } = useStoreNavigation();
  const orderRef = useSearchParams()?.get('order') || '';

  const [state, setState] = useState<{ order: PlacedOrder | null; etaWindow: string | null; hydrated: boolean }>({
    order: null,
    etaWindow: null,
    hydrated: false,
  });
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    const placed = getPlacedOrder(slug, orderRef);
    let etaWindow: string | null = null;
    if (placed && !placed.etaLabel && !placed.status) {
      const fmt = (ms: number) => {
        const d = new Date(ms);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      };
      const now = Date.now();
      etaWindow = `${fmt(now + placed.etaLo * 60000)} – ${fmt(now + placed.etaHi * 60000)}`;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage can only be read after mount; see the desktop screen for the same note.
    setState({ order: placed, etaWindow, hydrated: true });
  }, [slug, orderRef]);

  const { order, etaWindow, hydrated } = state;
  const isDelivery = order?.isDelivery ?? false;
  const isPast = !!order?.status;
  const statusMeta = order?.status ? getStatusMeta(order.status, t) : null;
  const eta = order?.etaLabel ?? (isPast ? (statusMeta?.label ?? '—') : (etaWindow ?? '—'));

  const mapKey = storeInfo?.posGoogleApiKey || storeInfo?.adminGoogleApiKey || '';
  const storeCoord = storeInfo?.coordinates ? { lat: storeInfo.coordinates.latitude, lng: storeInfo.coordinates.longitude } : null;
  const customerCoord = deliveryAddress?.lat && deliveryAddress?.lng ? { lat: deliveryAddress.lat, lng: deliveryAddress.lng } : null;
  const canRoute = !!(isDelivery && storeCoord && customerCoord && mapKey);
  const routeUrl = '';
  const mapUrl = routeUrl || (isDelivery && deliveryAddress ? buildStaticMap(deliveryAddress.lat, deliveryAddress.lng, mapKey, 440, 300) : '');

  if (!hydrated) {
    return (
      <MobileShell>
        <div className='flex h-full items-center justify-center'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <MobileScreen>
        <button
          onClick={toMenu}
          aria-label={t.back}
          className='absolute left-[18px] z-[8] flex h-10 w-10 items-center justify-center rounded-full bg-card text-white'
          style={{ top: SAFE_TOP }}>
          <ChevronLeft className='h-[19px] w-[19px]' strokeWidth={2.4} />
        </button>

        {/*
          Map hero. With a route the pins carry the meaning, so the centred halo
          and pulse are only drawn for the single-point fallback — over an
          auto-framed route they would ring empty road.
        */}
        {canRoute ? (
          <RouteMap store={storeCoord!} customer={customerCoord!} apiKey={mapKey} width={440} height={300} />
        ) : (
          <div className='relative h-[300px] bg-background'>
            {mapUrl ? (
              <div className='absolute inset-0 bg-cover bg-center' style={{ backgroundImage: `url("${mapUrl}")` }} />
            ) : (
              <div className='absolute inset-0 bg-card' />
            )}
            <div className='absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(28,155,239,0.12)]' aria-hidden />
            <div className='anim-pulse-ring absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-background bg-success' aria-hidden />
          </div>
        )}

        {/* Sheet curving over the map */}
        <div className='relative z-[2] -mt-[26px] rounded-t-[26px] bg-background px-5 pb-10 pt-6'>
          <div className='flex items-center gap-3.5'>
            <div className='anim-pop flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-success'>
              <Check className='h-6 w-6 text-[#0d1f14]' strokeWidth={3} />
            </div>
            <div className='min-w-0'>
              <div className='text-[20px] font-extrabold tracking-[-0.01em] text-white'>{isPast ? t.orderDetails : t.orderConfirmed}</div>
              <div className='mt-0.5 truncate text-[13px] font-medium text-muted-foreground'>
                {isPast ? `${t.order} ${order?.orderRef}` : isDelivery ? t.orderConfirmedDeliverySub : t.orderConfirmedPickupSub}
              </div>
            </div>
          </div>

          {/* Tracking */}
          <div className='mt-[22px] rounded-[18px] bg-card p-[18px]'>
            <div className='flex items-baseline justify-between'>
              <span className='text-[13px] font-semibold text-muted-foreground'>{isPast ? t.status : isDelivery ? t.estimatedDelivery : t.readyForPickup}</span>
              <span className='text-[13px] font-bold text-success'>{isPast ? (statusMeta?.label ?? '') : t.inProgress}</span>
            </div>
            <div className='mt-1 text-[26px] font-extrabold tracking-[-0.01em] text-white'>{eta}</div>
            <div className='mt-3.5 flex gap-1.5'>
              <div className='h-[5px] flex-1 rounded-[3px] bg-success' />
              <div className='h-[5px] flex-1 rounded-[3px] bg-track' />
              <div className='h-[5px] flex-1 rounded-[3px] bg-track' />
            </div>
            <div className='mt-2 flex justify-between text-[11.5px] font-semibold text-muted-foreground'>
              <span className='text-white'>{t.preparation}</span>
              <span>{isDelivery ? t.onTheWay : t.ready}</span>
              <span>{isDelivery ? t.delivered : t.pickedUp}</span>
            </div>
          </div>

          {order && (
            <>
              {/* Facts */}
              <div className='mt-3 grid grid-cols-1 gap-2.5'>
                <div className='flex items-center gap-3 rounded-[16px] bg-card p-4'>
                  <FileText className='h-5 w-5 shrink-0 text-muted-foreground' />
                  <div className='min-w-0'>
                    <div className='text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground'>{t.orderNumber}</div>
                    <div className='mt-0.5 text-[14.5px] font-extrabold text-white'>{order.orderRef || '—'}</div>
                  </div>
                </div>
                <div className='flex items-center gap-3 rounded-[16px] bg-card p-4'>
                  <MapPin className='h-5 w-5 shrink-0 text-muted-foreground' />
                  <div className='min-w-0'>
                    <div className='text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground'>{isDelivery ? t.deliverTo : t.pickupAt}</div>
                    <div className='mt-0.5 truncate text-[13px] font-semibold text-white'>{order.addressLine}</div>
                  </div>
                </div>
                <div className='flex items-center gap-3 rounded-[16px] bg-card p-4'>
                  <CreditCard className='h-5 w-5 shrink-0 text-muted-foreground' />
                  <div className='min-w-0'>
                    <div className='text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground'>{t.payment}</div>
                    <div className='mt-0.5 text-[13px] font-semibold text-white'>{order.paymentName}</div>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className='mt-5 text-[12px] font-bold uppercase tracking-[0.04em] text-muted-foreground'>{t.yourOrder}</div>
              <div className='mt-3 flex flex-col gap-3.5'>
                {order.items.map((item, i) => (
                  <div key={i} className='flex items-center gap-3'>
                    <div className='w-6 shrink-0 text-sm font-extrabold text-white'>{item.qty}×</div>
                    {item.image ? (
                      <SmartImage src={item.image} alt={item.name} sizes='42px' className='object-cover' wrapperClassName='h-[42px] w-[42px] shrink-0 rounded-[11px]' />
                    ) : (
                      <div className='h-[42px] w-[42px] shrink-0 rounded-[11px] bg-card' />
                    )}
                    <div className='min-w-0 flex-1 truncate text-[13.5px] font-semibold text-fg-strong'>{item.name}</div>
                    <div className='shrink-0 text-sm font-bold text-white'>{formatPrice(item.lineTotal)}</div>
                  </div>
                ))}
              </div>
              <div className='mt-4 flex items-baseline justify-between border-t border-border pt-4'>
                <span className='text-[15px] font-extrabold text-white'>{t.total}</span>
                <span className='text-xl font-extrabold text-white'>{formatPrice(order.total)}</span>
              </div>
            </>
          )}

          <button onClick={() => setAccountOpen(true)} className='mt-5 flex w-full items-center gap-3 rounded-[16px] bg-card p-4 text-left'>
            <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-surface-3'>
              <HelpCircle className='h-5 w-5 text-muted-foreground' />
            </span>
            <div className='min-w-0 flex-1'>
              <div className='text-[15px] font-bold text-white'>{t.problemWithOrder}</div>
              <div className='mt-0.5 text-[12.5px] font-medium text-muted-foreground'>{t.helpAndSupport}</div>
            </div>
          </button>

          <button onClick={toMenu} className='mt-4 h-14 w-full rounded-2xl bg-primary text-[15px] font-extrabold text-selected-text transition active:scale-[0.98]'>
            {t.backToHome}
          </button>
        </div>
      </MobileScreen>

      <UserDrawer open={accountOpen} onClose={() => setAccountOpen(false)} onOpenOrders={() => undefined} storeSlug={storeInfo?.slug} />
    </MobileShell>
  );
}

'use client';

import { useState } from 'react';
import { AlertCircle, FileText, MapPin, CreditCard, Loader2, HelpCircle, ChevronRight, ChevronLeft } from 'lucide-react';

import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { useConfirmation } from '~/hooks/useConfirmation';
import { formatPrice } from '~/lib/api';
import { buildStaticMap } from '~/lib/staticMap';
import RouteMap from '~/components/checkout/RouteMap';
import { useAddress } from '~/contexts/address-context';
import ShopHeaderMinimal from '~/components/menu/ShopHeaderMinimal';
import UserDrawer from '~/components/Header/UserDrawer';
import { getStatusMeta } from '~/components/Header/OrdersPanel';
import { serverPaymentMethodLabel } from '~/components/checkout/PaymentSheet';

export default function ConfirmationScreen() {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const { deliveryAddress } = useAddress();
  const { toMenu, toCheckout } = useStoreNavigation();

  // Order lookup, webhook polling, the redirect result and clearing the basket
  // all live in the hook, shared with the mobile screen.
  const { orderRef, order, etaWindow, hydrated, waiting, unresolved, paymentFailed, refunded, isPast, isDelivery } = useConfirmation();

  const [accountOpen, setAccountOpen] = useState(false);

  const statusMeta = order?.status ? getStatusMeta(order.status, t) : null;
  const eta = order?.etaLabel ?? (isPast ? (statusMeta?.label ?? '—') : (etaWindow ?? '—'));
  const isScheduled = !isPast && !!order?.etaLabel;

  const mapKey = storeInfo?.posGoogleApiKey || storeInfo?.adminGoogleApiKey || '';
  const storeCoord = storeInfo?.coordinates ? { lat: storeInfo.coordinates.latitude, lng: storeInfo.coordinates.longitude } : null;
  // Delivery: draw the store → customer route line. Fall back to a single
  // customer marker if the store has no coordinates.
  const customerCoord = deliveryAddress?.lat && deliveryAddress?.lng ? { lat: deliveryAddress.lat, lng: deliveryAddress.lng } : null;
  const canRoute = !!(isDelivery && storeCoord && customerCoord && mapKey);
  const routeUrl = '';
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

  /*
   * Stripe sent the customer back from PayPal or Klarna with a declined or
   * abandoned payment. Nothing was ordered, so none of the receipt below
   * applies — and rendering it anyway is what used to make a failed payment
   * read as a success. The basket is untouched, so "try again" is a real offer.
   */
  if (paymentFailed) {
    return (
      <div className='min-h-screen bg-background text-foreground'>
        <ShopHeaderMinimal onOpenAccount={() => setAccountOpen(true)} />
        <div className='mx-auto max-w-[560px] px-4 pb-24 pt-16 md:px-8'>
          <div className='rounded-[22px] border border-border bg-surface-1 p-8 text-center'>
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-text/12'>
              <AlertCircle className='h-6 w-6 text-error-text' strokeWidth={2.2} />
            </div>
            <h1 className='m-0 text-[22px] font-extrabold tracking-[-0.02em]'>
              {t.paymentFailed ?? 'Payment failed'}
            </h1>
            <p className='mt-2.5 text-[14.5px] font-medium leading-relaxed text-muted-foreground'>
              {t.paymentNotCompletedSub ?? 'Your payment was not completed, so no order has been placed. Your basket is still here.'}
            </p>
            <button
              onClick={toCheckout}
              className='mt-6 h-12 w-full rounded-2xl bg-primary px-6 text-sm font-extrabold text-selected-text transition active:scale-[0.98]'>
              {t.tryAgain ?? 'Try again'}
            </button>
            <button onClick={toMenu} className='mt-2.5 h-11 w-full text-[13.5px] font-bold text-muted-foreground'>
              {t.backToHome ?? 'Back to home'}
            </button>
          </div>
        </div>
        <UserDrawer open={accountOpen} onClose={() => setAccountOpen(false)} onOpenOrders={() => undefined} storeSlug={storeInfo?.slug} />
      </div>
    );
  }

  /*
   * We waited and the order never appeared. Anything below this point renders a
   * receipt from the session snapshot — which was written before the customer
   * paid — so showing it here would tell someone their food was being prepared
   * when nothing ever reached the kitchen. Give them the reference and a way to
   * reach the restaurant instead.
   */
  if (unresolved) {
    return (
      <div className='min-h-screen bg-background text-foreground'>
        <ShopHeaderMinimal onOpenAccount={() => setAccountOpen(true)} />
        <div className='mx-auto max-w-[560px] px-4 pb-24 pt-16 md:px-8'>
          <div className='rounded-[22px] border border-border bg-surface-1 p-8 text-center'>
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/12'>
              <AlertCircle className='h-6 w-6 text-warning' strokeWidth={2.2} />
            </div>
            <h1 className='m-0 text-[22px] font-extrabold tracking-[-0.02em]'>
              {t.orderNotConfirmed ?? 'We could not confirm your order'}
            </h1>
            <p className='mt-2.5 text-[14.5px] font-medium leading-relaxed text-muted-foreground'>
              {t.orderNotConfirmedSub ?? 'Your payment may have gone through, but we have not been able to confirm the order. Please contact the restaurant with the reference below before ordering again.'}
            </p>

            <div className='mt-5 rounded-2xl border border-border bg-surface-2 px-4 py-3'>
              <div className='text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground-2'>
                {t.orderNumber ?? 'Order number'}
              </div>
              <div className='mt-1 font-mono text-[19px] font-bold tracking-[0.02em]'>{orderRef || '—'}</div>
            </div>

            {storeInfo?.phone && (
              <a
                href={`tel:${storeInfo.phone}`}
                className='mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-6 text-sm font-extrabold text-selected-text transition active:scale-[0.98]'>
                {t.callTheRestaurant ?? 'Call the restaurant'} · {storeInfo.phone}
              </a>
            )}
            <button onClick={toMenu} className='mt-2.5 h-11 w-full text-[13.5px] font-bold text-muted-foreground'>
              {t.backToHome ?? 'Back to home'}
            </button>
          </div>
        </div>
        <UserDrawer open={accountOpen} onClose={() => setAccountOpen(false)} onOpenOrders={() => undefined} storeSlug={storeInfo?.slug} />
      </div>
    );
  }

  /*
   * The webhook has not turned the payment into an order yet.
   *
   * Its own screen rather than a badge on the receipt: everything below —
   * the headline, the ETA, the empty-state card — is written to describe an
   * order that exists, and dressing it with a "confirming" chip produced a page
   * that said *Confirming payment*, *the kitchen is preparing your food* and
   * *Order confirmed* all at once. Nothing here claims more than we know.
   */
  if (waiting) {
    return (
      <div className='min-h-screen bg-background text-foreground'>
        <ShopHeaderMinimal onOpenAccount={() => setAccountOpen(true)} />
        <div className='mx-auto max-w-[560px] px-4 pb-24 pt-16 md:px-8'>
          <div className='rounded-[22px] border border-border bg-surface-1 p-8 text-center'>
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
            <h1 className='m-0 text-[22px] font-extrabold tracking-[-0.02em]'>
              {t.confirmingPayment ?? 'Confirming payment'}
            </h1>
            <p className='mt-2.5 text-[14.5px] font-medium leading-relaxed text-muted-foreground'>
              {t.confirmingPaymentSub ?? 'This usually takes a few seconds. Please keep this page open.'}
            </p>

            {orderRef && (
              <div className='mt-5 rounded-2xl border border-border bg-surface-2 px-4 py-3'>
                <div className='text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground-2'>
                  {t.orderNumber ?? 'Order number'}
                </div>
                <div className='mt-1 font-mono text-[19px] font-bold tracking-[0.02em]'>{orderRef}</div>
              </div>
            )}
          </div>
        </div>
        <UserDrawer open={accountOpen} onClose={() => setAccountOpen(false)} onOpenOrders={() => undefined} storeSlug={storeInfo?.slug} />
      </div>
    );
  }

  /*
   * Refunded. A full refund also cancels the order, so the receipt below — with
   * its ETA and "the kitchen is preparing your food" — would describe something
   * that is no longer happening.
   */
  if (refunded && order) {
    return (
      <div className='min-h-screen bg-background text-foreground'>
        <ShopHeaderMinimal onOpenAccount={() => setAccountOpen(true)} />
        <div className='mx-auto max-w-[560px] px-4 pb-24 pt-16 md:px-8'>
          <div className='rounded-[22px] border border-border bg-surface-1 p-8 text-center'>
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/12'>
              <CreditCard className='h-6 w-6 text-warning' strokeWidth={2.2} />
            </div>
            <h1 className='m-0 text-[22px] font-extrabold tracking-[-0.02em]'>
              {t.orderRefunded ?? 'This order was refunded'}
            </h1>
            <p className='mt-2.5 text-[14.5px] font-medium leading-relaxed text-muted-foreground'>
              {t.orderRefundedSub ?? 'The restaurant has refunded this order. Depending on your bank it can take a few days to appear.'}
            </p>

            <div className='mt-5 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-left'>
              <div className='flex items-center justify-between'>
                <span className='text-[13px] font-semibold text-muted-foreground'>{t.orderNumber ?? 'Order number'}</span>
                <span className='font-mono text-[15px] font-bold'>{orderRef || '—'}</span>
              </div>
              {order.amountRefunded != null && (
                <div className='mt-2 flex items-center justify-between border-t border-border pt-2'>
                  <span className='text-[13px] font-semibold text-muted-foreground'>{t.refunded ?? 'Refunded'}</span>
                  <span className='text-[15px] font-extrabold'>{formatPrice(order.amountRefunded)}</span>
                </div>
              )}
            </div>

            <button onClick={toMenu} className='mt-6 h-12 w-full rounded-2xl bg-primary px-6 text-sm font-extrabold text-selected-text transition active:scale-[0.98]'>
              {t.backToHome ?? 'Back to home'}
            </button>
          </div>
        </div>
        <UserDrawer open={accountOpen} onClose={() => setAccountOpen(false)} onOpenOrders={() => undefined} storeSlug={storeInfo?.slug} />
      </div>
    );
  }

  /*
   * Nothing to show: the URL named no order, or named one we cannot find and
   * were never waiting on. Reached by opening /confirmation directly. The
   * receipt below dereferences `order` freely, so this guard is what keeps it
   * safe — and the card that used to stand in for it said "Order confirmed",
   * which was a claim about an order we knew nothing about.
   */
  if (!order) {
    return (
      <div className='min-h-screen bg-background text-foreground'>
        <ShopHeaderMinimal onOpenAccount={() => setAccountOpen(true)} />
        <div className='mx-auto max-w-[560px] px-4 pb-24 pt-16 md:px-8'>
          <div className='rounded-[22px] border border-border bg-surface-1 p-8 text-center'>
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2'>
              <FileText className='h-6 w-6 text-muted-foreground' strokeWidth={2.2} />
            </div>
            <h1 className='m-0 text-[22px] font-extrabold tracking-[-0.02em]'>
              {t.orderNotFound ?? 'Order not found'}
            </h1>
            <p className='mt-2.5 text-[14.5px] font-medium leading-relaxed text-muted-foreground'>
              {t.orderNotFoundSub ?? 'We could not find an order for this link.'}
            </p>
            {orderRef && (
              <div className='mt-5 rounded-2xl border border-border bg-surface-2 px-4 py-3'>
                <div className='text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground-2'>
                  {t.orderNumber ?? 'Order number'}
                </div>
                <div className='mt-1 font-mono text-[19px] font-bold tracking-[0.02em]'>{orderRef}</div>
              </div>
            )}
            <button
              onClick={toMenu}
              className='mt-6 h-12 w-full rounded-2xl bg-primary px-6 text-sm font-extrabold text-selected-text transition active:scale-[0.98]'>
              {t.backToHome ?? 'Back to home'}
            </button>
          </div>
        </div>
        <UserDrawer open={accountOpen} onClose={() => setAccountOpen(false)} onOpenOrders={() => undefined} storeSlug={storeInfo?.slug} />
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

        {/*
          Receipt-style header: status and headline on the left, order number and
          ETA set apart on the right behind a dashed rule — the design swapped the
          centred success disc for this. Stacks below 640px, where the dashed rule
          moves from the left edge to the top.
        */}
        <div className='mb-[30px] flex flex-col items-start justify-between gap-[18px] border-b border-border pb-[26px] min-[641px]:flex-row min-[641px]:gap-6'>
          <div className='min-w-0'>
            {/* Reaching here means the order exists, so this can state it plainly. */}
            <div className='inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success/12 px-[11px] py-[5px]'>
              <span className='h-1.5 w-1.5 rounded-full bg-success' />
              <span className='text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-[#7fd083]'>
                {isPast ? (statusMeta?.label ?? t.statusAccepted) : t.statusAccepted}
              </span>
            </div>
            <h1 className='m-0 mt-3.5 text-[30px] font-extrabold leading-[1.1] tracking-[-0.025em]'>
              {isPast ? (t.orderDetails ?? 'Order details') : `${storeInfo?.brandName ?? ''} ${t.isPreparingYourOrder}`.trim()}
            </h1>
            <p className='mt-2.5 max-w-[420px] text-[14.5px] font-medium leading-relaxed text-muted-foreground'>
              {isPast ? `${t.order ?? 'Order'} ${order?.orderRef}` : isScheduled ? `${t.preorder} · ${order?.etaLabel}` : (t.orderConfirmedDeliverySub ?? '')}
            </p>
          </div>

          <div className='w-full shrink-0 border-t border-dashed border-border-strong pt-4 text-left min-[641px]:w-auto min-[641px]:border-l min-[641px]:border-t-0 min-[641px]:pl-6 min-[641px]:pt-0 min-[641px]:text-right'>
            <div className='text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground-2'>{t.orderNumber ?? 'Order'}</div>
            <div className='mt-1 font-mono text-[20px] font-bold tracking-[0.02em]'>{order?.orderRef || orderRef || '—'}</div>
            <div className='mt-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground-2'>
              {isPast ? (t.status ?? 'Status') : isDelivery ? (t.estimatedDelivery ?? '') : (t.readyForPickup ?? '')}
            </div>
            <div className='mt-1 text-[22px] font-extrabold tracking-[-0.02em]'>{eta}</div>
          </div>
        </div>

        {/* Past this point `order` is guaranteed — see the guard above. */}
          <div className='grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.5fr_1fr]'>
            {/* LEFT — tracking */}
            <div className='flex flex-col gap-4'>
              <div className='overflow-hidden rounded-[22px] border border-border bg-surface-1'>
                {/* Same route map as checkout — real pins, framed to the line. */}
                <div className='relative'>
                  {canRoute ? (
                    <RouteMap store={storeCoord!} customer={customerCoord!} apiKey={mapKey} width={560} height={240} />
                  ) : (
                    <div
                      className='h-[240px] bg-surface-3 bg-cover bg-center'
                      style={mapUrl ? { backgroundImage: `url("${mapUrl}")` } : { background: 'linear-gradient(135deg,#26262a,#141416)' }}
                    />
                  )}
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
                    <div className='h-[5px] flex-1 rounded-[3px] bg-track' />
                    <div className='h-[5px] flex-1 rounded-[3px] bg-track' />
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
                    <div className='mt-0.5 text-[13px] font-semibold'>{serverPaymentMethodLabel(order.paymentName, t)}</div>
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
                <ChevronRight className='h-[17px] w-[17px] shrink-0 text-fg-faint' />
              </button>
            </div>

            {/* RIGHT — order summary */}
            <div className='rounded-[22px] border border-border bg-surface-1 p-5 lg:sticky lg:top-6'>
              <div className='text-[12px] font-bold uppercase tracking-[0.04em] text-muted-foreground'>{t.yourOrder ?? 'Your order'}</div>
              <div className='mt-4 flex flex-col gap-3.5'>
                {order.items.map((item, i) => (
                  <div key={i} className='flex items-center gap-3'>
                    <div className='w-6 shrink-0 text-sm font-extrabold'>{item.qty}×</div>
                    <div className='h-[42px] w-[42px] shrink-0 rounded-[11px] bg-white bg-cover bg-center' style={item.image ? { backgroundImage: `url("${item.image}")` } : undefined} />
                    <div className='min-w-0 flex-1 text-[13.5px] font-semibold leading-tight text-fg-strong'>{item.name}</div>
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
      </div>

      <UserDrawer open={accountOpen} onClose={() => setAccountOpen(false)} onOpenOrders={() => undefined} storeSlug={storeInfo?.slug} />
    </div>
  );
}

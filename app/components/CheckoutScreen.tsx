'use client';

import { useState } from 'react';

import { ChevronLeft, ChevronRight, Bike, ShoppingBag, MapPin, Zap, Check, Clock, Pencil, Ticket, Heart, Loader2, AlertCircle, CreditCard, Bell, Mail, Phone, User } from 'lucide-react';

import { useCheckout, TIP_VALUES } from '~/hooks/useCheckout';
import { formatPrice } from '~/lib/api';

import { cn, formatEtaRange } from '~/lib/utils';
import { buildStaticMap } from '~/lib/staticMap';
import RouteMap from '~/components/checkout/RouteMap';
import ShopHeaderMinimal from '~/components/menu/ShopHeaderMinimal';
import StripePaymentSheet from '~/components/checkout/StripePaymentSheet';
import PhoneVerifyDialog from '~/components/checkout/PhoneVerifyDialog';
import UserDrawer from '~/components/Header/UserDrawer';

import DeliveryAddressModal from '~/components/dialogs/DeliveryAddressModal';
import PreorderModal from '~/components/menu/PreorderModal';
import PaymentSheet, { paymentMethodLabel } from '~/components/checkout/PaymentSheet';
import VoucherSheet from '~/components/checkout/VoucherSheet';
import VoucherFlash from '~/components/checkout/VoucherFlash';


/**
 * The prototype's checkout inputs are standalone rows on `surface-1` with a
 * leading icon and a 1.5px border that turns red on error — not fields inside a
 * bordered "your details" card. Declared at module scope so typing doesn't
 * remount the input.
 */
function FieldRow({
  icon: Icon,
  invalid,
  children,
}: {
  icon: typeof MapPin;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex items-center gap-3 rounded-[14px] bg-surface-1 px-4 py-3.5 transition', invalid ? 'border-[1.5px] border-destructive' : 'border-[1.5px] border-border')}>
      <Icon className='h-5 w-5 shrink-0 text-muted-foreground' strokeWidth={1.8} />
      {children}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className='-mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-error-text'>
      <AlertCircle className='h-[13px] w-[13px] shrink-0' strokeWidth={2} />
      {message}
    </div>
  );
}

const rowInput = 'min-w-0 flex-1 border-none bg-transparent text-[14.5px] font-semibold text-white placeholder:text-muted-foreground';

export default function CheckoutScreen() {
  /*
   * All state, validation and submission live in `useCheckout`, shared with the
   * mobile screen. This component is presentation only.
   */
  const {
    t, storeInfo, cart, totalPrice, discountAmount, appliedVoucher,
    setOrderType, deliveryAddress, setDeliveryAddress, toMenu,
    isDineIn, isDelivery, isPickup,
    deliveryCharges, deliveryTime, priorityCharge, priorityTime, priorityAvailable,
    priorityFee, grandTotal, isScheduled,
    customerName, phoneNumber, setPhoneNumber,
    bellName, setBellName, driverNote, setDriverNote,
    timing, scheduledSlot, chooseTiming, confirmSchedule,
    paymentMethod, setPaymentMethod, tip, setTip,
    addressOpen, setAddressOpen, payOpen, setPayOpen, voucherOpen, setVoucherOpen,
    preorderOpen, setPreorderOpen,
    touched, placing, submitError, emailValid, phoneValid,
    placeLabel, placeHint, canPlace, placeOrder, payNow, setPayNow, verifyOpen, setVerifyOpen,
  } = useCheckout();

  const [accountOpen, setAccountOpen] = useState(false);

  // ---- pieces ------------------------------------------------------------
  const mapKey = storeInfo?.posGoogleApiKey || storeInfo?.adminGoogleApiKey || '';
  const storeCoord = storeInfo?.coordinates ? { lat: storeInfo.coordinates.latitude, lng: storeInfo.coordinates.longitude } : null;
  /*
   * Same as the confirmation screen: draw the store → customer line and let
   * Google frame it, rather than centring on the customer alone at a fixed
   * zoom — at zoom 15 the store was usually outside the picture entirely.
   * Falls back to the single customer marker when the store has no coordinates.
   */
  const customerCoord = deliveryAddress?.lat && deliveryAddress?.lng ? { lat: deliveryAddress.lat, lng: deliveryAddress.lng } : null;
  const canRoute = !!(storeCoord && customerCoord && mapKey);
  // Fallback for a store with no coordinates: the old single-marker picture.
  const mapUrl = !canRoute && deliveryAddress ? buildStaticMap(deliveryAddress.lat, deliveryAddress.lng, mapKey, 400, 150, 15) : '';

  const seg = (active: boolean) =>
    cn('inline-flex flex-1 items-center justify-center gap-2 rounded-[11px] text-sm font-bold transition', active ? 'bg-primary text-selected-text' : 'text-fg-secondary hover:bg-white/[0.06] hover:text-white');

  const timingCard = (opts: { active: boolean; onClick: () => void; title: string; sub: string; badge?: 'priority' | 'scheduled'; right: React.ReactNode }) => (
    <button
      type='button'
      onClick={opts.onClick}
      className={cn('flex items-center gap-3.5 rounded-[14px] border-2 p-4 text-left transition', opts.active ? 'border-white bg-surface-selected' : 'border-border bg-surface-1')}>
      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', opts.active ? 'border-white bg-white' : 'border-fg-faint')}>
        {opts.active && <Check className='h-3 w-3 text-black' strokeWidth={3} />}
      </span>
      <span className='min-w-0 flex-1'>
        <span className='flex items-center gap-1.5 text-[14.5px] font-extrabold'>
          {opts.title}
          {opts.badge === 'priority' && <Zap className='h-3.5 w-3.5 fill-white' />}
          {opts.badge === 'scheduled' && <Clock className='h-3.5 w-3.5 text-muted-foreground' />}
        </span>
        {opts.sub && <span className='mt-0.5 block truncate text-[12.5px] font-medium text-muted-foreground'>{opts.sub}</span>}
      </span>
      <span className='shrink-0 text-[13px] font-bold text-muted-foreground'>{opts.right}</span>
    </button>
  );

  const sectionLabel = (label: string) => <div className='mt-2 text-[12.5px] font-bold uppercase tracking-[0.04em] text-white'>{label}</div>;

  return (
    <div className='min-h-screen bg-background text-foreground'>
      <ShopHeaderMinimal onOpenAccount={() => setAccountOpen(true)} />

      {/* Hero */}
      <div className='relative mx-auto max-w-[1400px]'>
        <div className='relative h-[216px] overflow-hidden bg-[#16161a]'>
          <div
            className='absolute inset-0 bg-cover bg-center'
            style={storeInfo?.settings?.logo ? { backgroundImage: `url("${storeInfo.settings.logo}")`, filter: 'brightness(.45)' } : { background: 'linear-gradient(135deg,#26262a,#141416)' }}
          />
          <div className='absolute inset-0 bg-[rgba(18,18,20,0.62)]' />

          {/* Decorative layer from the prototype: two hairline circles and an
              outlined scooter, both barely visible over the scrim. */}
          <div className='pointer-events-none absolute -top-20 right-[-60px] h-[340px] w-[340px] rounded-full border border-white/[0.05]' aria-hidden />
          <div className='pointer-events-none absolute -top-[30px] right-[30px] h-[200px] w-[200px] rounded-full border border-white/[0.05]' aria-hidden />
          <svg
            viewBox='0 0 80 80'
            aria-hidden
            className='pointer-events-none absolute right-[46px] top-[34px] h-[108px] w-[108px] opacity-[0.16]'
            fill='none'
            stroke='#fff'
            strokeWidth={2.4}
            strokeLinecap='round'
            strokeLinejoin='round'>
            <circle cx='20' cy='64' r='8' />
            <circle cx='62' cy='64' r='8' />
            <path d='M27 64h28M20 56V40h22l8 11M42 40l4-14h10' />
          </svg>

          <button
            onClick={toMenu}
            className='absolute left-5 top-5 z-[4] inline-flex h-[42px] items-center gap-2 rounded-[21px] bg-surface-2 px-4 text-sm font-bold text-white transition active:scale-95'>
            <ChevronLeft className='h-[18px] w-[18px]' strokeWidth={2.2} />
            {t.back}
          </button>

          <div className='relative mx-auto flex h-full max-w-[1100px] flex-col justify-end px-4 pb-7 sm:px-8'>
            <div className='mb-3.5 inline-flex self-start items-center rounded-full bg-white/[0.08] px-3.5 py-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-fg-on-photo'>
              {t.completeOrder ?? 'Complete your order'}
            </div>
            <h1 className='m-0 font-display text-[clamp(30px,9vw,46px)] font-extrabold leading-none tracking-tight'>{t.checkoutTitle ?? 'Checkout'}</h1>
            <div className='mt-1.5 text-[15px] font-semibold text-muted-foreground'>
              {storeInfo?.brandName}
              {storeInfo?.address ? ` · ${storeInfo.address}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className='mx-auto max-w-[1100px] px-4 pb-20 pt-6 sm:px-8'>
        <div className='grid grid-cols-1 items-start gap-7 min-[900px]:grid-cols-[1fr_380px]'>
          {/* LEFT — form */}
          <div className='flex flex-col gap-3.5'>
            {/* Mode toggle */}
            {!isDineIn && (
              <div className='flex gap-1.5 rounded-[15px] border border-border bg-surface-1 p-[5px]'>
                {(storeInfo?.settings?.orderTypes?.delivery ?? false) && (
                  <button
                    onClick={() => (deliveryAddress ? setOrderType('delivery') : setAddressOpen(true))}
                    className={seg(isDelivery)}
                    style={{ height: 44 }}>
                    <Bike className='h-[18px] w-[18px]' />
                    {t.delivery}
                  </button>
                )}
                {(storeInfo?.settings?.orderTypes?.takeaway ?? true) && (
                  <button onClick={() => setOrderType('pickup')} className={seg(isPickup)} style={{ height: 44 }}>
                    <ShoppingBag className='h-[17px] w-[17px]' />
                    {t.pickup}
                  </button>
                )}
              </div>
            )}

            {/* Address + map */}
            {isDelivery && (
              <div className='overflow-hidden rounded-[18px] border border-border bg-surface-1'>
                {canRoute ? (
                  <RouteMap store={storeCoord!} customer={customerCoord!} apiKey={mapKey} width={640} height={224} />
                ) : (
                  <div className='h-[140px] bg-card bg-cover bg-center' style={mapUrl ? { backgroundImage: `url("${mapUrl}")` } : undefined} />
                )}
                <button onClick={() => setAddressOpen(true)} className='flex w-full items-center gap-3.5 p-4 text-left'>
                  <span className='flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-surface-3'>
                    <MapPin className='h-[19px] w-[19px]' />
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block text-[15px] font-bold'>{deliveryAddress ? `${deliveryAddress.route ?? ''} ${deliveryAddress.streetNumber ?? ''}`.trim() : (t.deliveryAddress ?? 'Delivery address')}</span>
                    <span className='mt-0.5 block truncate text-[13px] font-medium text-muted-foreground'>{deliveryAddress?.formattedAddress ?? (t.startTypeAndChooseAddress ?? '')}</span>
                  </span>
                  <ChevronRight className='h-[17px] w-[17px] shrink-0 text-muted-foreground' />
                </button>
              </div>
            )}

            {/*
              What each order type asks for: delivery gets the bell name, a
              callback number and driver notes (below); pickup just a number to
              call when it is ready; dine-in nothing at all, because the table
              already identifies the order.
            */}
            {isPickup && (
              <>
                <FieldRow icon={Phone} invalid={touched && (!phoneNumber.trim() || !phoneValid)}>
                  <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} type='tel' aria-label={t.phoneForQuestions ?? t.phoneNumber} placeholder={t.phoneForQuestions ?? t.phoneNumber} disabled={placing} className={rowInput} />
                </FieldRow>
                <FieldError message={touched && (!phoneNumber.trim() || !phoneValid) ? (phoneNumber.trim() ? t.invalidPhone : t.phoneRequired) : undefined} />
              </>
            )}

            {isDelivery && (
              <>
                <FieldRow icon={Bell} invalid={touched && !bellName.trim()}>
                  <input value={bellName} onChange={(e) => setBellName(e.target.value)} aria-label={t.bellName} placeholder={t.bellNameRequiredField ?? t.bellName} disabled={placing} className={rowInput} />
                </FieldRow>
                <FieldError message={touched && !bellName.trim() ? t.bellNameRequired : undefined} />

                <FieldRow icon={Phone} invalid={touched && (!phoneNumber.trim() || !phoneValid)}>
                  <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} type='tel' aria-label={t.callbackNumber ?? t.phoneNumber} placeholder={t.callbackNumber ?? t.phoneNumber} disabled={placing} className={rowInput} />
                </FieldRow>
                <FieldError message={touched && (!phoneNumber.trim() || !phoneValid) ? (phoneNumber.trim() ? t.invalidPhone : t.phoneRequired) : undefined} />

                <div className='flex items-start gap-3 rounded-[14px] border border-border bg-surface-1 px-4 py-3.5'>
                  <Pencil className='mt-0.5 h-5 w-5 shrink-0 text-muted-foreground' strokeWidth={1.8} />
                  <textarea
                    value={driverNote}
                    onChange={(e) => setDriverNote(e.target.value)}
                    rows={2}
                    placeholder={t.driverInstructions ?? t.enterDeliveryNotes}
                    disabled={placing}
                    className='min-w-0 flex-1 resize-none border-none bg-transparent text-sm font-medium leading-relaxed text-white'
                  />
                </div>
              </>
            )}

            {/* Delivery / pickup timing — one mutually-exclusive selector */}
            {!isDineIn && (
              <>
                {sectionLabel(isDelivery ? (t.deliverySpeedLabel ?? 'Delivery time') : (t.pickupTime ?? 'Pickup time'))}
                <div className='flex flex-col gap-2.5'>
                  {timingCard({
                    active: timing === 'standard',
                    onClick: () => chooseTiming('standard'),
                    title: t.standard ?? 'Standard',
                    sub: isDelivery ? (deliveryTime ? `${formatEtaRange(deliveryTime)} Min` : '') : (t.asapTime ?? 'ASAP'),
                    right: t.free ?? 'Free',
                  })}

                  {isDelivery &&
                    priorityAvailable &&
                    timingCard({
                      active: timing === 'priority',
                      onClick: () => chooseTiming('priority'),
                      title: t.priority ?? 'Priority',
                      badge: 'priority',
                      sub: priorityTime ? `${formatEtaRange(priorityTime)} Min` : '',
                      right: `+ ${formatPrice(priorityCharge)}`,
                    })}

                  {timingCard({
                    active: isScheduled,
                    onClick: () => setPreorderOpen(true),
                    title: t.preorder ?? 'Pre-order',
                    badge: 'scheduled',
                    sub: isScheduled && scheduledSlot ? scheduledSlot.label : (t.preorderPlanLater ?? 'Plan for later'),
                    right: <ChevronRight className='h-[17px] w-[17px]' />,
                  })}
                </div>
              </>
            )}

            {/* Payment */}
            {sectionLabel(t.paymentMethod)}
            <button
              onClick={() => setPayOpen(true)}
              className={cn('flex items-center gap-3.5 rounded-[14px] border bg-surface-1 p-4 text-left transition', touched && !paymentMethod ? 'border-destructive' : 'border-border')}>
              <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-surface-3'>
                <CreditCard className='h-5 w-5' />
              </span>
              <span className='min-w-0 flex-1'>
                <span className='block text-[15px] font-bold'>{paymentMethod ? paymentMethodLabel(paymentMethod, t) : (t.choosePaymentMethod ?? 'Choose a payment method')}</span>
                <span className='mt-0.5 block text-[12.5px] font-medium text-muted-foreground'>{isDelivery ? (t.onDelivery ?? '') : (t.onPickup ?? '')}</span>
              </span>
              <ChevronRight className='h-[17px] w-[17px] text-muted-foreground' />
            </button>

            {/* Voucher */}
            <button onClick={() => setVoucherOpen(true)} className='flex items-center gap-3.5 rounded-[14px] border border-border bg-surface-1 p-4 text-left'>
              <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-surface-3'>
                <Ticket className='h-5 w-5' />
              </span>
              <span className='min-w-0 flex-1'>
                <span className='block text-[15px] font-bold'>{appliedVoucher ? `${t.voucher} ${appliedVoucher.code}` : (t.addVoucher ?? 'Add a voucher')}</span>
                <span className='mt-0.5 block text-[12.5px] font-medium text-muted-foreground'>{appliedVoucher ? `−${formatPrice(discountAmount)}` : (t.redeemCodeAndSave ?? 'Redeem a code and save')}</span>
              </span>
              <ChevronRight className='h-[17px] w-[17px] text-muted-foreground' />
            </button>

            {/* Tip */}
            {!isDineIn && (
              <>
                {sectionLabel(`${t.tip ?? 'Tip'}`)}
                <div className='flex flex-wrap gap-2.5'>
                  {TIP_VALUES.map((v) => {
                    const active = tip === v;
                    return (
                      <button
                        key={v}
                        onClick={() => setTip(v)}
                        className={cn('h-11 flex-1 rounded-xl border-[1.5px] text-[13.5px] font-bold transition', active ? 'border-white bg-primary text-selected-text' : 'border-elevated text-white')}>
                        {v === 0 ? (t.noTip ?? 'None') : formatPrice(v)}
                      </button>
                    );
                  })}
                </div>
                {tip > 0 && (
                  <div className='flex items-center gap-2 text-[12.5px] font-semibold text-fg-secondary'>
                    <Heart className='h-3.5 w-3.5 fill-tip text-tip' />
                    {isDelivery ? t.tipThanksDriver : t.tipThanksTeam}
                  </div>
                )}
              </>
            )}
          </div>

          {/* RIGHT — sticky summary */}
          <div className='rounded-[20px] border border-border bg-surface-1 p-5 min-[900px]:sticky min-[900px]:top-[98px]'>
            <div className='mb-3.5 text-base font-extrabold'>{t.orderSummary ?? 'Order summary'}</div>

            <div className='thinbar flex max-h-[30vh] flex-col overflow-y-auto'>
              {cart.map((item) => (
                <div key={item.id} className='flex items-center gap-3 border-b border-border py-2.5'>
                  <span className='flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg bg-surface-3 px-1.5 text-[12.5px] font-extrabold'>{item.quantity}×</span>
                  <span className='min-w-0 flex-1 text-sm font-semibold'>{item.product.name}</span>
                  <span className='text-sm font-bold'>{formatPrice(item.product.currentPrice * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className='mt-3.5 flex flex-col gap-2 text-sm font-medium text-fg-secondary'>
              <div className='flex justify-between'>
                <span>{t.subtotal ?? 'Subtotal'}</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              {isDelivery && (
                <div className='flex justify-between'>
                  <span>{t.deliveryCharges}</span>
                  <span className={deliveryCharges === 0 ? 'font-bold text-success' : ''}>{deliveryCharges === 0 ? (t.free ?? 'Free') : formatPrice(deliveryCharges)}</span>
                </div>
              )}
              {priorityFee > 0 && (
                <div className='flex justify-between'>
                  <span>{t.priority}</span>
                  <span>+ {formatPrice(priorityFee)}</span>
                </div>
              )}
              {tip > 0 && (
                <div className='flex justify-between'>
                  <span>{t.tip}</span>
                  <span>{formatPrice(tip)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className='flex justify-between font-semibold text-success'>
                  <span>
                    {t.voucher} {appliedVoucher?.code ?? ''}
                  </span>
                  <span>−{formatPrice(discountAmount)}</span>
                </div>
              )}
            </div>

            <div className='mt-3.5 flex justify-between border-t border-border pt-3.5 text-lg font-extrabold'>
              <span>{t.totalIncludingVAT}</span>
              <span>{formatPrice(grandTotal)}</span>
            </div>

            <button
              onClick={placeOrder}
              disabled={placing}
              className={cn(
                'mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-[15px] text-[15px] font-extrabold transition active:scale-[0.98]',
                canPlace ? 'bg-primary text-selected-text' : 'bg-surface-3 text-fg-disabled'
              )}>
              {placing ? <Loader2 className='h-5 w-5 animate-spin' /> : placeLabel}
            </button>

            {(placeHint || submitError) && (
              <div className='mt-2.5 flex items-start gap-2 text-[12.5px] font-semibold text-error-text'>
                <AlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                <span>{submitError || placeHint}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sheets */}
      <DeliveryAddressModal
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        onSelect={(addr) => {
          setDeliveryAddress(addr);
          setAddressOpen(false);
        }}
        googleApiKey={storeInfo?.posGoogleApiKey || ''}
        onSuccess={() => setOrderType('delivery')}
      />
      <PaymentSheet open={payOpen} onClose={() => setPayOpen(false)} value={paymentMethod} onSelect={setPaymentMethod} />
      <VoucherSheet open={voucherOpen} onClose={() => setVoucherOpen(false)} disabled={placing} />
      <PreorderModal
        open={preorderOpen}
        onClose={() => setPreorderOpen(false)}
        onConfirm={confirmSchedule}
      />

      <UserDrawer open={accountOpen} onClose={() => setAccountOpen(false)} onOpenOrders={() => undefined} storeSlug={storeInfo?.slug} />


      {/*
        Stripe's own form. Opens once an online method has a reserved order and
        a client secret; the order is confirmed by the webhook, not by this
        sheet closing.
      */}
      {payNow && (
        <StripePaymentSheet
          open
          onClose={() => setPayNow(null)}
          clientSecret={payNow.clientSecret}
          stripeAccountId={payNow.stripeAccountId}
          amount={payNow.amount}
          method={payNow.method}
          returnUrl={typeof window !== 'undefined' ? `${window.location.origin}/${storeInfo?.slug ?? ''}/confirmation?order=${payNow.orderId}` : ''}
        />
      )}

      {/*
        Verification gate: its own dialog, seeded with the number already typed
        above, rather than the sign-in menu.
      */}
      <PhoneVerifyDialog open={verifyOpen} onClose={() => setVerifyOpen(false)} phone={phoneNumber} name={customerName} />

      <VoucherFlash />

      {placing && (
        <div className='fixed inset-0 z-[90] flex flex-col items-center justify-center gap-5 bg-[rgba(20,20,22,0.85)] backdrop-blur-[6px]'>
          <div className='h-13 w-13 animate-spin rounded-full border-4 border-white/15 border-t-white' style={{ height: 52, width: 52 }} />
          <div className='text-[15.5px] font-bold'>{t.placingOrder}</div>
        </div>
      )}
    </div>
  );
}

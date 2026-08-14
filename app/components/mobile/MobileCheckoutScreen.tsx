'use client';

import { AlertCircle, Bell, Check, ChevronLeft, ChevronRight, CreditCard, Gift, Heart, Loader2, MapPin, Pencil, Phone, Ticket, User, Zap } from 'lucide-react';

import MobileShell from '~/components/mobile/MobileShell';
import SmartImage from '~/lib/SmartImage';
import DeliveryAddressModal from '~/components/dialogs/DeliveryAddressModal';
import PaymentSheet, { paymentMethodLabel, paymentMethodSub } from '~/components/checkout/PaymentSheet';
import VoucherFlash from '~/components/checkout/VoucherFlash';
import MobilePreorderSheet from '~/components/mobile/MobilePreorderSheet';
import { useCheckout, TIP_VALUES } from '~/hooks/useCheckout';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { formatPrice } from '~/lib/api';
import { buildStaticMap } from '~/lib/staticMap';
import RouteMap from '~/components/checkout/RouteMap';
import StripePaymentSheet from '~/components/checkout/StripePaymentSheet';
import { cartLineExtras } from '~/lib/cartLine';
import { cn, formatEtaRange, getImageURL } from '~/lib/utils';

const rowInput = 'min-w-0 flex-1 border-none bg-transparent text-[14.5px] font-semibold text-white placeholder:text-muted-foreground';

/** Section heading, matching the design's small caps labels. */
function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mt-6 text-[11px] font-bold uppercase tracking-[0.04em] text-white', className)}>{children}</div>;
}

/** Bordered input row; the border turns red when the field is in error. */
function FieldRow({ icon: Icon, invalid, children }: { icon: typeof MapPin; invalid?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('mt-2.5 flex items-center gap-3 rounded-[14px] border-[1.5px] bg-card px-4 py-3.5', invalid ? 'border-destructive' : 'border-transparent')}>
      <Icon className='h-5 w-5 shrink-0 text-muted-foreground' strokeWidth={1.8} />
      {children}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className='mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-error-text'>
      <AlertCircle className='h-[13px] w-[13px] shrink-0' strokeWidth={2} />
      {message}
    </div>
  );
}

/**
 * Checkout as a full screen (mobile). Presentation only — every piece of state,
 * validation and the order submission itself come from `useCheckout`, shared
 * with the desktop screen.
 */
export default function MobileCheckoutScreen() {
  const c = useCheckout();
  const { back, toAccount } = useStoreNavigation();
  const { t } = c;

  const logo = c.storeInfo?.settings?.logo || c.storeInfo?.logo || '';
  const mapKey = c.storeInfo?.posGoogleApiKey || c.storeInfo?.adminGoogleApiKey || '';
  /*
   * Centred on the customer, not a route: this screen draws the design's radius
   * ring and dot at the middle of the box, so the map underneath has to have the
   * customer at its centre. Auto-framing a route would slide the address out
   * from under the dot.
   */
  const storeCoord = c.storeInfo?.coordinates ? { lat: c.storeInfo.coordinates.latitude, lng: c.storeInfo.coordinates.longitude } : null;
  const customerCoord = c.deliveryAddress?.lat && c.deliveryAddress?.lng ? { lat: c.deliveryAddress.lat, lng: c.deliveryAddress.lng } : null;
  const canRoute = !!(c.isDelivery && storeCoord && customerCoord && mapKey);
  // Fallback for a store with no coordinates: the old single-marker picture.
  const mapUrl = !canRoute && c.isDelivery && c.deliveryAddress ? buildStaticMap(c.deliveryAddress.lat, c.deliveryAddress.lng, mapKey, 440, 264) : '';
  // The design badges the address with the name it was saved under ("Home").
  const addressLabel = c.savedAddresses.find((a) => a.placeId && a.placeId === c.deliveryAddress?.placeId)?.label;

  const timingRow = (opts: { active: boolean; onClick: () => void; title: string; sub: string; right: React.ReactNode; badge?: 'priority' | 'scheduled' }) => (
    <button
      type='button'
      onClick={opts.onClick}
      className={cn('mt-2.5 flex w-full items-center gap-3.5 rounded-[14px] border-2 p-4 text-left transition', opts.active ? 'border-primary bg-surface-selected' : 'border-transparent bg-card')}>
      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', opts.active ? 'border-primary bg-primary' : 'border-fg-faint')}>
        {opts.active && <Check className='h-3 w-3 text-selected-text' strokeWidth={3} />}
      </span>
      <span className='min-w-0 flex-1'>
        <span className='flex items-center gap-1.5 text-[14.5px] font-extrabold text-white'>
          {opts.title}
          {opts.badge === 'priority' && <Zap className='h-3.5 w-3.5 fill-primary text-primary' />}
        </span>
        {opts.sub && <span className='mt-0.5 block truncate text-[12.5px] font-medium text-muted-foreground'>{opts.sub}</span>}
      </span>
      <span className='shrink-0 text-[13px] font-bold text-muted-foreground'>{opts.right}</span>
    </button>
  );

  return (
    <MobileShell className='flex flex-col'>
      <div className='relative mt-2.5 flex h-[50px] flex-none items-center justify-center px-[18px]'>
        <button onClick={back} aria-label={t.back} className='absolute left-[18px] flex h-10 w-10 items-center justify-center rounded-full bg-card text-white transition active:scale-90'>
          <ChevronLeft className='h-5 w-5' strokeWidth={2.2} />
        </button>
        {/* The design puts the store's logo here rather than a title; stores
            without one keep the heading so the screen is never unlabelled. */}
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={c.storeInfo?.brandName || ''} className='h-[42px] w-auto rounded-[9px]' />
        ) : (
          <h1 className='text-[17px] font-extrabold text-white'>{t.checkoutTitle}</h1>
        )}
      </div>

      <div className='noscroll min-h-0 flex-1 overflow-y-auto px-[18px] pb-[150px] pt-1'>
        {/* Address, above the order-type toggle as the design has it: the map
            is what tells you at a glance whether the right one is selected. */}
        {c.isDelivery && (
          <>
            <SectionLabel className='mt-0'>{t.deliveryAddress}</SectionLabel>
            <div className='mt-2.5 overflow-hidden rounded-[18px] bg-card'>
              {/*
                The route map, as on desktop: store and customer pinned, framed
                to fit the line between them. The radius ring this replaced was
                only ever a stand-in — it centred on the customer and said
                nothing about where the food comes from.
              */}
              {canRoute ? (
                <RouteMap store={storeCoord!} customer={customerCoord!} apiKey={mapKey} width={440} height={155} />
              ) : (
                <div className='relative h-[132px] bg-background'>
                  {mapUrl && <div className='absolute inset-0 bg-cover bg-center' style={{ backgroundImage: `url("${mapUrl}")` }} />}
                  <div className='absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-success shadow-[0_2px_8px_rgba(0,0,0,0.5)]' aria-hidden />
                </div>
              )}
              <button onClick={() => c.setAddressOpen(true)} className='flex w-full items-center gap-2.5 px-3.5 py-3.5 text-left'>
                <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-background'>
                  <MapPin className='h-[17px] w-[17px] text-white' strokeWidth={1.8} />
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-[13.5px] font-bold text-white'>
                    {c.deliveryAddress ? `${c.deliveryAddress.route ?? ''} ${c.deliveryAddress.streetNumber ?? ''}`.trim() || c.deliveryAddress.formattedAddress : t.deliveryAddress}
                  </span>
                  <span className='mt-px block truncate text-[12px] font-medium text-muted-foreground'>{c.deliveryAddress?.formattedAddress ?? t.startTypeAndChooseAddress}</span>
                </span>
                {addressLabel && <span className='shrink-0 rounded-lg bg-white px-2.5 py-1 text-[10.5px] font-bold text-background'>{addressLabel}</span>}
                <ChevronRight className='h-[17px] w-[17px] shrink-0 text-muted-foreground' />
              </button>
            </div>
          </>
        )}

        {/* Order type */}
        {!c.isDineIn && (
          <div className='mt-3.5 flex gap-1 rounded-[13px] bg-card p-1'>
            {(c.storeInfo?.settings?.orderTypes?.delivery ?? false) && (
              <button
                onClick={() => (c.deliveryAddress ? c.setOrderType('delivery') : c.setAddressOpen(true))}
                className={cn('h-11 flex-1 rounded-[11px] text-sm font-bold transition', c.isDelivery ? 'bg-primary text-selected-text' : 'text-fg-secondary')}>
                {t.delivery}
              </button>
            )}
            {(c.storeInfo?.settings?.orderTypes?.takeaway ?? true) && (
              <button
                onClick={() => c.setOrderType('pickup')}
                className={cn('h-11 flex-1 rounded-[11px] text-sm font-bold transition', c.isPickup ? 'bg-primary text-selected-text' : 'text-fg-secondary')}>
                {t.pickup}
              </button>
            )}
          </div>
        )}

        {/* Same rule as the desktop screen: delivery asks for bell name and a
            callback number, pickup for a number only, dine-in for nothing. */}
        {!c.isDineIn && <SectionLabel>{t.yourData}</SectionLabel>}

        {c.isPickup && (
          <>
            <FieldRow icon={Phone} invalid={c.touched && (!c.phoneNumber.trim() || !c.phoneValid)}>
              <input value={c.phoneNumber} onChange={(e) => c.setPhoneNumber(e.target.value)} type='tel' aria-label={t.phoneForQuestions ?? t.phoneNumber} placeholder={t.phoneForQuestions ?? t.phoneNumber} disabled={c.placing} className={rowInput} />
            </FieldRow>
            <FieldError message={c.touched && (!c.phoneNumber.trim() || !c.phoneValid) ? (c.phoneNumber.trim() ? t.invalidPhone : t.phoneRequired) : undefined} />
          </>
        )}

        {c.isDelivery && (
          <>
            <FieldRow icon={Bell} invalid={c.touched && !c.bellName.trim()}>
              <input value={c.bellName} onChange={(e) => c.setBellName(e.target.value)} aria-label={t.bellName} placeholder={t.bellNameRequiredField ?? t.bellName} disabled={c.placing} className={rowInput} />
            </FieldRow>
            <FieldError message={c.touched && !c.bellName.trim() ? t.bellNameRequired : undefined} />

            <FieldRow icon={Phone} invalid={c.touched && (!c.phoneNumber.trim() || !c.phoneValid)}>
              <input value={c.phoneNumber} onChange={(e) => c.setPhoneNumber(e.target.value)} type='tel' aria-label={t.callbackNumber ?? t.phoneNumber} placeholder={t.callbackNumber ?? t.phoneNumber} disabled={c.placing} className={rowInput} />
            </FieldRow>
            <FieldError message={c.touched && (!c.phoneNumber.trim() || !c.phoneValid) ? (c.phoneNumber.trim() ? t.invalidPhone : t.phoneRequired) : undefined} />

            <div className='mt-2.5 flex items-start gap-3 rounded-[14px] bg-card px-4 py-3.5'>
              <Pencil className='mt-0.5 h-5 w-5 shrink-0 text-muted-foreground' strokeWidth={1.8} />
              <textarea
                value={c.driverNote}
                onChange={(e) => c.setDriverNote(e.target.value)}
                rows={2}
                placeholder={t.driverInstructions ?? t.enterDeliveryNotes}
                disabled={c.placing}
                className='min-w-0 flex-1 resize-none border-none bg-transparent text-sm font-medium leading-relaxed text-white'
              />
            </div>
          </>
        )}

        {/* Timing */}
        {!c.isDineIn && (
          <>
            <SectionLabel>{c.isDelivery ? t.deliverySpeedLabel : t.pickupTime}</SectionLabel>
            {c.isDelivery &&
              c.priorityAvailable &&
              timingRow({
                active: c.timing === 'priority',
                onClick: () => c.chooseTiming('priority'),
                title: t.priority,
                badge: 'priority',
                sub: c.priorityTime ? `${formatEtaRange(c.priorityTime)} Min` : '',
                right: `+ ${formatPrice(c.priorityCharge)}`,
              })}
            {timingRow({
              active: c.timing === 'standard',
              onClick: () => c.chooseTiming('standard'),
              title: t.standard,
              sub: c.isDelivery ? (c.deliveryTime ? `${formatEtaRange(c.deliveryTime)} Min` : '') : t.asapTime,
              right: t.free,
            })}
            {timingRow({
              active: c.isScheduled,
              onClick: () => c.setPreorderOpen(true),
              title: t.preorder,
              badge: 'scheduled',
              sub: c.isScheduled && c.scheduledSlot ? c.scheduledSlot.label : t.preorderPlanLater,
              right: <ChevronRight className='h-[17px] w-[17px]' />,
            })}
          </>
        )}

        {/* Payment */}
        <SectionLabel>{t.paymentMethod}</SectionLabel>
        <button
          onClick={() => c.setPayOpen(true)}
          className={cn('mt-2.5 flex w-full items-center gap-3.5 rounded-[14px] border-[1.5px] bg-card p-4 text-left', c.touched && !c.paymentMethod ? 'border-destructive' : 'border-transparent')}>
          <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-background'>
            <CreditCard className='h-5 w-5' />
          </span>
          <span className='min-w-0 flex-1'>
            <span className='block text-[15px] font-bold text-white'>{c.paymentMethod ? paymentMethodLabel(c.paymentMethod, t) : (t.choosePaymentMethod ?? 'Choose a payment method')}</span>
            {/* Until a method is chosen the design lists what is on offer, not where you pay. */}
            <span className='mt-0.5 block text-[12.5px] font-medium text-muted-foreground'>
              {c.paymentMethod ? paymentMethodSub(c.paymentMethod, t, c.isDelivery) : (t.paymentMethodsSummary ?? '')}
            </span>
          </span>
          <ChevronRight className='h-[17px] w-[17px] text-muted-foreground' />
        </button>

        {/* Tip — before the voucher, as the design orders them. */}
        {!c.isDineIn && (
          <>
            <div className='mt-6 flex items-baseline justify-between'>
              <div className='text-[11px] font-bold uppercase tracking-[0.04em] text-white'>{t.tip}</div>
              <div className='text-[11.5px] font-semibold text-muted-foreground'>{c.isDelivery ? t.tipToDriver : t.tipToTeam}</div>
            </div>
            <div className='mt-2.5 flex gap-2'>
              {TIP_VALUES.map((v) => (
                <button
                  key={v}
                  onClick={() => c.setTip(v)}
                  className={cn('h-11 flex-1 rounded-xl border-[1.5px] text-[13.5px] font-bold transition', c.tip === v ? 'border-primary bg-primary text-selected-text' : 'border-elevated text-white')}>
                  {v === 0 ? t.noTip : formatPrice(v)}
                </button>
              ))}
            </div>
            {c.tip > 0 && (
              <div className='mt-2 flex items-center gap-2 text-[12.5px] font-semibold text-fg-secondary'>
                <Heart className='h-3.5 w-3.5 fill-tip text-tip' />
                {c.isDelivery ? t.tipThanksDriver : t.tipThanksTeam}
              </div>
            )}
          </>
        )}

        {/* Voucher */}
        <SectionLabel>{t.vouchers}</SectionLabel>
        {/*
          A screen, not a sheet: the design gives vouchers their own
          `data-screen-label="Gutscheine"` on mobile and returns here after.
        */}
        <button onClick={() => toAccount('vouchers')} className='mt-2.5 flex w-full items-center gap-3.5 rounded-[14px] bg-card p-4 text-left'>
          {/* No tile behind this one, unlike the payment row — the design leaves it bare. */}
          <span className='flex h-10 w-10 shrink-0 items-center justify-center'>
            <Gift className='h-6 w-6' strokeWidth={1.7} />
          </span>
          <span className='min-w-0 flex-1'>
            <span className='block text-[15px] font-bold text-white'>{c.appliedVoucher ? `${t.voucher} ${c.appliedVoucher.code}` : (t.redeemCode ?? t.addVoucher)}</span>
            <span className='mt-0.5 block text-[12.5px] font-medium text-muted-foreground'>
              {c.appliedVoucher ? (c.appliedVoucher.description ?? `−${formatPrice(c.discountAmount)}`) : (t.enterPromoCode ?? t.redeemCodeAndSave)}
            </span>
          </span>
          <ChevronRight className='h-[17px] w-[17px] text-muted-foreground' />
        </button>

        {/* Summary — a plain list on the page, not a card: the design shows
            each line's picture and its chosen options. */}
        <SectionLabel>{t.orderSummary}</SectionLabel>
        <div className='mt-3 flex flex-col gap-3.5'>
          {c.cart.map((item) => {
            const extras = cartLineExtras(item);
            const img = item.product.images?.length ? getImageURL(item.product.images[0]) : '';
            return (
              <div key={item.id} className='flex items-center gap-3'>
                <div className='w-6 shrink-0 text-[13px] font-extrabold text-white'>{item.quantity}×</div>
                {img ? (
                  <SmartImage src={img} alt={item.product.name} sizes='40px' className='object-cover' wrapperClassName='h-10 w-10 shrink-0 rounded-[10px]' />
                ) : (
                  <div className='h-10 w-10 shrink-0 rounded-[10px] bg-card' />
                )}
                <div className='min-w-0 flex-1 text-[12.5px] font-semibold leading-[1.3] text-fg-strong'>
                  {item.product.name}
                  {extras && <span className='mt-0.5 block truncate text-[11px] font-medium text-muted-foreground'>{extras}</span>}
                </div>
                <div className='shrink-0 text-[12.5px] font-bold text-white'>{formatPrice(item.product.currentPrice * item.quantity)}</div>
              </div>
            );
          })}
        </div>

        <div className='mt-[18px] flex flex-col gap-[11px] border-t border-white/[0.08] pt-4 text-sm font-medium text-fg-secondary'>
          <div className='flex justify-between'>
            <span>{t.subtotal}</span>
            <span>{formatPrice(c.totalPrice)}</span>
          </div>
          {c.isDelivery && (
            <div className='flex justify-between'>
              <span>{t.deliveryCharges}</span>
              <span className={c.deliveryCharges === 0 ? 'font-bold text-success' : ''}>{c.deliveryCharges === 0 ? t.free : formatPrice(c.deliveryCharges)}</span>
            </div>
          )}
          {c.priorityFee > 0 && (
            <div className='flex justify-between'>
              <span>{t.priority}</span>
              <span>+ {formatPrice(c.priorityFee)}</span>
            </div>
          )}
          {c.discountAmount > 0 && (
            <div className='flex justify-between font-semibold text-success'>
              <span className='inline-flex items-center gap-1.5'>
                <Ticket className='h-3.5 w-3.5' />
                {t.voucher} {c.appliedVoucher?.code ?? ''}
              </span>
              <span>−{formatPrice(c.discountAmount)}</span>
            </div>
          )}
          {c.tip > 0 && (
            <div className='flex justify-between'>
              <span>{t.tip}</span>
              <span>{formatPrice(c.tip)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Place order */}
      <div
        className='absolute inset-x-0 bottom-0 z-[6] border-t border-white/[0.08] bg-background px-[18px] pt-3 shadow-[0_-10px_24px_-12px_rgba(0,0,0,0.8)]'
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}>
        {(c.placeHint || c.submitError) && (
          <div className='mb-2 flex items-start gap-2 text-[12.5px] font-semibold text-error-text'>
            <AlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
            <span>{c.submitError || c.placeHint}</span>
          </div>
        )}
        <button
          onClick={c.placeOrder}
          disabled={c.placing}
          className={cn('flex h-14 w-full items-center gap-3 rounded-2xl px-[18px] text-left transition active:scale-[0.99]', c.canPlace ? 'bg-primary text-selected-text' : 'bg-surface-3 text-fg-disabled')}>
          {c.placing ? (
            <Loader2 className='mx-auto h-5 w-5 animate-spin' />
          ) : (
            <>
              <span className='min-w-0 flex-1 truncate text-[15px] font-extrabold tracking-[-0.01em]'>{c.placeLabel}</span>
              <span className='shrink-0 whitespace-nowrap text-base font-extrabold'>{formatPrice(c.grandTotal)}</span>
            </>
          )}
        </button>
      </div>

      {/* Sheets */}
      <DeliveryAddressModal
        open={c.addressOpen}
        onClose={() => c.setAddressOpen(false)}
        onSelect={(addr) => {
          c.setDeliveryAddress(addr);
          c.setAddressOpen(false);
        }}
        googleApiKey={c.storeInfo?.posGoogleApiKey || ''}
        onSuccess={() => c.setOrderType('delivery')}
      />
      <PaymentSheet open={c.payOpen} onClose={() => c.setPayOpen(false)} value={c.paymentMethod} onSelect={c.setPaymentMethod} />

      {/*
        Stripe's own form. Opens once an online method has a reserved order and
        a client secret; the order is confirmed by the webhook, not by this
        sheet closing.
      */}
      {c.payNow && (
        <StripePaymentSheet
          open
          onClose={() => c.setPayNow(null)}
          clientSecret={c.payNow.clientSecret}
          stripeAccountId={c.payNow.stripeAccountId}
          amount={c.payNow.amount}
          returnUrl={typeof window !== 'undefined' ? `${window.location.origin}/${c.storeInfo?.slug ?? ''}/confirmation?order=${c.payNow.orderId}` : ''}
        />
      )}

      <MobilePreorderSheet open={c.preorderOpen} onClose={() => c.setPreorderOpen(false)} onConfirm={c.confirmSchedule} onStandard={() => c.chooseTiming('standard')} />
      <VoucherFlash />

      {c.placing && (
        <div className='absolute inset-0 z-[90] flex flex-col items-center justify-center gap-5 bg-[rgba(12,15,28,0.85)] backdrop-blur-[6px]'>
          <Loader2 className='h-12 w-12 animate-spin' />
          <div className='text-[15.5px] font-bold'>{t.placingOrder}</div>
        </div>
      )}
    </MobileShell>
  );
}

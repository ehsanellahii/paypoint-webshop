/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Bike, ShoppingBag, MapPin, Bell, Zap, Check, Clock, Pencil, Ticket, Heart, Loader2, AlertCircle, CreditCard, MessageSquare } from 'lucide-react';
import moment from 'moment-timezone';

import { useCart } from '~/contexts/cart-context';
import { useAddress } from '~/contexts/address-context';
import { useStore } from '~/contexts/store-context';
import { useUser } from '~/contexts/user-context';
import { useLanguage } from '~/contexts/language-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';

import { API_BASE_URL, X_API_KEY, formatPrice } from '~/lib/api';
import { cn, formatCartItemsForOrder, getImageURL, getPostalRateInfo, storage } from '~/lib/utils';
import { buildStaticMap } from '~/lib/staticMap';
import { savePlacedOrder } from '~/lib/lastOrder';
import { clearPreorderSlot, getPreorderSlot, savePreorderSlot } from '~/lib/preorderSlot';

import FormField from '~/components/FormField';
import DeliveryAddressModal from '~/components/dialogs/DeliveryAddressModal';
import PreorderModal, { type PreorderSlot } from '~/components/menu/PreorderModal';
import PaymentSheet, { type PaymentMethod } from '~/components/checkout/PaymentSheet';
import VoucherSheet from '~/components/checkout/VoucherSheet';

const TZ = 'Europe/Berlin';
const STORAGE_KEY = 'persisted';
const TIP_VALUES = [0, 1, 2, 3];

export default function CheckoutScreen() {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const { setUser } = useUser();
  const { cart, totalPrice, totalItems, discountAmount, appliedVoucher, clearCart } = useCart();
  const { orderType, setOrderType, deliveryAddress, setDeliveryAddress } = useAddress();
  const { slug, toMenu, toConfirmation } = useStoreNavigation();

  const isDineIn = !!storeInfo?.tableInfo?.token;
  const isDelivery = !isDineIn && orderType === 'delivery';
  const isPickup = !isDineIn && orderType === 'pickup';

  const rate = getPostalRateInfo(Number(deliveryAddress?.postalCode || 0), storeInfo?.postalRates || []);
  const deliveryCharges = isDelivery ? (rate.deliveryCharges ?? 0) : 0;
  const deliveryTime = rate.deliveryTime || 0;
  const minimumOrderAmount = rate.minimumOrderAmount || 0;
  const priorityCharge = rate.priorityDeliveryCharges ?? 0;
  const priorityTime = rate.priorityDeliveryTime ?? 0;
  const priorityAvailable = isDelivery && priorityCharge > 0;

  // ---- form state -------------------------------------------------------
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bellName, setBellName] = useState('');
  const [driverNote, setDriverNote] = useState('');
  const [orderMessage, setOrderMessage] = useState('');
  // Single mutually-exclusive timing choice, mirroring the prototype:
  // standard | priority (delivery only, if the store defines a charge) | scheduled.
  const [timing, setTiming] = useState<'standard' | 'priority' | 'scheduled'>('standard');
  const [scheduledSlot, setScheduledSlot] = useState<PreorderSlot | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [tip, setTip] = useState(0);

  const [addressOpen, setAddressOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [preorderOpen, setPreorderOpen] = useState(false);

  const [touched, setTouched] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Prefill from the last order, and pick up a pre-order slot chosen on the menu.
  useEffect(() => {
    const saved = storage.get<{ customerName?: string; email?: string; phoneNumber?: string }>(STORAGE_KEY, {});
    if (saved.customerName) setCustomerName(saved.customerName);
    if (saved.email) setEmail(saved.email);
    if (saved.phoneNumber) setPhoneNumber(saved.phoneNumber);

    const menuSlot = getPreorderSlot(slug);
    if (menuSlot) {
      setScheduledSlot(menuSlot);
      setTiming('scheduled');
    }
  }, [slug]);

  // An empty cart has nothing to check out.
  useEffect(() => {
    if (cart.length === 0 && !placing) toMenu();
  }, [cart.length, placing, toMenu]);

  const isScheduled = timing === 'scheduled' && !!scheduledSlot;
  const priorityFee = priorityAvailable && timing === 'priority' ? priorityCharge : 0;
  const subtotalAfterDiscount = totalPrice - discountAmount;
  const grandTotal = subtotalAfterDiscount + deliveryCharges + priorityFee + tip;

  // ---- validation (inline, no alerts) ------------------------------------
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = /^[\d\s+\-()]{6,}$/.test(phoneNumber);

  const missing: string[] = [];
  if (!customerName.trim()) missing.push(t.name);
  if (!email.trim() || !emailValid) missing.push(t.email);
  if (!phoneNumber.trim() || !phoneValid) missing.push(t.phoneNumber);
  if (isDelivery && !deliveryAddress) missing.push(t.deliveryAddress);
  if (isDelivery && !bellName.trim()) missing.push(t.bellName ?? 'Bell name');
  if (!paymentMethod) missing.push(t.paymentMethod);

  const belowMinimum = isDelivery && minimumOrderAmount > 0 && totalPrice < minimumOrderAmount;
  const deliveryUnavailable = isDelivery && !!deliveryAddress && !rate.isAvailable;
  const canPlace = missing.length === 0 && !belowMinimum && !deliveryUnavailable && cart.length > 0;

  const placeLabel = (() => {
    if (deliveryUnavailable) return t.weAreNotAvailableInYourArea;
    if (belowMinimum) return `${t.minimumOrderAmountIs} ${formatPrice(minimumOrderAmount)}`;
    if (missing.length === 1) return `${missing[0]} ${t.required ?? ''}`.trim();
    if (missing.length > 1) return `${t.stillMissing ?? 'Still missing'}: ${missing.length}`;
    return `${t.placeOrder ?? 'Place order'} · ${formatPrice(grandTotal)}`;
  })();

  const placeHint = (() => {
    if (deliveryUnavailable) return t.weAreNotAvailableInYourArea;
    if (belowMinimum) return `${t.minimumOrderAmountIs} ${formatPrice(minimumOrderAmount)}`;
    if (touched && missing.length) return `${t.pleaseComplete ?? 'Please complete'}: ${missing.join(', ')}`;
    return '';
  })();

  // ---- submit ------------------------------------------------------------
  const loginCustomer = async () => {
    const payload: any = {
      email: email.trim(),
      phoneNumber: phoneNumber.trim(),
      name: customerName.trim(),
      signInWith: 'phone',
      signInSource: 'web',
    };
    if (isDelivery && deliveryAddress) {
      payload.address = deliveryAddress.formattedAddress;
      payload.coordinates = { latitude: deliveryAddress.lat, longitude: deliveryAddress.lng };
      payload.postalCode = deliveryAddress.postalCode;
      payload.street = deliveryAddress.streetNumber;
      payload.houseNumber = deliveryAddress.route;
      payload.city = deliveryAddress.locality;
      payload.country = deliveryAddress.country;
    }

    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': X_API_KEY },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || t.loginFailed || 'Login failed');
    if (json?.data) setUser(json.data);
    return json?.data;
  };

  const placeOrder = async () => {
    setTouched(true);
    setSubmitError(null);
    if (!canPlace || placing) return;

    setPlacing(true);
    try {
      const user = await loginCustomer();

      const orderData: any = {
        adminId: storeInfo?.adminId || '',
        storeId: storeInfo?.storeId || '',
        orderType: isDineIn ? 'dineIn' : orderType,
        paymentMethod: paymentMethod === 'card' ? 'ec-card reader' : 'cash',
        customerDetails: { name: customerName.trim(), email: email.trim(), phoneNumber: phoneNumber.trim() },
        items: formatCartItemsForOrder(cart),
        totalOrderPrice: grandTotal,
        totalItems,
        totalItemsPrice: totalPrice,
        deliveryCharges,
        deliveryTime,
        tip,
        // When scheduled, the server derives deliveryType from deliverySchedule;
        // otherwise standard vs priority.
        deliverySpeed: isDelivery ? (timing === 'priority' ? 'priority' : 'standard') : undefined,
        priorityFee,
        instructions: orderMessage.trim(),
        orderSource: 'web',
        platform: 'WebShop',
        isDiscounted: discountAmount > 0,
        discountAmount,
        isVoucherApplied: appliedVoucher != null,
      };

      if (orderData.orderType === 'delivery') {
        orderData.addressDetails = {
          street: deliveryAddress?.streetNumber || '',
          houseNumber: deliveryAddress?.route || '',
          postalCode: deliveryAddress?.postalCode || '',
          city: deliveryAddress?.locality || '',
          address: deliveryAddress?.formattedAddress || '',
          coordinates: { latitude: deliveryAddress?.lat || 0, longitude: deliveryAddress?.lng || 0 },
          deliveryNotes: driverNote,
          bellName: bellName.trim(),
        };
      }

      if (isDineIn) {
        orderData.bookedTable = {
          area: storeInfo?.tableInfo?.areaName || '',
          table: storeInfo?.tableInfo?.tableNumber || 0,
          tableToken: storeInfo?.tableInfo?.token || '',
        };
      }
      if (user?._id) orderData.customerId = user._id;
      if (appliedVoucher) {
        orderData.vouchers = [
          {
            id: appliedVoucher.voucherId,
            voucherId: appliedVoucher.voucherId,
            title: appliedVoucher.title,
            code: appliedVoucher.code,
            discountType: appliedVoucher.discountType,
            discountValue: appliedVoucher.discountValue,
          },
        ];
      }

      // Scheduled / pre-order window
      let etaLabel: string | undefined;
      const slot = isScheduled && scheduledSlot ? { dayOffset: scheduledSlot.dayOffset, time: scheduledSlot.time } : null;

      if (slot) {
        const day = moment.tz(TZ).add(slot.dayOffset, 'days').format('YYYY-MM-DD');
        let start = moment.tz(`${day} ${slot.time}`, 'YYYY-MM-DD HH:mm', TZ);
        if (slot.dayOffset === 0) {
          const now = moment.tz(TZ);
          if (start.isBefore(now.clone().subtract(6, 'hours'))) start = start.add(1, 'day');
        }
        const end = start.clone().add(isDelivery ? deliveryTime : 15, 'minutes');
        orderData.deliverySchedule = {
          timezone: TZ,
          scheduledDate: start.toDate(),
          timeSlot: { startTime: start.format('HH:mm'), endTime: end.format('HH:mm') },
        };
        etaLabel = `${start.format('HH:mm')} – ${end.format('HH:mm')}`;
      }

      const res = await fetch(`${API_BASE_URL}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Failed to submit order');
      }
      const result = await res.json();
      const orderRef = result?.data?.collectionCode || result?.data?.id || '';

      storage.set(STORAGE_KEY, { customerName: customerName.trim(), email: email.trim(), phoneNumber: phoneNumber.trim() });

      savePlacedOrder(slug, {
        orderRef,
        isDelivery,
        paymentName: paymentMethod === 'card' ? t.posCardPayment : t.cash,
        total: grandTotal,
        etaLo: isDelivery ? (timing === 'priority' ? Math.max(1, priorityTime) : Math.max(1, deliveryTime)) : 5,
        etaHi: isDelivery ? (timing === 'priority' ? Math.max(1, priorityTime) + 10 : Math.max(1, deliveryTime) + 10) : 15,
        etaLabel,
        addressLine: isDelivery ? (deliveryAddress?.formattedAddress ?? '') : `${storeInfo?.brandName ?? ''} · ${storeInfo?.address ?? ''}`,
        items: cart.map((i) => ({
          name: i.product.name,
          qty: i.quantity,
          lineTotal: i.product.currentPrice * i.quantity,
          image: i.product.images?.length ? getImageURL(i.product.images[0]) : '',
        })),
        placedAt: Date.now(),
      });

      clearCart();
      clearPreorderSlot(slug);
      toConfirmation(orderRef);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'An unknown error occurred while submitting your order.');
      setPlacing(false);
    }
  };

  // ---- pieces ------------------------------------------------------------
  const mapUrl = deliveryAddress ? buildStaticMap(deliveryAddress.lat, deliveryAddress.lng, storeInfo?.posGoogleApiKey || '', 400, 150, 15) : '';

  const seg = (active: boolean) =>
    cn('inline-flex flex-1 items-center justify-center gap-2 rounded-[11px] text-sm font-bold transition', active ? 'bg-primary text-selected-text' : 'text-muted-foreground hover:bg-white/[0.06] hover:text-white');

  const timingCard = (opts: { active: boolean; onClick: () => void; title: string; sub: string; badge?: 'priority' | 'scheduled'; right: React.ReactNode }) => (
    <button
      type='button'
      onClick={opts.onClick}
      className={cn('flex items-center gap-3.5 rounded-[14px] border-2 p-4 text-left transition', opts.active ? 'border-white bg-surface-3' : 'border-border bg-surface-1')}>
      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', opts.active ? 'border-white bg-white' : 'border-[#55575c]')}>
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
      {/* Hero */}
      <div className='relative mx-auto max-w-[1400px]'>
        <div className='relative h-[216px] overflow-hidden bg-[#16161a]'>
          <div
            className='absolute inset-0 bg-cover bg-center'
            style={storeInfo?.settings?.logo ? { backgroundImage: `url(${storeInfo.settings.logo})`, filter: 'brightness(.45)' } : { background: 'linear-gradient(135deg,#26262a,#141416)' }}
          />
          <div className='absolute inset-0 bg-[rgba(18,18,20,0.62)]' />

          <button
            onClick={toMenu}
            className='absolute left-5 top-5 z-[4] inline-flex h-[42px] items-center gap-2 rounded-[21px] bg-surface-2 px-4 text-sm font-bold text-white transition active:scale-95'>
            <ChevronLeft className='h-[18px] w-[18px]' strokeWidth={2.2} />
            {t.back}
          </button>

          <div className='relative mx-auto flex h-full max-w-[1100px] flex-col justify-end px-4 pb-7 md:px-8'>
            <div className='mb-3.5 inline-flex self-start items-center rounded-full bg-white/[0.08] px-3.5 py-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-[#d6d8dc]'>
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
      <div className='mx-auto max-w-[1100px] px-4 pb-24 pt-6 md:px-8'>
        <div className='grid grid-cols-1 items-start gap-7 lg:grid-cols-[1fr_380px]'>
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
                <div className='h-[140px] bg-card bg-cover bg-center' style={mapUrl ? { backgroundImage: `url(${mapUrl})` } : undefined} />
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

            {/* Your details */}
            <div className='rounded-[16px] border border-border bg-surface-1 p-5'>
              <h2 className='mb-4 text-lg font-extrabold'>{t.yourData}</h2>
              <div className='space-y-4'>
                <FormField id='customerName' label={t.name} value={customerName} onChange={setCustomerName} required error={touched && !customerName.trim() ? t.nameRequired : undefined} disabled={placing} />
                <FormField
                  id='email'
                  label={t.email}
                  type='email'
                  value={email}
                  onChange={setEmail}
                  required
                  error={touched && (!email.trim() || !emailValid) ? (email.trim() ? t.invalidEmail : t.emailRequired) : undefined}
                  disabled={placing}
                />
                <FormField
                  id='phoneNumber'
                  label={t.phoneNumber}
                  type='tel'
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  required
                  error={touched && (!phoneNumber.trim() || !phoneValid) ? (phoneNumber.trim() ? t.invalidPhone : t.phoneRequired) : undefined}
                  disabled={placing}
                />
                {isDelivery && (
                  <FormField
                    id='bellName'
                    label={t.bellName ?? 'Bell name'}
                    value={bellName}
                    onChange={setBellName}
                    required
                    error={touched && !bellName.trim() ? (t.bellNameRequired ?? '') : undefined}
                    disabled={placing}
                  />
                )}
              </div>
            </div>

            {/* Driver note */}
            {isDelivery && (
              <div className='flex items-start gap-3 rounded-[14px] border border-border bg-surface-1 px-4 py-3.5'>
                <Pencil className='mt-0.5 h-5 w-5 shrink-0 text-muted-foreground' />
                <textarea
                  value={driverNote}
                  onChange={(e) => setDriverNote(e.target.value)}
                  rows={2}
                  placeholder={t.enterDeliveryNotes}
                  disabled={placing}
                  className='min-w-0 flex-1 resize-none border-none bg-transparent text-sm font-medium leading-relaxed text-white outline-none'
                />
              </div>
            )}

            {/* Message for the restaurant */}
            <div className='flex items-start gap-3 rounded-[14px] border border-border bg-surface-1 px-4 py-3.5'>
              <MessageSquare className='mt-0.5 h-5 w-5 shrink-0 text-muted-foreground' />
              <textarea
                value={orderMessage}
                onChange={(e) => setOrderMessage(e.target.value)}
                rows={2}
                placeholder={t.messageForRestaurantPlaceholder}
                disabled={placing}
                className='min-w-0 flex-1 resize-none border-none bg-transparent text-sm font-medium leading-relaxed text-white outline-none'
              />
            </div>

            {/* Delivery / pickup timing — one mutually-exclusive selector */}
            {!isDineIn && (
              <>
                {sectionLabel(isDelivery ? (t.deliverySpeedLabel ?? 'Delivery time') : (t.pickupTime ?? 'Pickup time'))}
                <div className='flex flex-col gap-2.5'>
                  {timingCard({
                    active: timing === 'standard',
                    onClick: () => {
                      setTiming('standard');
                      setScheduledSlot(null);
                      savePreorderSlot(slug, null);
                    },
                    title: t.standard ?? 'Standard',
                    sub: isDelivery ? (deliveryTime ? `${deliveryTime} Min` : '') : (t.asapTime ?? 'ASAP'),
                    right: t.free ?? 'Free',
                  })}

                  {isDelivery &&
                    priorityAvailable &&
                    timingCard({
                      active: timing === 'priority',
                      onClick: () => {
                        setTiming('priority');
                        setScheduledSlot(null);
                        savePreorderSlot(slug, null);
                      },
                      title: t.priority ?? 'Priority',
                      badge: 'priority',
                      sub: priorityTime ? `${priorityTime} Min` : '',
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
              className={cn('flex items-center gap-3.5 rounded-[14px] border bg-surface-1 p-4 text-left transition', touched && !paymentMethod ? 'border-brand-red' : 'border-border')}>
              <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-surface-3'>
                <CreditCard className='h-5 w-5' />
              </span>
              <span className='min-w-0 flex-1'>
                <span className='block text-[15px] font-bold'>{paymentMethod ? (paymentMethod === 'card' ? t.posCardPayment : t.cash) : (t.choosePaymentMethod ?? 'Choose a payment method')}</span>
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
                        className={cn('h-11 flex-1 rounded-xl border text-[13.5px] font-bold transition', active ? 'border-white bg-primary text-selected-text' : 'border-border-strong text-white hover:bg-surface-1')}>
                        {v === 0 ? (t.noTip ?? 'None') : formatPrice(v)}
                      </button>
                    );
                  })}
                </div>
                {tip > 0 && (
                  <div className='flex items-center gap-2 text-[12.5px] font-semibold text-[#b9bbbf]'>
                    <Heart className='h-3.5 w-3.5 fill-[#e8859a] text-[#e8859a]' />
                    {isDelivery ? t.tipThanksDriver : t.tipThanksTeam}
                  </div>
                )}
              </>
            )}
          </div>

          {/* RIGHT — sticky summary */}
          <div className='rounded-[20px] border border-border bg-surface-1 p-5 lg:sticky lg:top-6'>
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

            <div className='mt-3.5 flex flex-col gap-2 text-sm font-medium text-[#b9bbbf]'>
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
                canPlace ? 'bg-primary text-selected-text' : 'bg-surface-3 text-[#9a9da3]'
              )}>
              {placing ? <Loader2 className='h-5 w-5 animate-spin' /> : placeLabel}
            </button>

            {(placeHint || submitError) && (
              <div className='mt-2.5 flex items-start gap-2 text-[12.5px] font-semibold text-[#ff8a7e]'>
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
        onConfirm={(s) => {
          setScheduledSlot(s);
          setTiming('scheduled');
          savePreorderSlot(slug, s);
        }}
      />

      {placing && (
        <div className='fixed inset-0 z-[90] flex flex-col items-center justify-center gap-5 bg-[rgba(20,20,22,0.85)] backdrop-blur-[6px]'>
          <div className='h-13 w-13 animate-spin rounded-full border-4 border-white/15 border-t-white' style={{ height: 52, width: 52 }} />
          <div className='text-[15.5px] font-bold'>{t.placingOrder}</div>
        </div>
      )}
    </div>
  );
}

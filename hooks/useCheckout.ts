'use client';

import { useEffect, useRef, useState } from 'react';
import moment from 'moment-timezone';

import { useCart } from '~/contexts/cart-context';
import { useAddress } from '~/contexts/address-context';
import { useStore } from '~/contexts/store-context';
import { useUser } from '~/contexts/user-context';
import { useLanguage } from '~/contexts/language-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';

import { API_BASE_URL, apiHeaders, createPaymentIntent, createUnconfirmedOrder, formatPrice } from '~/lib/api';
import { formatCartItemsForOrder, getImageURL, getPostalRateInfo, storage } from '~/lib/utils';
import type { PreorderSlot } from '~/components/menu/PreorderModal';
import { ORDER_PAYMENT_METHOD, type PaymentMethod } from '~/components/checkout/PaymentSheet';
import { savePlacedOrder } from '~/lib/lastOrder';
import { clearPreorderSlot, getPreorderSlot, savePreorderSlot } from '~/lib/preorderSlot';


const TZ = 'Europe/Berlin';
const STORAGE_KEY = 'persisted';
export const TIP_VALUES = [0, 1, 2, 3];

/**
 * Everything the checkout does that is not layout: form state, validation,
 * pricing and order submission.
 *
 * Mobile and desktop are different screens but the same transaction — the order
 * payload, the pre-order slot maths and the guest-login call must not exist
 * twice, or the two will drift and only one will be tested.
 */
/*
 * Checkout collects no name, but `customer.name` is `required: true` on the
 * server and its login service throws without one — so something has to be
 * sent. Only used when we genuinely have nothing better.
 */
const CUSTOMER_NAME_PLACEHOLDER = '********';

/** Any run of asterisks: ours, or the shorter one the HubRise import uses. */
const isPlaceholderName = (name?: string | null) =>
  !name || /^\*+$/.test(name.trim());

/**
 * The name to put on an order.
 *
 * The customer has verified before this runs, so a registered one already has
 * their real name on the account — sending the placeholder anyway threw that
 * away and put asterisks on the receipt, the POS ticket and the admin customer
 * list. The placeholder is now the fallback it was meant to be.
 */
const resolveCustomerName = (accountName?: string | null) =>
  isPlaceholderName(accountName)
    ? CUSTOMER_NAME_PLACEHOLDER
    : (accountName as string).trim();

/**
 * Methods settled online, before the order is placed. Cash and the EC reader
 * are collected in person, so those orders go straight through as before.
 */
const ONLINE_METHODS = new Set<PaymentMethod>(['cardWallets', 'applePay', 'googlePay', 'paypal', 'klarna']);

export function useCheckout() {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const { user, setUser } = useUser();
  const { cart, totalPrice, totalItems, discountAmount, appliedVoucher, clearCart, orderMessage } = useCart();
  const { orderType, setOrderType, deliveryAddress, setDeliveryAddress, savedAddresses } = useAddress();
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

  /** Set once the prefill below has run, so the save effect cannot beat it. */
  const restored = useRef(false);

  const [touched, setTouched] = useState(false);
  const [placing, setPlacing] = useState(false);
  /** Set once Stripe has something to charge; drives the payment sheet. */
  const [payNow, setPayNow] = useState<{ clientSecret: string; stripeAccountId: string; amount: number; orderId: string; method: PaymentMethod } | null>(null);
  /*
   * Opens the sign-in flow when an unverified customer tries to order.
   *
   * Verification is its own errand: the flow closes when the customer is
   * verified and leaves them back on the filled-in checkout to press the button
   * themselves. An order that submits itself after a dialog closes is a
   * surprising thing for a payment screen to do.
   */
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Prefill from the last order, and pick up a pre-order slot chosen on the menu.
  useEffect(() => {
    const saved = storage.get<{ customerName?: string; email?: string; phoneNumber?: string }>(STORAGE_KEY, {});
    if (saved.customerName) setCustomerName(saved.customerName);
    if (saved.email) setEmail(saved.email);
    if (saved.phoneNumber) setPhoneNumber(saved.phoneNumber);
    restored.current = true;

    const menuSlot = getPreorderSlot(slug);
    if (menuSlot) {
      setScheduledSlot(menuSlot);
      setTiming('scheduled');
    }
  }, [slug]);

  /*
   * Keep the contact details as they are typed.
   *
   * They used to be written only after an order went through, so anything that
   * took the customer away from a half-filled form — verifying their number, a
   * reload, closing the tab — lost the lot. Written on every change instead,
   * guarded so the first render cannot blank the store before the prefill above
   * has restored it.
   */
  useEffect(() => {
    if (!restored.current) return;
    if (!customerName.trim() && !email.trim() && !phoneNumber.trim()) return;
    storage.set(STORAGE_KEY, { customerName: customerName.trim(), email: email.trim(), phoneNumber: phoneNumber.trim() });
  }, [customerName, email, phoneNumber]);

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
  /*
   * What each order type has to ask for:
   *   delivery — bell name and a callback number, nothing else;
   *   pickup   — a number to call when it is ready;
   *   dine-in  — nothing. The table identifies the order.
   */
  if (!isDineIn && (!phoneNumber.trim() || !phoneValid)) missing.push(isDelivery ? (t.callbackNumberShort ?? t.phoneNumber) : t.phoneNumber);
  if (isDelivery && !deliveryAddress) missing.push(t.deliveryAddress);
  if (isDelivery && !bellName.trim()) missing.push(t.bellName ?? 'Bell name');
  if (!paymentMethod) missing.push(t.paymentType ?? t.paymentMethod);

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
    /*
     * Not gated on `touched`: the design shows what is still outstanding while
     * the form is being filled in, so the button's "2 more needed" always has
     * something naming them next to it.
     */
    if (missing.length) return `${t.pleaseComplete ?? 'Please complete'}: ${missing.join(', ')}`;
    return '';
  })();

  // ---- submit ------------------------------------------------------------
  const loginCustomer = async () => {
    /*
     * Dine-in collects nothing, and the server's login refuses a customer with
     * no phone number ("Phone number is required"). A table order does not need
     * one — `customerId` is optional on the order — so skip it entirely rather
     * than inventing an identity.
     */
    if (isDineIn) return null;

    /*
     * Identity for the lookup, which is not the same thing as the contact
     * number on the order.
     *
     * The OTP flow registers the customer under the E.164 number it sent the
     * code to (`+4915112345678`). This field is free text and people type the
     * national form (`015112345678`). The server matches on the string after
     * stripping only spaces and dashes, so sending the typed value found no
     * match, created a *second* customer record, and the response — from
     * `/login`, which never raises `isVerified` — overwrote the verified
     * session with an unverified one. The next order then asked for the OTP
     * again, forever.
     *
     * So once the account is verified, it identifies itself by the number it
     * was verified under. The typed number still goes on the order below as
     * the contact number.
     */
    const identityPhone = user?.isVerified && user?.phoneNumber ? user.phoneNumber.trim() : phoneNumber.trim();

    const payload: any = {
      email: email.trim(),
      phoneNumber: identityPhone,
      // The account's own name when it has one; the placeholder only otherwise.
      name: resolveCustomerName(user?.name),
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
      headers: apiHeaders({ apiKey: storeInfo?.apiKey }),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || t.loginFailed || 'Login failed');
    /*
     * `/login` cannot confirm verification — only `/user/login`, behind the OTP,
     * does — so it must never be able to take it away either. Belt and braces
     * next to the identity fix above.
     */
    if (json?.data) setUser({ ...json.data, isVerified: json.data?.isVerified || user?.isVerified });
    return json?.data;
  };

  const placeOrder = async () => {
    setTouched(true);
    setSubmitError(null);
    if (!canPlace || placing) return;

    /*
     * A dine-in order is placed at the table, so the guest is already physically
     * accountable and we ask for nothing. Everyone else must have proved their
     * number or email before an order is created.
     */
    if (!isDineIn && !user?.isVerified) {
      setVerifyOpen(true);
      return;
    }

    setPlacing(true);
    try {
      // Named apart from the context `user`: a `const user` here would shadow
      // it for the whole function, putting the verification gate above in its TDZ.
      const customer = await loginCustomer();

      const orderData: any = {
        adminId: storeInfo?.adminId || '',
        storeId: storeInfo?.storeId || '',
        orderType: isDineIn ? 'dineIn' : orderType,
        paymentMethod: paymentMethod ? ORDER_PAYMENT_METHOD[paymentMethod] : 'cash',
        customerDetails: isDineIn
          ? {}
          : {
              // `customer` is what login just returned, so it is the freshest
              // view of the account; `user` covers the case where login was
              // skipped. Dine-in carries no customer at all.
              name: resolveCustomerName(customer?.name ?? user?.name),
              email: email.trim(),
              phoneNumber: phoneNumber.trim(),
            },
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
      if (customer?._id) orderData.customerId = customer._id;
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

      /*
       * Everything the confirmation screen needs to paint before the API
       * answers. Shared by both branches: the online one has to write it too,
       * or a customer coming back from Stripe lands on an empty screen while
       * the order is fetched — and on mobile, on nothing at all.
       */
      const rememberOrder = (orderRef: string, paymentName: string) => {
        storage.set(STORAGE_KEY, { customerName: customerName.trim(), email: email.trim(), phoneNumber: phoneNumber.trim() });
        savePlacedOrder(slug, {
          orderRef,
          isDelivery,
          paymentName,
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
      };

      /*
       * An online method reserves the order instead of placing it: the basket is
       * held server-side, Stripe charges against that reservation, and the
       * webhook turns it into a real order once the money lands. Placing it
       * first would leave the kitchen cooking for a payment that may never come.
       */
      if (paymentMethod && ONLINE_METHODS.has(paymentMethod)) {
        const reserved: any = await createUnconfirmedOrder(storeInfo?.adminId || '', storeInfo?.storeId || '', storeInfo?.apiKey || '', orderData);
        const reservedId = reserved?.id || reserved?._id;
        if (!reservedId) throw new Error('Could not reserve the order');

        /*
         * The short code the customer quotes, not the internal id. The order
         * endpoint accepts either, so this is what travels in the confirmation
         * URL and onto the screen — a Mongo ObjectId is meaningless to someone
         * ringing the restaurant about their food.
         */
        const orderRef = String(reserved?.collectionCode || reservedId);

        const intent = await createPaymentIntent(String(reservedId), customer?._id, paymentMethod);

        /*
         * Remembered, but the cart is deliberately left alone. The customer can
         * still dismiss the Stripe sheet or have the payment declined, and
         * emptying their basket at that point would lose an order they are
         * still trying to place. The confirmation screen clears it once the
         * order is known to exist.
         */
        // The server's enum, matching what `fetchPlacedOrder` reads back off an
        // order — the screens translate it. Storing a display label here made the
        // snapshot and the fetched order disagree about the same payment.
        rememberOrder(orderRef, ORDER_PAYMENT_METHOD[paymentMethod]);

        setPayNow({
          clientSecret: intent.client_secret,
          stripeAccountId: intent.stripe_account_id,
          amount: intent.amount,
          orderId: orderRef,
          // Which wallet the customer asked for, so the Element can offer that
          // one rather than every wallet the device happens to support.
          method: paymentMethod,
        });
        setPlacing(false);
        return;
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

      // Settled in person, so this one is final the moment the API answers.
      rememberOrder(orderRef, paymentMethod ? ORDER_PAYMENT_METHOD[paymentMethod] : 'cash');

      clearCart();
      clearPreorderSlot(slug);
      toConfirmation(orderRef);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'An unknown error occurred while submitting your order.');
      setPlacing(false);
    }
  };


  /*
   * Timing is three mutually exclusive choices backed by one persisted slot, so
   * the presentation asks for a choice rather than juggling the slot itself.
   */
  const chooseTiming = (next: 'standard' | 'priority') => {
    setTiming(next);
    setScheduledSlot(null);
    savePreorderSlot(slug, null);
  };

  const confirmSchedule = (slot: PreorderSlot) => {
    setScheduledSlot(slot);
    setTiming('scheduled');
    savePreorderSlot(slug, slot);
  };

  // Verification closes its own flow; nothing here resumes the order.
  useEffect(() => {
    if (user?.isVerified) setVerifyOpen(false);
  }, [user?.isVerified]);

  return {
    // context
    t, storeInfo, cart, totalPrice, totalItems, discountAmount, appliedVoucher, orderMessage,
    orderType, setOrderType, deliveryAddress, setDeliveryAddress, savedAddresses, slug, toMenu,
    // mode
    isDineIn, isDelivery, isPickup,
    // pricing
    rate, deliveryCharges, deliveryTime, minimumOrderAmount, priorityCharge, priorityTime,
    priorityAvailable, priorityFee, subtotalAfterDiscount, grandTotal, isScheduled,
    // form
    customerName, setCustomerName, email, setEmail, phoneNumber, setPhoneNumber,
    bellName, setBellName, driverNote, setDriverNote,
    timing, scheduledSlot, chooseTiming, confirmSchedule,
    paymentMethod, setPaymentMethod, tip, setTip,
    // sheets
    addressOpen, setAddressOpen, payOpen, setPayOpen, voucherOpen, setVoucherOpen,
    preorderOpen, setPreorderOpen,
    // validation + submit
    touched, placing, submitError, emailValid, phoneValid, missing, payNow, setPayNow,
    verifyOpen, setVerifyOpen,
    belowMinimum, deliveryUnavailable, canPlace, placeLabel, placeHint, placeOrder,
  };
}

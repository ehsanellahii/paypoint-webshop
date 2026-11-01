'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useCart } from '~/contexts/cart-context';
import { useAddress } from '~/contexts/address-context';
import { useStore } from '~/contexts/store-context';
import { checkoutFormStorageKey, contactStorageKey, useUser } from '~/contexts/user-context';
import { useLanguage } from '~/contexts/language-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { useVoucherRequote } from '~/hooks/useVoucherRequote';

import { API_BASE_URL, apiHeaders, createPaymentIntent, createUnconfirmedOrder, CUSTOMER_NAME_PLACEHOLDER, formatPrice } from '~/lib/api';
import { formatCartItemsForOrder, getImageURL, storage, withoutBlankFields } from '~/lib/utils';
import type { PreorderSlot } from '~/components/menu/PreorderModal';
import { ORDER_PAYMENT_METHOD, type PaymentMethod } from '~/components/checkout/PaymentSheet';
import { savePlacedOrder } from '~/lib/lastOrder';
import { checkPreorderSlot, clearPreorderSlot, formatSlotLabel, savePreorderSlot, slotInstant } from '~/lib/preorderSlot';
import { deliveryLaterLabel, deliveryStartLaterToday, hasDeliveryHours, isOpenAt, scheduleFor } from '~/lib/restaurantTimings';
import { berlinHHMM } from '~/lib/berlinTime';
import { useOrderingWindow } from '~/hooks/useOrderingWindow';
import { apiErrorText, orderErrorText, voucherMinimumText } from '~/lib/errorMessages';
import { ApiError, fetchMenuData, getAllProducts } from '~/lib/api';
import { cartLineTotal } from '~/lib/utils';
import { isPaymentMethodOffered } from '~/components/checkout/PaymentSheet';
import { clearOrderAttempt, orderAttemptKey } from '~/lib/orderAttempt';
import { isTypablePhone, normalizeTypedPhone } from '~/lib/phone';


const TZ = 'Europe/Berlin';
export const TIP_VALUES = [0, 1, 2, 3];

/** What the checkout form keeps across a detour (mobile "Gutscheine", a reload). */
type SavedCheckoutForm = {
  bellName?: string;
  driverNote?: string;
  paymentMethod?: PaymentMethod | null;
  tip?: number;
  timing?: 'standard' | 'priority';
};


/**
 * Everything the checkout does that is not layout: form state, validation,
 * pricing and order submission.
 *
 * Mobile and desktop are different screens but the same transaction — the order
 * payload, the pre-order slot maths and the guest-login call must not exist
 * twice, or the two will drift and only one will be tested.
 */
/*
 * `CUSTOMER_NAME_PLACEHOLDER` lives in lib/api.ts, so checkout and
 * registration send the same one.
 */

/**
 * A name that says nothing: blank, or a run of asterisks.
 *
 * Ours is eight, the server's own fallback six and the HubRise import's five,
 * so the shape is matched rather than any one spelling — an account first
 * created by a marketplace order reads as nameless here, which is what lets the
 * name typed at checkout fill it in.
 */
const isPlaceholderName = (name?: string | null) =>
  !name || !name.trim() || /^\*+$/.test(name.trim());

/** The first of these that is a real name, or the placeholder if none is. */
const firstRealName = (...candidates: (string | null | undefined)[]) => {
  const found = candidates.find((c) => !isPlaceholderName(c));
  return found ? found.trim() : CUSTOMER_NAME_PLACEHOLDER;
};

/**
 * Methods settled online, before the order is placed. Cash and the EC reader
 * are collected in person, so those orders go straight through as before.
 */
const ONLINE_METHODS = new Set<PaymentMethod>(['cardWallets', 'applePay', 'googlePay', 'paypal', 'klarna']);

export function useCheckout() {
  const { t, language } = useLanguage();
  const storeInfo = useStore();
  const { user, clearUser } = useUser();
  const { cart, totalPrice, totalItems, discountAmount, appliedVoucher, clearCart, orderMessage } = useCart();
  const { orderType, setOrderType, deliveryAddress, setDeliveryAddress, savedAddresses, deliveryRate } = useAddress();
  const { slug, toMenu, toConfirmation } = useStoreNavigation();
  /*
   * Also supplies the tick that keeps the answer current while the page sits
   * open, and the pre-order slot: one copy of it, which drops a slot that has
   * passed (the order then becomes "as soon as possible").
   */
  const {
    storeClosed,
    slot: windowSlot,
    slotOutsideHours: windowSlotOutsideHours,
    deliveryLater,
    pickupOffered,
    usesDeliveryHours,
  } = useOrderingWindow();

  const isDineIn = !!storeInfo?.tableInfo?.token;
  const isDelivery = !isDineIn && orderType === 'delivery';
  const isPickup = !isDineIn && orderType === 'pickup';
  /** The order type the server prices this order with. */
  const pricingOrderType = isDineIn ? 'dineIn' : orderType;
  const { voucherBelowMinimum, voucherNotice, isHydrated: cartHydrated, reconcile } = useCart();

  /*
   * The delivery terms for this address are the server's answer, held by the
   * address context — the same one the zone gate and the address dialog got.
   * Recomputing them here from the page's rate table used to refuse
   * addresses the gate had just accepted (a store without zones, a postcode
   * stored as a string).
   */
  const rate = deliveryRate;
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
  /*
   * Single mutually-exclusive timing choice, mirroring the prototype:
   * standard | priority (delivery only, if the store defines a charge) | scheduled.
   *
   * "scheduled" is not state of its own: it is "a pre-order slot is stored",
   * read from the one copy `useOrderingWindow` keeps. So when that hook drops
   * a slot that has passed, the choice falls back to the speed below by itself.
   */
  const [speed, setSpeed] = useState<'standard' | 'priority'>('standard');
  const storedSlot = windowSlot;
  /*
   * The label is rebuilt from the slot's date rather than trusted: "Heute"
   * written before midnight is "Gestern" after it.
   */
  const scheduledSlot = useMemo<PreorderSlot | null>(
    () => (storedSlot ? { ...storedSlot, label: formatSlotLabel(storedSlot, { today: t.today, tomorrow: t.tomorrow }, language) } : null),
    [storedSlot, t, language],
  );
  /*
   * Priority only counts while this address offers it. A choice restored
   * from an earlier visit (or made for another address) used to go out as
   * `deliverySpeed: 'priority'` with a fee of 0.
   */
  const timing: 'standard' | 'priority' | 'scheduled' = scheduledSlot ? 'scheduled' : speed === 'priority' && priorityAvailable ? 'priority' : 'standard';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [tip, setTip] = useState(0);

  const [addressOpen, setAddressOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [preorderOpen, setPreorderOpen] = useState(false);

  /** Set once the prefill below has run, so the save effect cannot beat it. */
  const restored = useRef(false);
  /** Same, for the rest of the form (sessionStorage). */
  const formRestored = useRef(false);
  /*
   * The save effect runs in the same commit as the restore, still holding the
   * empty first-render values; writing them would wipe what is about to be
   * restored (and a re-run of the restore — React does that in development —
   * would then read the wiped copy). So that one run is skipped.
   */
  const skipFormSave = useRef(false);
  /*
   * One Idempotency-Key per order attempt, kept in session storage per store
   * (`lib/orderAttempt.ts`): a retry of the same attempt — a timeout, a double
   * tap, a reload after either — sends the same key, so the server answers
   * with the first order instead of creating a second.
   */

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

  /*
   * The rest of the form, per store and per tab.
   *
   * On mobile "Gutscheine" is its own screen; going there and back unmounted
   * the checkout and threw away the payment method, tip, bell name, driver
   * note and the priority choice. Session storage, not local: these belong to
   * the order being put together, not to the customer.
   */
  useEffect(() => {
    let saved: SavedCheckoutForm = {};
    try {
      saved = JSON.parse(sessionStorage.getItem(checkoutFormStorageKey(slug)) || '{}') as SavedCheckoutForm;
    } catch {
      saved = {};
    }
    if (typeof saved.bellName === 'string') setBellName(saved.bellName);
    if (typeof saved.driverNote === 'string') setDriverNote(saved.driverNote);
    if (saved.paymentMethod && isPaymentMethodOffered(saved.paymentMethod, storeInfo)) setPaymentMethod(saved.paymentMethod);
    if (typeof saved.tip === 'number' && TIP_VALUES.includes(saved.tip)) setTip(saved.tip);
    if (saved.timing === 'priority') setSpeed('priority');
    formRestored.current = true;
    skipFormSave.current = true;
    // Restored once per store; the store's settings do not change under an open page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!formRestored.current) return;
    if (skipFormSave.current) {
      skipFormSave.current = false;
      return;
    }
    const form: SavedCheckoutForm = { bellName, driverNote, paymentMethod, tip, timing: speed };
    try {
      sessionStorage.setItem(checkoutFormStorageKey(slug), JSON.stringify(form));
    } catch {
      /* storage unavailable */
    }
  }, [slug, bellName, driverNote, paymentMethod, tip, speed]);

  /*
   * A priority choice this address does not offer is put back to standard
   * once the address's terms are known (not while they are still being asked
   * for, or a restored choice would be thrown away before the answer).
   */
  const rateSettled = isDelivery && !!deliveryAddress && !rate.pending && rate.source !== 'none';
  useEffect(() => {
    if (speed === 'priority' && rateSettled && !priorityAvailable) setSpeed('standard');
  }, [speed, rateSettled, priorityAvailable]);

  // Prefill from the last order. A pre-order slot chosen on the menu comes from `useOrderingWindow`.
  useEffect(() => {
    /*
     * Per store: the old `persisted` key was shared by every restaurant on the
     * domain, so one shop prefilled another's checkout with the last
     * customer's name, e-mail and phone. Logging out clears it.
     */
    const saved = storage.get<{ customerName?: string; email?: string; phoneNumber?: string }>(contactStorageKey(slug), {});
    if (saved.customerName) setCustomerName(saved.customerName);
    if (saved.email) setEmail(saved.email);
    if (saved.phoneNumber) setPhoneNumber(saved.phoneNumber);
    restored.current = true;
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
    storage.set(contactStorageKey(slug), { customerName: customerName.trim(), email: email.trim(), phoneNumber: phoneNumber.trim() });
  }, [slug, customerName, email, phoneNumber]);

  /*
   * An empty cart has nothing to check out — but only once the stored cart has
   * been read. Before that the cart is always empty, and a reload of the
   * checkout bounced every customer back to the menu.
   */
  useEffect(() => {
    if (cartHydrated && cart.length === 0 && !placing) toMenu();
  }, [cartHydrated, cart.length, placing, toMenu]);

  /*
   * The basket priced for the order type it will be placed as. The menu the
   * customer shopped from may have been the pickup one, and a switch to
   * delivery here (or a cart kept for days) changes prices — so the cart is
   * checked against the menu for this order type whenever it changes.
   */
  useEffect(() => {
    if (!cartHydrated || !storeInfo?.adminId || !storeInfo?.storeId) return;
    let cancelled = false;
    fetchMenuData(storeInfo.adminId, storeInfo.storeId, storeInfo.apiKey, pricingOrderType)
      .then((menu) => {
        if (!cancelled && menu?.data) reconcile(getAllProducts(menu));
      })
      .catch(() => {
        /* the order route reprices anyway; the cart stays as it is */
      });
    return () => {
      cancelled = true;
    };
  }, [cartHydrated, storeInfo?.adminId, storeInfo?.storeId, storeInfo?.apiKey, pricingOrderType, reconcile]);

  // The voucher re-checked by the server whenever the basket, order type or customer changes.
  useVoucherRequote(pricingOrderType);

  const isScheduled = timing === 'scheduled' && !!scheduledSlot;
  const priorityFee = timing === 'priority' ? priorityCharge : 0;
  // `discountAmount` follows the basket and never exceeds it — see cart-context.
  const subtotalAfterDiscount = Math.max(0, totalPrice - discountAmount);
  /** A voucher is held and actually takes something off this basket. */
  const voucherApplies = !!appliedVoucher && !voucherBelowMinimum && discountAmount > 0;
  /**
   * Why the voucher is not counting, for the line under the voucher row: the
   * basket is below its minimum, or the server took it off (expired, used up).
   */
  const voucherHint: string | null =
    appliedVoucher && voucherBelowMinimum
      ? voucherMinimumText(appliedVoucher.minimumOrderValue, language, formatPrice)
      : !appliedVoucher && voucherNotice
        ? apiErrorText(voucherNotice, language, 'voucher')
        : null;
  const grandTotal = subtotalAfterDiscount + deliveryCharges + priorityFee + tip;

  // ---- validation (inline, no alerts) ------------------------------------
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  // Judged on the number as it will be sent: separators people type are fine.
  const phoneValid = isTypablePhone(phoneNumber);

  const missing: string[] = [];
  /*
   * What each order type has to ask for:
   *   delivery — bell name and a callback number, nothing else;
   *   pickup   — a name to call out and a number to call when it is ready;
   *   dine-in  — nothing. The table identifies the order.
   */
  if (isPickup && !customerName.trim()) missing.push(t.yourName ?? 'Your name');
  if (!isDineIn && (!phoneNumber.trim() || !phoneValid)) missing.push(isDelivery ? (t.callbackNumberShort ?? t.phoneNumber) : t.phoneNumber);
  if (isDelivery && !deliveryAddress) missing.push(t.deliveryAddress);
  if (isDelivery && !bellName.trim()) missing.push(t.bellName ?? 'Bell name');
  if (!paymentMethod) missing.push(t.paymentType ?? t.paymentMethod);

  /*
   * The name the customer typed at this checkout.
   *
   * On a delivery that is the bell name. It is not a second, lesser field: the
   * name on someone's doorbell is their name, and it is the only name the
   * delivery form asks for — so it is who the order is from, not just a hint
   * for the driver. Sending the account placeholder instead is what put
   * `********` on the kitchen ticket, the receipt and the admin customer list.
   *
   * Pickup asks for it outright; dine-in asks for nothing, because the table
   * already identifies the order.
   */
  const typedName = (isDelivery ? bellName : customerName).trim();

  const belowMinimum = isDelivery && minimumOrderAmount > 0 && totalPrice < minimumOrderAmount;
  const deliveryUnavailable = isDelivery && !!deliveryAddress && !rate.isAvailable;
  /*
   * Still asking the server about this address. The fee and the minimum on
   * screen are the rate table's meanwhile, so the order waits for the answer
   * rather than going out on figures that may change.
   */
  const deliveryZonePending = isDelivery && !!deliveryAddress && rate.pending;

  /*
   * Opening hours.
   *
   * The menu badge and the cart bar already said "Closed", but nothing stopped
   * a customer who was already on the checkout — or who deep-linked straight to
   * it — from pressing the button, and the order printed in a kitchen that had
   * gone home. The server refuses the same order; this is what stops it being
   * sent at all, and lets the button say why.
   *
   * A pre-order is the exception: it is for a slot, not for now, so it only has
   * to fall inside the opening hours of its date — and still be at least five
   * minutes away, the server's own line. The slot lives in session storage and
   * can outlive the hours it was picked under, or simply pass, so it is
   * re-checked on every render (`useOrderingWindow` ticks) rather than trusted.
   * A slot that has passed is dropped there, and the order is then for "as
   * soon as possible" — shown in the timing choice before anything is placed.
   *
   * Closed means: the store is closed now and there is no valid future slot.
   * A future slot outside the hours (they changed since it was picked) is not
   * "closed" — the guest picks another time.
   */
  const slotOutsideHours = isScheduled && windowSlotOutsideHours;
  const orderingClosed = storeClosed && !(isScheduled && !slotOutsideHours);

  /*
   * Delivery hours of the store's own (1 Nov 2026). All of the above is
   * already judged by the selected order type's hours; this only changes the
   * words when delivery has not started yet but the restaurant is open for
   * pickup — "Lieferung erst ab 14:00", with the way out (pre-order a
   * delivery time, or switch to pickup) instead of "Zurzeit geschlossen".
   */
  const deliveryWaitSentence = (opensAt: string | null) =>
    `${opensAt ? t.deliveryOnlyFromToday.replace('{time}', opensAt) : t.deliveryNotAnyMoreToday} ${pickupOffered ? t.deliveryPreorderOrPickup : t.deliveryPreorderOnly}`;
  const deliveryWaitText = deliveryLater ? deliveryWaitSentence(deliveryLater.opensAt) : '';
  const slotClosedText = usesDeliveryHours ? t.preorderSlotOutsideDeliveryHours : t.preorderSlotClosed;

  const canPlace =
    missing.length === 0 && !belowMinimum && !deliveryUnavailable && !deliveryZonePending && !orderingClosed && !slotOutsideHours && cart.length > 0;

  /** The button's words without the price — for a layout that shows the price beside them. */
  const placeLabelShort = (() => {
    if (slotOutsideHours) return t.chooseAnotherTime ?? 'Choose another time';
    if (orderingClosed && deliveryLater) return deliveryLaterLabel(deliveryLater.opensAt, t);
    if (orderingClosed) return t.storeClosedNow ?? t.closed ?? 'Closed';
    if (deliveryUnavailable) return t.weAreNotAvailableInYourArea;
    if (belowMinimum) return `${t.minimumOrderAmountIs} ${formatPrice(minimumOrderAmount)}`;
    if (missing.length === 1) return `${missing[0]} ${t.required ?? ''}`.trim();
    if (missing.length > 1) return `${t.stillMissing ?? 'Still missing'}: ${missing.length}`;
    return t.placeOrder ?? 'Place order';
  })();
  const placeLabel = canPlace ? `${placeLabelShort} · ${formatPrice(grandTotal)}` : placeLabelShort;

  const placeHint = (() => {
    if (slotOutsideHours) return slotClosedText ?? '';
    if (orderingClosed && deliveryLater) return deliveryWaitText;
    if (orderingClosed) return t.storeClosedCannotOrder ?? '';
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
  /**
   * Who the order is from: the customer id for the order, and the customer's
   * own token when signed in (sent with the order, so a voucher bound to the
   * customer is accepted — VOUCHER_LOGIN_REQUIRED otherwise).
   */
  const loginCustomer = async (): Promise<{ _id: string; authToken?: string } | null> => {
    /*
     * Dine-in collects nothing, and the server's login refuses a customer with
     * no phone number ("Phone number is required"). A table order does not need
     * one — `customerId` is optional on the order — so `/login` is skipped
     * rather than inventing an identity. A guest who is signed in still orders
     * as themselves: their id and token go with the table order. A guest who
     * is not orders with no customer at all, as before.
     */
    if (isDineIn) return user?._id && user?.authToken ? { _id: String(user._id), authToken: user.authToken } : null;

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
    const identityPhone = normalizeTypedPhone(user?.isVerified && user?.phoneNumber ? user.phoneNumber : phoneNumber);

    const payload: Record<string, unknown> = {
      email: email.trim(),
      phoneNumber: identityPhone,
      /*
       * The account's own name comes first here, the other way round from the
       * order below.
       *
       * `/login` writes whatever it is sent straight onto the customer record,
       * so sending the bell name would rewrite a returning customer's account
       * every time they ordered to a different door. The typed name is only
       * adopted when the account has nothing real of its own — which is how a
       * record stuck on `********` finally gets a name.
       */
      name: firstRealName(user?.name, typedName),
      signInWith: 'phone',
      signInSource: 'web',
    };
    if (isDelivery && deliveryAddress) {
      payload.address = deliveryAddress.formattedAddress;
      payload.coordinates = { latitude: deliveryAddress.lat, longitude: deliveryAddress.lng };
      payload.postalCode = deliveryAddress.postalCode;
      // Google's `route` is the street and `street_number` the house number;
      // these two were sent the other way round.
      payload.street = deliveryAddress.route;
      payload.houseNumber = deliveryAddress.streetNumber;
      payload.city = deliveryAddress.locality;
      payload.country = deliveryAddress.country;
    }

    /*
     * Blank fields are left out, never sent as "": with the Bearer token
     * `/login` updates the customer's own record from the body, and an empty
     * e-mail field (pickup asks for none) wiped the stored address.
     */
    const body = JSON.stringify(withoutBlankFields(payload));
    const send = (authToken?: string) =>
      fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: apiHeaders({ apiKey: storeInfo?.apiKey, authToken }),
        body,
      });

    // Signed in: the token lets `/login` update this customer's own record.
    let authToken = user?.authToken;
    let res = await send(authToken);
    if (res.status === 401 && authToken && (await res.clone().json().catch(() => ({})))?.code !== 'INVALID_API_KEY') {
      // The session expired. Sign out cleanly and carry on as a guest.
      clearUser();
      authToken = undefined;
      res = await send();
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, json?.code ?? json?.errorCode);
    /*
     * `/login` identifies, it does not authenticate: anyone can type any
     * number here. Its answer is therefore never made into a session — that
     * is how typing a stranger's number at checkout used to log you into
     * their account (name, vouchers, order history). Only the id is used, as
     * the order's customer; sessions come from `/user/login` behind the OTP.
     */
    const id = json?.data?._id ?? json?.data?.id;
    return id ? { _id: String(id), authToken } : null;
  };

  /*
   * The server's own refusal, said in the customer's language.
   *
   * It is the second half of the opening-hours gate: the check above stops the
   * button, this turns "Store is closed" from an API into something the shop
   * would say — and covers every other coded refusal the order route raises.
   */
  const translateOrderError = (e: unknown) => orderErrorText(e, language, formatPrice, { pickupOffered });

  const placeOrder = async () => {
    setTouched(true);
    setSubmitError(null);
    if (!canPlace || placing) return;

    /*
     * Asked again, of the clock rather than of `canPlace`: that flag comes from
     * a render that may be minutes old, and a shop can close between filling
     * the form in and pressing the button.
     */
    // The hours of the order type being placed: delivery hours for a delivery when the store has them.
    const schedule = scheduleFor(storeInfo, pricingOrderType);
    if (isScheduled && scheduledSlot) {
      const check = checkPreorderSlot(schedule, scheduledSlot);
      if (check === 'past' || check === 'invalid') {
        /*
         * The slot passed between the last render and this tap. It is
         * dropped — the order is now for "as soon as possible", which the
         * timing choice shows — and nothing is sent: the guest confirms
         * again. A past time is never sent.
         */
        clearPreorderSlot(slug);
        setSubmitError(t.preorderSlotPassed ?? 'The chosen time has passed. Your order is now for as soon as possible.');
        return;
      }
      // Outside the hours: the guest picks another time.
      if (check !== 'ok') {
        setSubmitError(slotClosedText ?? 'The chosen pre-order time is outside the opening hours.');
        return;
      }
    } else if (!isOpenAt(schedule)) {
      /*
       * Delivery not started yet (or over for today) while the restaurant is
       * open for pickup: say that, not "closed". Judged now, not from the
       * render, like the rest of this check.
       */
      if (isDelivery && hasDeliveryHours(storeInfo) && isOpenAt(scheduleFor(storeInfo, 'pickup'))) {
        setSubmitError(deliveryWaitSentence(deliveryStartLaterToday(storeInfo)));
        return;
      }
      setSubmitError(t.storeClosedCannotOrder ?? 'The restaurant is closed right now, so no orders can be placed.');
      return;
    }

    /*
     * Phone verification is switched off for now, so checkout asks nobody to
     * prove their number and every order goes straight through.
     *
     * Off by choice, not because it is broken: the "customer not found" it
     * used to fail with is fixed — `loginOrRegisterUser` now creates the
     * account when the verified number is new. Uncommenting the three lines
     * below is the whole way back.
     *
     * Dine-in never asked in the first place: the guest is at a table, and the
     * order carries no customer.
     */
    // if (!isDineIn && !user?.isVerified) {
    //   setVerifyOpen(true);
    //   return;
    // }

    // Offered when it was chosen is not offered now (store settings, a build without Stripe).
    if (paymentMethod && !isPaymentMethodOffered(paymentMethod, storeInfo)) {
      setSubmitError(apiErrorText('PAYMENT_METHOD_DISABLED', language, 'order'));
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
              /*
               * The typed name first, then whatever the account knows —
               * `customer` is what login just returned, so it is the freshest
               * view of it, and `user` covers the case where login was skipped.
               * Dine-in carries no customer at all.
               */
              name: firstRealName(typedName, user?.name),
              email: email.trim(),
              // Cleaned of the separators people type ("030/123 45-67").
              phoneNumber: normalizeTypedPhone(phoneNumber),
            },
        items: formatCartItemsForOrder(cart),
        totalOrderPrice: grandTotal,
        totalItems,
        totalItemsPrice: totalPrice,
        deliveryCharges,
        deliveryTime,
        tip,
        // When scheduled, the server derives deliveryType from deliverySchedule;
        // otherwise standard vs priority — priority only with its fee.
        deliverySpeed: isDelivery ? (timing === 'priority' && priorityFee > 0 ? 'priority' : 'standard') : undefined,
        priorityFee,
        instructions: orderMessage.trim(),
        orderSource: 'web',
        platform: 'WebShop',
        // A voucher below its minimum is worth nothing and is not sent.
        isDiscounted: voucherApplies,
        discountAmount: voucherApplies ? discountAmount : 0,
        isVoucherApplied: voucherApplies,
      };

      if (orderData.orderType === 'delivery') {
        orderData.addressDetails = {
          // Street name and house number — Google calls them `route` and `street_number`.
          street: deliveryAddress?.route || '',
          houseNumber: deliveryAddress?.streetNumber || '',
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
      if (appliedVoucher && voucherApplies) {
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
      /*
       * The slot carries its own Berlin date, so this is the instant the guest
       * picked — no "days from today" to count from a day that may have
       * changed since.
       */
      const startAt = isScheduled && scheduledSlot ? slotInstant(scheduledSlot) : null;

      if (startAt !== null) {
        const endAt = startAt + (isDelivery ? deliveryTime : 15) * 60_000;
        orderData.deliverySchedule = {
          timezone: TZ,
          scheduledDate: new Date(startAt),
          timeSlot: { startTime: berlinHHMM(startAt), endTime: berlinHHMM(endAt) },
        };
        etaLabel = `${berlinHHMM(startAt)} – ${berlinHHMM(endAt)}`;
      }

      /*
       * Everything the confirmation screen needs to paint before the API
       * answers. Shared by both branches: the online one has to write it too,
       * or a customer coming back from Stripe lands on an empty screen while
       * the order is fetched — and on mobile, on nothing at all.
       */
      const rememberOrder = (orderRef: string, paymentName: string, cartCleared: boolean) => {
        storage.set(contactStorageKey(slug), { customerName: customerName.trim(), email: email.trim(), phoneNumber: phoneNumber.trim() });
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
            // Extras included — the same figure the cart and checkout showed.
            lineTotal: cartLineTotal(i),
            image: i.product.images?.length ? getImageURL(i.product.images[0]) : '',
          })),
          placedAt: Date.now(),
          cartCleared,
        });
      };

      /*
       * The attempt's key: kept while the payload is the same (a retry), new
       * as soon as anything in it changes (a different order).
       */
      const idempotencyKey = orderAttemptKey(slug, JSON.stringify(orderData));

      /*
       * An online method reserves the order instead of placing it: the basket is
       * held server-side, Stripe charges against that reservation, and the
       * webhook turns it into a real order once the money lands. Placing it
       * first would leave the kitchen cooking for a payment that may never come.
       */
      if (paymentMethod && ONLINE_METHODS.has(paymentMethod)) {
        const reserved: any = await createUnconfirmedOrder(storeInfo?.adminId || '', storeInfo?.storeId || '', storeInfo?.apiKey || '', orderData, idempotencyKey, customer?.authToken);
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
        rememberOrder(orderRef, ORDER_PAYMENT_METHOD[paymentMethod], false);

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
        headers: { ...apiHeaders({ apiKey: storeInfo?.apiKey, authToken: customer?.authToken }), 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(orderData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new ApiError(res.status, err?.code ?? err?.errorCode, err?.data);
      }
      const result = await res.json();
      const orderRef = result?.data?.collectionCode || result?.data?.id || result?.data?._id || '';

      // Settled in person, so this one is final the moment the API answers.
      // The cart is emptied right here, so the confirmation must not do it again.
      rememberOrder(String(orderRef), paymentMethod ? ORDER_PAYMENT_METHOD[paymentMethod] : 'cash', true);

      clearOrderAttempt(slug);
      try {
        sessionStorage.removeItem(checkoutFormStorageKey(slug));
      } catch {
        /* storage unavailable */
      }
      clearCart();
      clearPreorderSlot(slug);
      toConfirmation(String(orderRef));
    } catch (e) {
      /*
       * A coded refusal is final for this payload: a later try (after the
       * shop opens, after fixing the basket) is a new attempt with a new key.
       * Anything else — no answer, a 5xx — may have gone through, so the key
       * is kept and a retry cannot create a second order.
       */
      const status = (e as ApiError)?.status;
      if (typeof status === 'number' && status >= 400 && status < 500) clearOrderAttempt(slug);
      // The server's clock says the slot has passed: drop it, as above.
      if ((e as ApiError)?.code === 'PREORDER_IN_PAST') clearPreorderSlot(slug);
      setSubmitError(translateOrderError(e));
      setPlacing(false);
    }
  };


  /*
   * Timing is three mutually exclusive choices backed by one persisted slot, so
   * the presentation asks for a choice rather than juggling the slot itself.
   */
  const chooseTiming = (next: 'standard' | 'priority') => {
    setSpeed(next);
    savePreorderSlot(slug, null);
  };

  // Stored, and read back through `useOrderingWindow` like a slot picked on the menu.
  const confirmSchedule = (slot: PreorderSlot) => {
    savePreorderSlot(slug, slot);
  };

  // Verification closes its own flow; nothing here resumes the order.
  useEffect(() => {
    if (user?.isVerified) setVerifyOpen(false);
  }, [user?.isVerified]);

  return {
    // context
    t, storeInfo, cart, totalPrice, totalItems, discountAmount, appliedVoucher, voucherBelowMinimum, voucherHint, orderMessage,
    orderType, setOrderType, deliveryAddress, setDeliveryAddress, savedAddresses, slug, toMenu,
    // mode
    isDineIn, isDelivery, isPickup,
    // pricing
    rate, deliveryCharges, deliveryTime, minimumOrderAmount, priorityCharge, priorityTime,
    priorityAvailable, priorityFee, subtotalAfterDiscount, grandTotal, isScheduled,
    // form
    customerName, setCustomerName, typedName, email, setEmail, phoneNumber, setPhoneNumber,
    bellName, setBellName, driverNote, setDriverNote,
    timing, scheduledSlot, chooseTiming, confirmSchedule,
    paymentMethod, setPaymentMethod, tip, setTip,
    // sheets
    addressOpen, setAddressOpen, payOpen, setPayOpen, voucherOpen, setVoucherOpen,
    preorderOpen, setPreorderOpen,
    // validation + submit
    touched, placing, submitError, emailValid, phoneValid, missing, payNow, setPayNow,
    verifyOpen, setVerifyOpen,
    belowMinimum, deliveryUnavailable, storeClosed, slotOutsideHours, orderingClosed, deliveryLater,
    canPlace, placeLabel, placeLabelShort, placeHint, placeOrder,
  };
}

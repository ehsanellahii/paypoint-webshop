import type { Language } from '~/lib/i18n';

/**
 * What the shop says when the server refuses something.
 *
 * Server 0051 answers every refusal with a stable UPPER_SNAKE `code`; this is
 * the one place those codes become words. The server's own `message` is
 * English, written for developers, and is never shown to a guest — a code we
 * do not know yet gets the generic sentence of its kind.
 *
 * Codes the server used before 0051 (camelCase) are mapped as aliases, so a
 * shop running a little ahead of its server still speaks German.
 */
type Text = { de: string; en: string };

const TEXTS: Record<string, Text> = {
  // ---- ordering ---------------------------------------------------------
  STORE_CLOSED: {
    de: 'Das Restaurant hat gerade geschlossen, daher sind keine Bestellungen möglich.',
    en: 'The restaurant is closed right now, so no orders can be placed.',
  },
  PREORDER_OUTSIDE_OPENING_HOURS: {
    de: 'Die gewählte Vorbestellzeit liegt außerhalb der Öffnungszeiten. Bitte wähle eine andere.',
    en: 'The chosen pre-order time is outside the opening hours. Please pick another one.',
  },
  /*
   * Separate delivery hours (server 0052). The restaurant is open for pickup,
   * delivery is not yet (or no longer today). `orderErrorText` names the time
   * from `data.deliveryOpensAt`; this is the sentence without one.
   */
  DELIVERY_CLOSED_NOW: {
    de: 'Lieferung ist gerade nicht möglich. Bestell die Lieferung für später vor oder hol jetzt ab.',
    en: 'Delivery is not available right now. Pre-order your delivery for later or pick up now.',
  },
  PREORDER_OUTSIDE_DELIVERY_HOURS: {
    de: 'Die gewählte Zeit liegt außerhalb der Lieferzeiten. Bitte wähle eine andere.',
    en: 'The chosen time is outside the delivery hours. Please pick another one.',
  },
  // The store is locked for an unpaid PayPoint invoice — to the guest it is simply closed.
  BILLING_LOCKED: {
    de: 'Das Restaurant hat gerade geschlossen, daher sind keine Bestellungen möglich.',
    en: 'The restaurant is closed right now, so no orders can be placed.',
  },
  INVALID_PREORDER_TIME: {
    de: 'Die gewählte Vorbestellzeit ist ungültig. Bitte wähle sie noch einmal.',
    en: 'The chosen pre-order time is not valid. Please choose it again.',
  },
  PREORDER_IN_PAST: {
    de: 'Die gewählte Zeit ist schon vorbei oder zu knapp. Bitte wähle eine spätere Zeit.',
    en: 'The chosen time has passed or is too soon. Please pick a later time.',
  },
  MIN_ORDER_NOT_MET: {
    de: 'Der Mindestbestellwert für dein Liefergebiet ist noch nicht erreicht.',
    en: 'Your order has not reached the minimum order value for your area yet.',
  },
  ORDER_INVALID: {
    de: 'Die Bestellung ist unvollständig. Bitte prüfe deine Angaben und versuche es noch einmal.',
    en: 'The order is incomplete. Please check your details and try again.',
  },
  CART_EMPTY: {
    de: 'Dein Warenkorb ist leer.',
    en: 'Your cart is empty.',
  },
  QUANTITY_INVALID: {
    de: 'Bei einem Artikel stimmt die Menge nicht. Bitte passe sie im Warenkorb an.',
    en: 'The quantity of an item is not valid. Please adjust it in the cart.',
  },
  PRODUCT_UNAVAILABLE: {
    de: 'Ein Artikel in deinem Warenkorb ist gerade nicht verfügbar. Bitte entferne ihn und versuche es erneut.',
    en: 'An item in your cart is not available right now. Please remove it and try again.',
  },
  PRODUCT_INVALID: {
    de: 'Ein Artikel in deinem Warenkorb wird nicht mehr angeboten. Bitte entferne ihn und versuche es erneut.',
    en: 'An item in your cart is no longer offered. Please remove it and try again.',
  },
  OPTION_REQUIRED: {
    de: 'Bei einem Artikel fehlt noch eine Auswahl (z. B. Größe oder Beilage). Bitte füge ihn neu hinzu.',
    en: 'An item is missing a required choice (such as size or side). Please add it again.',
  },
  OPTION_INVALID: {
    de: 'Eine gewählte Option gibt es bei einem Artikel nicht mehr. Bitte füge ihn neu hinzu.',
    en: 'A chosen option is no longer offered for an item. Please add it again.',
  },
  OPTION_UNAVAILABLE: {
    de: 'Eine gewählte Option ist gerade ausverkauft. Bitte füge den Artikel ohne sie neu hinzu.',
    en: 'A chosen option is sold out right now. Please add the item again without it.',
  },
  OPTION_TOO_MANY: {
    de: 'Bei einem Artikel sind zu viele Extras gewählt. Bitte füge ihn neu hinzu.',
    en: 'Too many extras were chosen for an item. Please add it again.',
  },
  MAX_QUANTITY: {
    de: 'Von einem Artikel ist mehr im Warenkorb, als auf einmal bestellt werden kann.',
    en: 'You have more of one item in your cart than can be ordered at once.',
  },
  DELIVERY_AREA: {
    de: 'Leider liefern wir nicht an diese Adresse.',
    en: 'Sorry, we do not deliver to this address.',
  },
  DELIVERY_UNAVAILABLE: {
    de: 'Lieferung ist bei diesem Restaurant gerade nicht möglich. Du kannst abholen.',
    en: 'Delivery is not available at this restaurant right now. You can pick up.',
  },
  PAYMENT_METHOD_DISABLED: {
    de: 'Diese Zahlungsart ist gerade nicht verfügbar. Bitte wähle eine andere.',
    en: 'This payment method is not available right now. Please choose another one.',
  },
  // A table QR order with a token that is no longer valid (server 0052, E2E fix).
  TABLE_TOKEN_INVALID: {
    de: 'Dieser Tisch-Code ist nicht mehr gültig. Bitte scanne den QR-Code am Tisch erneut.',
    en: 'This table code is no longer valid. Please scan the QR code at your table again.',
  },
  // The restaurant's Stripe account cannot take this method (server 0052).
  PAYMENT_METHOD_UNAVAILABLE: {
    de: 'Diese Zahlungsart ist bei diesem Restaurant gerade nicht verfügbar. Bitte wähle eine andere.',
    en: 'This payment method is not available at this restaurant right now. Please choose another one.',
  },
  ORDER_TYPE_DISABLED: {
    de: 'Diese Bestellart wird gerade nicht angeboten.',
    en: 'This order type is not offered right now.',
  },
  REOPEN_IN_PROGRESS: {
    de: 'Dein Tisch wird gerade an der Kasse bearbeitet. Bitte versuche es in einer Minute noch einmal.',
    en: 'Your table is being updated at the till. Please try again in a minute.',
  },
  // The order changed between two taps with the same attempt key — a fresh tap sends a new one.
  IDEMPOTENCY_KEY_REUSED: {
    de: 'Deine Bestellung hat sich inzwischen geändert. Bitte tippe noch einmal auf „Bestellung aufgeben“.',
    en: 'Your order changed in the meantime. Please tap “Place order” once more.',
  },
  // ---- vouchers ---------------------------------------------------------
  VOUCHER_NOT_FOUND: {
    de: 'Diesen Gutscheincode gibt es nicht. Bitte prüfe ihn noch einmal.',
    en: 'This voucher code does not exist. Please check it and try again.',
  },
  VOUCHER_EXPIRED: {
    de: 'Dieser Gutschein ist abgelaufen.',
    en: 'This voucher has expired.',
  },
  VOUCHER_MIN_ORDER: {
    de: 'Für diesen Gutschein ist dein Bestellwert noch zu niedrig.',
    en: 'Your order is below the minimum value for this voucher.',
  },
  VOUCHER_LIMIT_REACHED: {
    de: 'Dieser Gutschein wurde schon so oft eingelöst, wie es erlaubt ist.',
    en: 'This voucher has already been used as often as allowed.',
  },
  VOUCHER_LOGIN_REQUIRED: {
    de: 'Bitte melde dich an, um diesen Gutschein zu nutzen.',
    en: 'Please sign in to use this voucher.',
  },
  VOUCHER_INVALID: {
    de: 'Dieser Gutschein kann für diese Bestellung nicht verwendet werden.',
    en: 'This voucher cannot be used for this order.',
  },
  SUBTOTAL_REQUIRED: {
    de: 'Lege zuerst etwas in den Warenkorb, dann kannst du den Gutschein einlösen.',
    en: 'Add something to your cart first, then redeem the voucher.',
  },
  // ---- sign-in / account ------------------------------------------------
  AUTH_TOKEN_REQUIRED: {
    de: 'Die Anmeldung konnte nicht bestätigt werden. Bitte melde dich noch einmal an.',
    en: 'We could not confirm your sign-in. Please sign in again.',
  },
  AUTH_TOKEN_INVALID: {
    de: 'Deine Anmeldung ist abgelaufen oder ungültig. Bitte melde dich noch einmal an.',
    en: 'Your sign-in has expired or is not valid. Please sign in again.',
  },
  AUTH_PHONE_MISMATCH: {
    de: 'Die bestätigte Nummer passt nicht zur eingegebenen. Bitte melde dich mit derselben Nummer an.',
    en: 'The verified number does not match the one you entered. Please sign in with the same number.',
  },
  AUTH_EMAIL_MISMATCH: {
    de: 'Die bestätigte E-Mail-Adresse passt nicht zu diesem Konto. Bitte melde dich noch einmal an.',
    en: 'The verified e-mail address does not match this account. Please sign in again.',
  },
  AUTH_EMAIL_UNVERIFIED: {
    de: 'Deine E-Mail-Adresse ist bei Google bzw. Apple noch nicht bestätigt. Bitte bestätige sie dort oder melde dich mit deiner Telefonnummer an.',
    en: 'Your e-mail address is not verified with Google or Apple yet. Please verify it there or sign in with your phone number.',
  },
  AUTH_REQUIRED: {
    de: 'Bitte melde dich an, um das zu sehen.',
    en: 'Please sign in to see this.',
  },
  FORBIDDEN: {
    de: 'Dafür fehlt dir die Berechtigung. Bitte melde dich noch einmal an.',
    en: 'You are not allowed to do that. Please sign in again.',
  },
  TOO_MANY_REQUESTS: {
    de: 'Zu viele Versuche, bitte kurz warten.',
    en: 'Too many attempts, please wait a moment.',
  },
  // The shop's own key was refused — nothing the guest did; a generic sentence with a retry.
  INVALID_API_KEY: {
    de: 'Der Shop konnte gerade nicht erreicht werden. Bitte lade die Seite neu.',
    en: 'The shop could not be reached right now. Please reload the page.',
  },
  STORE_REQUIRED: {
    de: 'Der Shop konnte gerade nicht erreicht werden. Bitte lade die Seite neu.',
    en: 'The shop could not be reached right now. Please reload the page.',
  },
  STORE_NOT_FOUND: {
    de: 'Der Shop konnte gerade nicht erreicht werden. Bitte lade die Seite neu.',
    en: 'The shop could not be reached right now. Please reload the page.',
  },
};

/* Old (pre-0051) codes → the code that says the same thing. */
const ALIASES: Record<string, string> = {
  belowMinimumOrderAmount: 'MIN_ORDER_NOT_MET',
  productUnavailable: 'PRODUCT_UNAVAILABLE',
  optionUnavailable: 'PRODUCT_UNAVAILABLE',
  invalidProduct: 'PRODUCT_INVALID',
  deleted: 'PRODUCT_INVALID',
  skuRequired: 'OPTION_REQUIRED',
  minCustomizationNotMet: 'OPTION_REQUIRED',
  maxCustomizationExceeded: 'OPTION_TOO_MANY',
  multipleSelectionNotAllowed: 'OPTION_TOO_MANY',
  maxMultipleSelectionExceeded: 'OPTION_TOO_MANY',
  invalidCustomizationOption: 'PRODUCT_INVALID',
  invalidCustomizationGroup: 'PRODUCT_INVALID',
  customizationGroupNotFound: 'PRODUCT_INVALID',
  invalidAddOn: 'PRODUCT_INVALID',
  maxSingleOrderQuantityExceeded: 'MAX_QUANTITY',
  postalCodeNotServed: 'DELIVERY_AREA',
  noDelivery: 'DELIVERY_AREA',
  invalidVoucher: 'VOUCHER_INVALID',
  voucherExpired: 'VOUCHER_EXPIRED',
  MINIMUM_ORDER_VALUE_NOT_MET: 'VOUCHER_MIN_ORDER',
  LIMIT_EXCEEDED: 'VOUCHER_LIMIT_REACHED',
  CUSTOMER_NOT_FOUND: 'VOUCHER_LOGIN_REQUIRED',
};

const GENERIC: Record<'order' | 'voucher' | 'auth' | 'load' | 'generic', Text> = {
  order: {
    de: 'Die Bestellung konnte nicht abgeschickt werden. Bitte versuche es noch einmal.',
    en: 'Your order could not be sent. Please try again.',
  },
  voucher: {
    de: 'Der Gutschein konnte nicht eingelöst werden. Bitte versuche es noch einmal.',
    en: 'The voucher could not be redeemed. Please try again.',
  },
  auth: {
    de: 'Die Anmeldung hat nicht geklappt. Bitte versuche es noch einmal.',
    en: 'Sign-in did not work. Please try again.',
  },
  load: {
    de: 'Das konnte gerade nicht geladen werden. Bitte versuche es noch einmal.',
    en: 'This could not be loaded right now. Please try again.',
  },
  generic: {
    de: 'Etwas ist schiefgelaufen. Bitte versuche es noch einmal.',
    en: 'Something went wrong. Please try again.',
  },
};

export type ErrorKind = keyof typeof GENERIC;

/** Resolve a code (new or legacy) to its entry, if we have one. */
export function knownErrorCode(code?: string | null): string | null {
  if (!code) return null;
  if (TEXTS[code]) return code;
  const alias = ALIASES[code];
  return alias && TEXTS[alias] ? alias : null;
}

/**
 * The sentence for a refusal, in the shop's language. Unknown or missing codes
 * fall back to the generic sentence of `kind` — never to the server's text.
 */
export function apiErrorText(code: string | null | undefined, language: Language | string | undefined, kind: ErrorKind = 'generic'): string {
  const lang = language === 'en' ? 'en' : 'de';
  const known = knownErrorCode(code);
  return (known ? TEXTS[known] : GENERIC[kind])[lang];
}

/**
 * An order refusal, with the amount where the server sends one
 * (`MIN_ORDER_NOT_MET` → `data.minimumOrderAmount`) and the delivery start
 * (`DELIVERY_CLOSED_NOW` → `data.deliveryOpensAt`, "14:00", or null when no
 * delivery is left today).
 *
 * `pickupOffered` (default true) says whether the store takes pickup, so a
 * delivery refusal only suggests picking up where that is possible.
 */
export function orderErrorText(
  e: any,
  language: Language | string | undefined,
  formatPrice: (v: number) => string,
  { pickupOffered = true }: { pickupOffered?: boolean } = {},
): string {
  const code = errorCodeOf(e);
  const en = language === 'en';
  const minimum = Number(e?.data?.minimumOrderAmount);
  if (knownErrorCode(code) === 'MIN_ORDER_NOT_MET' && Number.isFinite(minimum) && minimum > 0) {
    return en
      ? `The minimum order value for your area is ${formatPrice(minimum)}.`
      : `Der Mindestbestellwert für dein Liefergebiet beträgt ${formatPrice(minimum)}.`;
  }
  if (code === 'DELIVERY_CLOSED_NOW') {
    const opensAt = e?.data?.deliveryOpensAt;
    const known = typeof opensAt === 'string' && /^\d{2}:\d{2}$/.test(opensAt);
    // Null: nothing left today. Absent: the server did not say — no time named.
    const first = known
      ? en
        ? `Delivery is only available from ${opensAt} today.`
        : `Lieferung ist heute erst ab ${opensAt} möglich.`
      : opensAt === null
        ? en
          ? 'Delivery is no longer available today.'
          : 'Lieferung ist heute nicht mehr möglich.'
        : en
          ? 'Delivery is not available right now.'
          : 'Lieferung ist gerade nicht möglich.';
    const second = pickupOffered
      ? en
        ? 'Pre-order your delivery for later or pick up now.'
        : 'Bestell die Lieferung für später vor oder hol jetzt ab.'
      : en
        ? 'Pre-order your delivery for later.'
        : 'Bestell die Lieferung für später vor.';
    return `${first} ${second}`;
  }
  return apiErrorText(code, language, 'order');
}

/** The minimum-order sentence for a voucher, with the amount when we know it. */
export function voucherMinimumText(minimum: number | undefined, language: Language | string | undefined, formatPrice: (v: number) => string): string {
  if (!minimum) return apiErrorText('VOUCHER_MIN_ORDER', language, 'voucher');
  return language === 'en' ? `This voucher applies from ${formatPrice(minimum)}.` : `Dieser Gutschein gilt ab ${formatPrice(minimum)} Bestellwert.`;
}

/** Pull the code off whatever a failed call threw or answered. */
export const errorCodeOf = (e: any): string | undefined => e?.code ?? e?.errorCode ?? undefined;

/** Kept for existing callers: a voucher refusal, translated. The message argument is ignored on purpose. */
const getTranslatedVoucherApiErrorMessage = (code: string, _message: string, _t: any, language?: Language | string): string =>
  apiErrorText(code, language ?? 'de', 'voucher');

/** Kept for existing callers: an order refusal, translated. The message argument is ignored on purpose. */
const getTranslatedOrderApiErrorMessage = (code: string | undefined, _message: string | undefined, _t: any, language?: Language | string): string =>
  apiErrorText(code, language ?? 'de', 'order');

export { getTranslatedVoucherApiErrorMessage, getTranslatedOrderApiErrorMessage };

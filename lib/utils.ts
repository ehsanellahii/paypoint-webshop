/* eslint-disable @typescript-eslint/no-explicit-any */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { IStoreInfo } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage: ${key}`, error);
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage: ${key}`, error);
      return false;
    }
  },

  remove: (key: string): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage: ${key}`, error);
      return false;
    }
  },
};

export const isDeliveryAvailableForPostalCode = (postalCode: number, postalRates: IStoreInfo['postalRates']): boolean => {
  if (!postalRates || postalRates.length === 0) return false;
  return postalRates.some((rate) => rate.postalCode === postalCode);
};

export const getDeliveryChargesFromPostalCode = (postalCode: number, postalRates: IStoreInfo['postalRates']) => {
  if (!postalRates || postalRates.length === 0) return null;
  const rate = postalRates.find((rate) => rate.postalCode === postalCode);
  return rate ? rate.deliveryCharges : null;
};

export const getMinimumOrderAmountFromPostalCode = (postalCode: number, postalRates: IStoreInfo['postalRates']) => {
  if (!postalRates || postalRates.length === 0) return null;
  const rate = postalRates.find((rate) => rate.postalCode === postalCode);
  return rate ? rate.minimumOrderAmount : null;
};

/**
 * Turn a single configured duration into the range customers actually expect.
 *
 * The store stores one number (30), but quoting "30 Min." exactly reads as a
 * promise and is wrong the moment a driver hits traffic. Every delivery app
 * shows a window instead, so 30 becomes "20–30". The configured value is the
 * upper bound — never quote later than the restaurant promised.
 *
 * `spread` is the width of the window; the lower bound is floored at 5 so a
 * short ETA cannot produce a nonsensical "0–10".
 */
export const formatEtaRange = (minutes: number | null | undefined, spread = 10): string => {
  const upper = Number(minutes);
  if (!Number.isFinite(upper) || upper <= 0) return '';
  const lower = Math.max(5, Math.round(upper - spread));
  // A window needs two distinct ends; below the spread just quote the figure.
  return lower >= upper ? `${upper}` : `${lower}–${upper}`;
};

// Make one combination of isDeliveryAvailableForPostalCode,getDeliveryChargesFromPostalCode and getMinimumOrderAmountFromPostalCode
export const getPostalRateInfo = (
  postalCode: number,
  postalRates: IStoreInfo['postalRates']
): {
  isAvailable: boolean;
  deliveryCharges: number | null;
  minimumOrderAmount: number | null;
  deliveryTime: number | null;
  priorityDeliveryCharges: number | null;
  priorityDeliveryTime: number | null;
} => {
  const empty = {
    isAvailable: false,
    deliveryCharges: null,
    minimumOrderAmount: null,
    deliveryTime: null,
    priorityDeliveryCharges: null,
    priorityDeliveryTime: null,
  };

  if (!postalRates || postalRates.length === 0) return empty;

  const rate = postalRates.find((rate) => rate.postalCode === postalCode);
  if (!rate) return empty;

  return {
    isAvailable: true,
    deliveryCharges: rate.deliveryCharges,
    minimumOrderAmount: rate.minimumOrderAmount,
    deliveryTime: rate.deliveryTime,
    priorityDeliveryCharges: rate.priorityDeliveryCharges ?? null,
    priorityDeliveryTime: rate.priorityDeliveryTime ?? null,
  };
};

// ✅ Generic helpers
export type MongoId = string;

export type DiscountType = 'percentage' | 'fixed';
export type SelectionType = 'single' | 'multiple';

// ------------------------------
// Root: Category / Menu Section
// ------------------------------
export interface MenuCategory {
  id: MongoId; // you have id at category level
  name: string;
  productsCount: number;
  sortId: number;
  image: string; // filename/path
  products: MenuProduct[];
}

// ------------------------------
// Product
// ------------------------------
/** One buyable variant — a size, a portion, a bottle. */
export interface MenuSku {
  _id: MongoId;
  /** Null when the product has no size axis. */
  name: string | null;
  price: number;
  available: boolean;
  optionListIds: MongoId[];
}

export interface MenuProduct {
  _id: MongoId; // you have both _id and id
  id: MongoId;
  name: string;
  description?: string;
  currentPrice: number;
  originalPrice?: number;
  discount?: number;
  discountType?: DiscountType;
  images: string[];
  haveCustomizations: boolean;
  addOns: AddOnGroup[];
  /** Every variant. One entry means there is no size choice to make. */
  skus?: MenuSku[];
  /** Set on the copy held in the cart, so the line knows what was sold. */
  skuRef?: MongoId;
  skuName?: string | null;
}

// ------------------------------
// Add-on group (Customization group)
// ------------------------------
export interface AddOnGroup {
  _id: MongoId;
  name: string;

  // quantity rules
  minimumQuantity?: number;
  maximumQuantity: number;

  // selection rules
  isMultipleSelectionAllowed: boolean;
  maxMultipleSelection?: number;

  options: AddOnOption[];
}

// ------------------------------
// Option inside add-on group
// ------------------------------
export interface AddOnOption {
  _id: MongoId;
  name: string;
  price: number;
}

export interface IMenuData {
  data: MenuCategory[];
  success: boolean;
}

export const getImageURL = (imageKey: string): string => {
  if (!imageKey) return '';
  /*
   * Menu image keys are the uploaded filename, so most of them carry spaces,
   * brackets, apostrophes and umlauts — "1744313086014_Lava Cake.jpg". Pasted
   * into a URL raw, that is not a valid URL: CSS `url()` rejects it and drops
   * the whole declaration, which is why the add-to-cart toast and the
   * fly-to-cart thumbnail came out blank while the product grid was fine —
   * next/image re-encodes the src itself and hid the problem.
   *
   * Encode per segment so a key that ever contains a folder still works.
   */
  const encodedKey = imageKey.split('/').map(encodeURIComponent).join('/');
  return 'https://paypoint-storage.s3.eu-central-1.amazonaws.com/menu/' + encodedKey;
};

type FormattedAddOn = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  parentGroupId: string;
};

/* ------------------------------------------------------------ money helpers */

/**
 * Euros to whole cents, rounded the way the server rounds (`Math.round(n*100)`).
 *
 * Every total the shop shows or sends is summed in cents. Adding euro floats
 * line by line drifted by a cent on some baskets (0.1 + 0.2), and a total that
 * differs from the server's by one cent is a total the customer was not shown.
 */
export const toCents = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

export const fromCents = (cents: number): number => Number((cents / 100).toFixed(2));

/** The shape every cart line has; declared here so this file needs no React import. */
export type PricedLine = {
  product: Pick<MenuProduct, 'currentPrice' | 'addOns'>;
  quantity: number;
  customizations?: Record<string, Record<string, number>>;
};

/**
 * One unit of a line, in cents: the product (or size) price plus every chosen
 * option × its quantity. Option quantities are per item — "2 × extra cheese"
 * on a line of 3 pizzas is six portions of cheese.
 */
export function cartLineUnitCents(line: PricedLine): number {
  let cents = toCents(line.product?.currentPrice);
  for (const [groupId, options] of Object.entries(line.customizations || {})) {
    const group = line.product?.addOns?.find((g) => g._id === groupId);
    if (!group) continue;
    for (const [optionId, rawQty] of Object.entries(options || {})) {
      const qty = Number(rawQty ?? 0);
      if (!(qty > 0)) continue;
      const option = group.options?.find((o) => o._id === optionId);
      if (!option) continue;
      cents += toCents(option.price) * qty;
    }
  }
  return cents;
}

/**
 * What a cart line costs: (unit + Σ option × option qty) × line qty.
 *
 * The one formula for every screen and for the order payload — the server
 * (0051) prices a line the same way. The cart, checkout and confirmation rows
 * used to show `currentPrice × qty` and leave the extras out.
 */
export function cartLineTotalCents(line: PricedLine): number {
  const qty = Math.max(0, Math.floor(Number(line.quantity) || 0));
  return cartLineUnitCents(line) * qty;
}

export const cartLineTotal = (line: PricedLine): number => fromCents(cartLineTotalCents(line));

/** The food subtotal of a cart, summed in cents. */
export const cartSubtotal = (lines: PricedLine[]): number =>
  fromCents(lines.reduce((sum, line) => sum + cartLineTotalCents(line), 0));

/** Just the rules of a voucher — what is needed to price it against any basket. */
export type VoucherRules = {
  discountType: 'percentage' | 'fixed' | string;
  discountValue: number;
  minimumOrderValue?: number | null;
  maximumDiscountValue?: number | null;
};

/**
 * A voucher's discount on a food subtotal, exactly as the order repricing on
 * the server works it out: percentages floored to the cent, the cap applied,
 * never more than the food itself, nothing below the voucher's minimum.
 */
export function computeVoucherDiscount(v: VoucherRules | null | undefined, subtotal: number): { discount: number; belowMinimum: boolean } {
  if (!v) return { discount: 0, belowMinimum: false };
  const subCents = Math.max(0, toCents(subtotal));
  const minCents = toCents(v.minimumOrderValue ?? 0);
  if (minCents > 0 && subCents < minCents) return { discount: 0, belowMinimum: true };

  let cents: number;
  if (String(v.discountType).toLowerCase() === 'percentage') {
    cents = Math.floor((subCents * Number(v.discountValue || 0)) / 100);
    const cap = toCents(v.maximumDiscountValue ?? 0);
    if (cap > 0 && cents > cap) cents = cap;
  } else {
    cents = toCents(v.discountValue);
  }
  cents = Math.min(Math.max(0, cents), subCents);
  return { discount: fromCents(cents), belowMinimum: false };
}

/**
 * A profile body without its blank fields (undefined, null, "" or only
 * spaces).
 *
 * `/login` fills or — with the customer's Bearer token — updates the record
 * from what it is sent, so an empty e-mail field at checkout wiped the e-mail
 * a signed-in customer had stored. Only what was actually filled in is sent.
 */
export function withoutBlankFields<T extends Record<string, unknown>>(body: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(body).filter(([, v]) => v !== undefined && v !== null && !(typeof v === 'string' && !v.trim())),
  ) as Partial<T>;
}

export function formatCartItemsForOrder(cart: any[]) {
  return cart.map((item) => {
    const { product, quantity, customizations, notes } = item;

    const addOns: FormattedAddOn[] = [];

    // Loop through customization groups
    Object.entries(customizations || {}).forEach(([groupId, optionsMap]: any) => {
      const group = product.addOns?.find((g: any) => g._id === groupId);

      if (!group) return;

      Object.entries(optionsMap || {}).forEach(([optionId, optionQty]: any) => {
        const option = group.options?.find((o: any) => o._id === optionId);
        const qty = Number(optionQty ?? 0);

        if (!option || !(qty > 0)) return;

        addOns.push({
          id: option._id,
          name: option.name,
          // Per item, as the server reads it.
          quantity: qty,
          price: Number(option.price),
          parentGroupId: group._id,
        });
      });
    });

    /*
     * (unit + Σ option × option qty) × line qty — the extras used to be counted
     * once per line, so three pizzas with extra cheese were sent (and charged)
     * with one portion of cheese.
     */
    const totalPrice = cartLineTotal(item);

    return {
      id: product._id,
      uid: product._id,
      name: product.name,
      quantity,
      currentPrice: product.currentPrice,
      // A product has one price now; the order line keeps these fields because
      // a voucher can still discount the order, and the server reprices
      // authoritatively on submit.
      originalPrice: product.currentPrice,
      discount: 0,
      discountType: 'fixed',
      totalPrice,
      addOns,
      // The order line records the variant, which is what HubRise keys on.
      skuRef: product.skuRef,
      skuName: product.skuName ?? null,
      images: product.images ?? [],
      /*
       * Left out for a product without a photo: `''` was refused by the
       * order validator (`image` was a required non-empty string), so such a
       * product could not be ordered at all. Server 0051 takes it as optional
       * and reads the picture from the product anyway.
       */
      ...(product.images?.[0] ? { image: product.images[0] } : {}),
      note: notes || '',
    };
  });
}

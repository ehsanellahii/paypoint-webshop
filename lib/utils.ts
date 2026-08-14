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
  return 'https://paypoint-web-storage.s3.eu-central-1.amazonaws.com/menu/' + encodedKey;
};

type FormattedAddOn = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  parentGroupId: string;
};

export function formatCartItemsForOrder(cart: any[]) {
  return cart.map((item) => {
    const { product, quantity, customizations, notes } = item;

    const addOns: FormattedAddOn[] = [];

    let addOnsTotal = 0;

    // Loop through customization groups
    Object.entries(customizations || {}).forEach(([groupId, optionsMap]: any) => {
      const group = product.addOns.find((g: any) => g._id === groupId);

      if (!group) return;

      Object.entries(optionsMap).forEach(([optionId, optionQty]: any) => {
        const option = group.options.find((o: any) => o._id === optionId);

        if (!option) return;

        addOns.push({
          id: option._id,
          name: option.name,
          quantity: optionQty,
          price: Number(option.price),
          parentGroupId: group._id,
        });

        addOnsTotal += option.price * optionQty;
      });
    });

    const basePrice = product.currentPrice * quantity;
    const totalPrice = Number((basePrice + addOnsTotal).toFixed(2));

    return {
      id: product._id,
      uid: product._id,
      name: product.name,
      quantity,
      currentPrice: product.currentPrice,
      originalPrice: product.originalPrice,
      discount: product.discount ?? 0,
      discountType: product.discountType ?? 'fixed',
      totalPrice,
      addOns,
      images: product.images ?? [],
      image: product.images?.[0] ?? '',
      note: notes || '',
    };
  });
}

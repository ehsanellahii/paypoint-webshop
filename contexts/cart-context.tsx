'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, startTransition } from 'react';
import { MenuProduct, getImageURL } from '../lib/utils';

/** Fired whenever an item is added to the cart, so the toast/animation layer can react globally. */
export type CartAddedDetail = { name: string; image: string };

/**
 * Add-on quantities:
 * sectionId -> { optionId -> qty }
 */
export type CartItemCustomization = Record<string, Record<string, number>>;

export interface CartItem {
  id: string;
  product: MenuProduct;
  quantity: number;
  customizations: CartItemCustomization;
  notes?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: MenuProduct, quantity: number, customizations: CartItemCustomization, notes?: string) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  /** Removes lines whose product is no longer available; returns removed count. */
  pruneUnavailable: (validProductIds: string[]) => number;
  totalItems: number;
  totalPrice: number;
  discountAmount: number;
  appliedVoucher: AppliedVoucher | null;
  applyVoucher: (payload: VoucherApplyResponse) => void;
  removeVoucher: () => void;
}

export type AppliedVoucher = {
  voucherId: string;
  code: string;
  title?: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderValue?: number;
  maximumDiscountValue?: number;
  validUntil?: string;
};

type VoucherApplyResponse = {
  voucher: AppliedVoucher;
  discountAmount: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * Cart storage is scoped per store. A single global key let a cart from store A
 * survive into store B, so checkout would send store B's adminId alongside
 * store A's product ids — which the server rejects with "Invalid product".
 */
const getCartStorageKey = (storeKey: string) => `pos-cart:${storeKey || 'default'}`;

const getStoredCart = (storageKey: string): CartItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? (JSON.parse(stored) as CartItem[]) : [];
  } catch (error) {
    console.error('Failed to load cart from localStorage:', error);
    return [];
  }
};

const saveCart = (storageKey: string, cart: CartItem[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(cart));
  } catch (error) {
    console.error('Failed to save cart to localStorage:', error);
  }
};

/**
 * Deterministic stringify so the same customizations always create the same item id.
 * Sort sectionIds and optionIds.
 */
const stableStringifyCustomizations = (c: CartItemCustomization) => {
  const sectionIds = Object.keys(c || {}).sort();
  const normalized: Record<string, Record<string, number>> = {};

  for (const sid of sectionIds) {
    const group = c[sid] || {};
    const optionIds = Object.keys(group).sort();
    normalized[sid] = {};
    for (const oid of optionIds) {
      const qty = Number(group[oid] ?? 0);
      if (qty > 0) normalized[sid][oid] = qty; // keep only positive
    }
    // remove empty groups
    if (Object.keys(normalized[sid]).length === 0) {
      delete normalized[sid];
    }
  }

  return JSON.stringify(normalized);
};

export function CartProvider({ children, storeKey = 'default' }: { children: ReactNode; storeKey?: string }) {
  const storageKey = getCartStorageKey(storeKey);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    const storedCart = getStoredCart(storageKey);
    startTransition(() => {
      setCart(storedCart);
      setIsHydrated(true);
    });
  }, [storageKey]);

  useEffect(() => {
    if (isHydrated) saveCart(storageKey, cart);
  }, [cart, isHydrated, storageKey]);

  const addToCart = useCallback((product: MenuProduct, quantity: number, customizations: CartItemCustomization, notes?: string) => {
    const safeQty = Math.max(1, Math.floor(quantity || 1));

    const normalizedKey = stableStringifyCustomizations(customizations || {});
    const itemId = `${product.id}-${normalizedKey}`;

    if (typeof window !== 'undefined') {
      const image = product.images?.length ? getImageURL(product.images[0]) : '';
      window.dispatchEvent(new CustomEvent<CartAddedDetail>('cart:added', { detail: { name: product.name, image } }));
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === itemId);

      if (existingItem) {
        return prevCart.map((item) => (item.id === itemId ? { ...item, quantity: item.quantity + safeQty } : item));
      }

      return [
        ...prevCart,
        {
          id: itemId,
          product,
          quantity: safeQty,
          customizations: customizations || {},
          notes,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      const safeQty = Math.floor(quantity || 0);
      if (safeQty <= 0) {
        removeFromCart(itemId);
        return;
      }
      setCart((prevCart) => prevCart.map((item) => (item.id === itemId ? { ...item, quantity: safeQty } : item)));
    },
    [removeFromCart]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedVoucher(null);
    setDiscountAmount(0);
  }, []);

  /**
   * Drop cart lines whose product is no longer offered by this store (removed,
   * deactivated, or left over from another store). Without this the server
   * rejects the whole order with "Invalid product" at checkout.
   * Returns the number of removed lines.
   */
  const pruneUnavailable = useCallback((validProductIds: string[]): number => {
    const valid = new Set(validProductIds.map(String));
    let removed = 0;

    setCart((prevCart) => {
      const next = prevCart.filter((item) => valid.has(String(item.product.id ?? item.product._id)));
      removed = prevCart.length - next.length;
      return removed > 0 ? next : prevCart;
    });

    return removed;
  }, []);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const totalPrice = cart.reduce((sum, item) => {
    const basePrice = item.product.currentPrice;

    let customizationPrice = 0;

    Object.entries(item.customizations || {}).forEach(([sectionId, group]) => {
      const section = item.product.addOns?.find((s) => s._id === sectionId);
      if (!section) return;

      Object.entries(group || {}).forEach(([optionId, qty]) => {
        const q = Number(qty ?? 0);
        if (q <= 0) return;

        const sectionItem = section.options?.find((i) => i._id === optionId);
        if (!sectionItem) return;

        customizationPrice += sectionItem.price * q;
      });
    });

    return sum + (basePrice + customizationPrice) * item.quantity;
  }, 0);

  const applyVoucher = useCallback((payload: VoucherApplyResponse) => {
    const safeDiscount = Math.max(0, Number(payload.discountAmount ?? 0));
    setAppliedVoucher(payload.voucher);
    setDiscountAmount(safeDiscount);
  }, []);

  const removeVoucher = useCallback(() => {
    setAppliedVoucher(null);
    setDiscountAmount(0);
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        pruneUnavailable,
        totalItems,
        totalPrice,
        appliedVoucher,
        discountAmount,
        applyVoucher,
        removeVoucher,
      }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

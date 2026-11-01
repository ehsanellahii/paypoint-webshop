'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, startTransition, useRef } from 'react';
import { IMenuData, MenuCategory, MenuProduct, MenuSku, cartSubtotal, getImageURL } from '../lib/utils';
import { cartLineId, lineProduct, normalizeCustomizations, normalizeNote, reconcileCartLines } from '~/lib/cartReconcile';
import { voucherDiscount, type AppliedVoucher } from '~/lib/voucher';

export type { AppliedVoucher };

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

export type ReconcileSummary = { removed: number; updated: number };

/** What `reconcile` accepts: the products, the categories, or the `/menu` answer as it comes. */
export type ReconcileMenu = MenuProduct[] | MenuCategory[] | IMenuData | null | undefined;

export const menuProducts = (menu: ReconcileMenu): MenuProduct[] => {
  const list: unknown[] = Array.isArray(menu) ? menu : Array.isArray((menu as IMenuData | null)?.data) ? (menu as IMenuData).data : [];
  return list.flatMap((x) => (x && Array.isArray((x as MenuCategory).products) ? (x as MenuCategory).products : [x as MenuProduct])).filter(Boolean);
};

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: MenuProduct, quantity: number, customizations: CartItemCustomization, notes?: string, sku?: MenuSku) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  /**
   * Check every line against a freshly loaded menu — the `/menu` answer, its
   * categories or a flat product list, priced for the current order type:
   * prices, sizes and options are taken from the menu, lines that can no
   * longer be sold are dropped. Call it after every menu load. Returns what
   * it did; synchronous, so a caller can tell the guest.
   */
  reconcile: (menu: ReconcileMenu) => ReconcileSummary;
  /** Same function under the name used in shop-time's `hooks/useMenu.ts`. */
  reconcileCart: (menu: ReconcileMenu) => ReconcileSummary;
  /**
   * The last reconcile that took lines out of the cart, until the guest
   * dismisses it — what drives "Einige Artikel sind nicht mehr verfügbar …".
   * Kept here rather than by the menu screen, because the reconcile that
   * removes them may run anywhere (the menu load, the checkout, the stored
   * cart being read), and the checkout's own then sends the guest back to an
   * empty menu that has to say why.
   */
  lastReconcile: ReconcileSummary | null;
  dismissReconcileNotice: () => void;
  /** False until the stored cart has been read — an empty `cart` before that means nothing. */
  isHydrated: boolean;
  totalItems: number;
  /** Food subtotal, extras included. */
  totalPrice: number;
  /** The applied voucher's discount on the current basket (0 below its minimum). */
  discountAmount: number;
  appliedVoucher: AppliedVoucher | null;
  /** A voucher is held but the basket is below its minimum, so it is worth nothing yet. */
  voucherBelowMinimum: boolean;
  /** The refusal code that last removed the voucher (e.g. it expired); shown in the voucher error slot. */
  voucherNotice: string | null;
  applyVoucher: (voucher: AppliedVoucher) => void;
  removeVoucher: (notice?: string | null) => void;
  clearVoucherNotice: () => void;
  /** Free-text note for the whole order — written in the cart, sent from checkout. */
  orderMessage: string;
  setOrderMessage: (v: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * Cart storage is scoped per store. A single global key let a cart from store A
 * survive into store B, so checkout would send store B's adminId alongside
 * store A's product ids — which the server rejects with "Invalid product".
 */
const getCartStorageKey = (storeKey: string) => `pos-cart:${storeKey || 'default'}`;

/*
 * The order message lives in its own key rather than inside the cart payload,
 * which is a bare CartItem[] — wrapping it in an object would invalidate every
 * stored cart for the sake of one string.
 */
const getMessageStorageKey = (storeKey: string) => `pos-order-message:${storeKey || 'default'}`;

/** The applied voucher travels with the cart, so a reload keeps it. */
const getVoucherStorageKey = (storeKey: string) => `pos-voucher:${storeKey || 'default'}`;

const readJSON = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — the cart lives for this page only */
  }
};

const isCartItem = (x: any): x is CartItem => !!x && typeof x === 'object' && typeof x.id === 'string' && !!x.product && Number(x.quantity) > 0;
const isVoucher = (x: any): x is AppliedVoucher => !!x && typeof x === 'object' && (typeof x.code === 'string' || typeof x.voucherId === 'string');

export function CartProvider({ children, storeKey = 'default' }: { children: ReactNode; storeKey?: string }) {
  const storageKey = getCartStorageKey(storeKey);
  const messageKey = getMessageStorageKey(storeKey);
  const voucherKey = getVoucherStorageKey(storeKey);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderMessage, setOrderMessageState] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null);
  const [voucherNotice, setVoucherNotice] = useState<string | null>(null);
  const [lastReconcile, setLastReconcile] = useState<ReconcileSummary | null>(null);

  /*
   * The cart as of the last change, readable synchronously. Every mutation
   * goes through `commit`, so callers like `reconcile` can report what they
   * did — a `setState` updater runs later, and the old `pruneUnavailable`
   * always answered 0 because of it.
   */
  const cartRef = useRef<CartItem[]>([]);
  const hydratedRef = useRef(false);
  /** A menu that arrived before the stored cart was read; applied on hydration. */
  const pendingMenuRef = useRef<MenuProduct[] | null>(null);

  const commit = useCallback((next: CartItem[]) => {
    cartRef.current = next;
    setCart(next);
  }, []);

  useEffect(() => {
    let storedCart = readJSON<unknown[]>(storageKey, []);
    storedCart = Array.isArray(storedCart) ? storedCart.filter(isCartItem) : [];
    let removedOnLoad: ReconcileSummary | null = null;
    if (pendingMenuRef.current) {
      const result = reconcileCartLines(storedCart as CartItem[], pendingMenuRef.current);
      storedCart = result.cart;
      if (result.removed > 0) removedOnLoad = { removed: result.removed, updated: result.updated };
    }
    const storedVoucher = readJSON<unknown>(voucherKey, null);
    let storedMessage = '';
    try {
      storedMessage = localStorage.getItem(messageKey) ?? '';
    } catch {
      /* storage unavailable — the message is not worth failing over */
    }
    cartRef.current = storedCart as CartItem[];
    hydratedRef.current = true;
    startTransition(() => {
      setCart(storedCart as CartItem[]);
      setAppliedVoucher(isVoucher(storedVoucher) ? storedVoucher : null);
      setOrderMessageState(storedMessage);
      if (removedOnLoad) setLastReconcile(removedOnLoad);
      setIsHydrated(true);
    });
  }, [storageKey, messageKey, voucherKey]);

  const setOrderMessage = useCallback(
    (v: string) => {
      setOrderMessageState(v);
      try {
        if (v) localStorage.setItem(messageKey, v);
        else localStorage.removeItem(messageKey);
      } catch {
        /* storage unavailable */
      }
    },
    [messageKey]
  );

  useEffect(() => {
    if (isHydrated) writeJSON(storageKey, cart);
  }, [cart, isHydrated, storageKey]);

  useEffect(() => {
    if (isHydrated) writeJSON(voucherKey, appliedVoucher);
  }, [appliedVoucher, isHydrated, voucherKey]);

  const addToCart = useCallback(
    (product: MenuProduct, quantity: number, customizations: CartItemCustomization, notes?: string, sku?: MenuSku) => {
      const safeQty = Math.max(1, Math.floor(quantity || 1));

      /*
       * The line carries the variant's own price and name, so every total,
       * receipt and checkout row downstream reads the right figure without
       * knowing SKUs exist. A product with exactly one variant is sold in it,
       * so its line records that variant like any other.
       */
      const chosenSku = sku ?? ((product.skus ?? []).length === 1 ? product.skus![0] : undefined);
      const clean = normalizeCustomizations(customizations);
      const note = normalizeNote(notes);
      // Two sizes, two option sets or two notes of one product are two lines.
      const itemId = cartLineId(String(product.id ?? product._id), chosenSku?._id, clean, note);

      if (typeof window !== 'undefined') {
        const image = product.images?.length ? getImageURL(product.images[0]) : '';
        window.dispatchEvent(new CustomEvent<CartAddedDetail>('cart:added', { detail: { name: product.name, image } }));
      }

      const prev = cartRef.current;
      const existing = prev.find((item) => item.id === itemId);
      commit(
        existing
          ? prev.map((item) => (item.id === itemId ? { ...item, quantity: item.quantity + safeQty } : item))
          : [...prev, { id: itemId, product: lineProduct(product, chosenSku), quantity: safeQty, customizations: clean, notes: note }]
      );
    },
    [commit]
  );

  const removeFromCart = useCallback(
    (itemId: string) => {
      commit(cartRef.current.filter((item) => item.id !== itemId));
    },
    [commit]
  );

  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      const safeQty = Math.floor(quantity || 0);
      if (safeQty <= 0) {
        removeFromCart(itemId);
        return;
      }
      commit(cartRef.current.map((item) => (item.id === itemId ? { ...item, quantity: safeQty } : item)));
    },
    [commit, removeFromCart]
  );

  const clearCart = useCallback(() => {
    commit([]);
    setAppliedVoucher(null);
    setVoucherNotice(null);
    setOrderMessageState('');
    try {
      localStorage.removeItem(messageKey);
      localStorage.removeItem(voucherKey);
    } catch {
      /* storage unavailable */
    }
  }, [commit, messageKey, voucherKey]);

  const reconcile = useCallback(
    (menu: ReconcileMenu): ReconcileSummary => {
      const products = menuProducts(menu);
      // An empty or failed menu proves nothing about the cart.
      if (products.length === 0) return { removed: 0, updated: 0 };
      if (!hydratedRef.current) {
        // The stored cart is not read yet; it is checked against this menu as it loads.
        pendingMenuRef.current = products;
        return { removed: 0, updated: 0 };
      }
      pendingMenuRef.current = null;
      const result = reconcileCartLines(cartRef.current, products);
      if (result.cart !== cartRef.current) commit(result.cart);
      const summary = { removed: result.removed, updated: result.updated };
      if (summary.removed > 0) setLastReconcile(summary);
      return summary;
    },
    [commit]
  );

  const dismissReconcileNotice = useCallback(() => setLastReconcile(null), []);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  // Summed in cents, extras included — see `cartLineTotal`.
  const totalPrice = cartSubtotal(cart);

  /*
   * The discount is derived, not stored: it follows the basket. The server's
   * quote is used while the basket is the one it priced (its rounding is the
   * one the order is charged with); otherwise the same rules are applied here.
   */
  const { discount: discountAmount, belowMinimum: voucherBelowMinimum } = voucherDiscount(appliedVoucher, totalPrice);

  const applyVoucher = useCallback((voucher: AppliedVoucher) => {
    setAppliedVoucher(voucher);
    setVoucherNotice(null);
  }, []);

  const removeVoucher = useCallback((notice?: string | null) => {
    setAppliedVoucher(null);
    setVoucherNotice(notice ?? null);
  }, []);

  const clearVoucherNotice = useCallback(() => setVoucherNotice(null), []);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        reconcile,
        reconcileCart: reconcile,
        lastReconcile,
        dismissReconcileNotice,
        isHydrated,
        totalItems,
        totalPrice,
        appliedVoucher,
        discountAmount,
        voucherBelowMinimum,
        voucherNotice,
        applyVoucher,
        removeVoucher,
        clearVoucherNotice,
        orderMessage,
        setOrderMessage,
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

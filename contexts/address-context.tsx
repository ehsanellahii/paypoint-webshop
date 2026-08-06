'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode, startTransition, useCallback } from 'react';

export type OrderType = 'pickup' | 'delivery' | 'dineIn';

export type DeliveryAddress = {
  formattedAddress: string;
  placeId: string;
  lat: number;
  lng: number;

  streetNumber?: string;
  route?: string;
  postalCode?: string;

  locality?: string;
  adminArea?: string;
  country?: string;
};

type AddressState = {
  orderType: OrderType;
  deliveryAddress: DeliveryAddress | null;
};

interface AddressContextType {
  orderType: OrderType;
  setOrderType: (t: OrderType) => void;

  deliveryAddress: DeliveryAddress | null;
  setDeliveryAddress: (a: DeliveryAddress | null) => void;

  clearAddress: () => void;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

// Helpers
const getStorageKey = (storeKey: string) => `pos-address:${storeKey}`;

const getStoredState = (storageKey: string): AddressState => {
  if (typeof window === 'undefined') return { orderType: 'pickup', deliveryAddress: null };

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) return JSON.parse(stored) as AddressState;
  } catch (error) {
    console.error('Failed to load address from localStorage:', error);
  }

  return { orderType: 'pickup', deliveryAddress: null };
};

const saveState = (storageKey: string, state: AddressState) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save address to localStorage:', error);
  }
};

/**
 * AddressProvider
 * storeKey should be something stable per store/tenant (slug is best)
 *
 * Example:
 * <AddressProvider storeKey={storeInfo.storeName || slug}>
 *   <CartProvider>...</CartProvider>
 * </AddressProvider>
 */
export function AddressProvider({ children, storeKey }: { children: ReactNode; storeKey: string }) {
  const storageKey = useMemo(() => getStorageKey(storeKey || 'default'), [storeKey]);

  const [orderType, setOrderTypeState] = useState<OrderType>('pickup');
  const [deliveryAddress, setDeliveryAddressState] = useState<DeliveryAddress | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = getStoredState(storageKey);
    startTransition(() => {
      setOrderTypeState(stored.orderType ?? 'pickup');
      setDeliveryAddressState(stored.deliveryAddress ?? null);
      setIsHydrated(true);
    });
  }, [storageKey]);

  useEffect(() => {
    if (!isHydrated) return;
    saveState(storageKey, { orderType, deliveryAddress });
  }, [orderType, deliveryAddress, isHydrated, storageKey]);

  const setOrderType = useCallback((t: OrderType) => {
    setOrderTypeState(t);

    // Helpful default behavior:
    // if user switches away from delivery, clear delivery address (optional)
    // if (t !== 'delivery') {
    //   setDeliveryAddressState(null);
    // }
  }, []);

  const setDeliveryAddress = useCallback((a: DeliveryAddress | null) => {
    setDeliveryAddressState(a);

    // If an address is set, ensure order type is delivery
    if (a) setOrderTypeState('delivery');
  }, []);

  const clearAddress = useCallback(() => {
    setOrderTypeState('pickup');
    setDeliveryAddressState(null);
  }, []);

  return (
    <AddressContext.Provider
      value={{
        orderType,
        setOrderType,
        deliveryAddress,
        setDeliveryAddress,
        clearAddress,
      }}>
      {children}
    </AddressContext.Provider>
  );
}

export function useAddress() {
  const context = useContext(AddressContext);
  if (!context) {
    throw new Error('useAddress must be used within AddressProvider');
  }
  return context;
}

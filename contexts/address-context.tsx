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

/** A delivery address the customer chose to keep, optionally tagged "Home"/"Work". */
export type SavedAddress = DeliveryAddress & { id: string; label?: string };

type AddressState = {
  orderType: OrderType;
  deliveryAddress: DeliveryAddress | null;
  savedAddresses?: SavedAddress[];
};

interface AddressContextType {
  orderType: OrderType;
  setOrderType: (t: OrderType) => void;

  deliveryAddress: DeliveryAddress | null;
  setDeliveryAddress: (a: DeliveryAddress | null) => void;

  savedAddresses: SavedAddress[];
  saveAddress: (a: DeliveryAddress, label?: string) => SavedAddress;
  removeSavedAddress: (id: string) => void;

  clearAddress: () => void;
}

/**
 * Google's place id is the natural key — the same building always resolves to
 * the same id, so re-adding an address updates the existing entry instead of
 * filling the list with duplicates. Manually entered addresses without a place
 * id fall back to their formatted string.
 */
const addressId = (a: DeliveryAddress) => a.placeId || a.formattedAddress;

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
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = getStoredState(storageKey);
    startTransition(() => {
      setOrderTypeState(stored.orderType ?? 'pickup');
      setDeliveryAddressState(stored.deliveryAddress ?? null);
      setSavedAddresses(stored.savedAddresses ?? []);
      setIsHydrated(true);
    });
  }, [storageKey]);

  useEffect(() => {
    if (!isHydrated) return;
    saveState(storageKey, { orderType, deliveryAddress, savedAddresses });
  }, [orderType, deliveryAddress, savedAddresses, isHydrated, storageKey]);

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

  const saveAddress = useCallback((a: DeliveryAddress, label?: string) => {
    const entry: SavedAddress = { ...a, id: addressId(a), label };
    setSavedAddresses((prev) => [entry, ...prev.filter((x) => x.id !== entry.id)]);
    return entry;
  }, []);

  const removeSavedAddress = useCallback((id: string) => {
    setSavedAddresses((prev) => prev.filter((x) => x.id !== id));
    // Deleting the address that is currently in use would otherwise leave the
    // header and checkout pointing at an entry the customer just removed.
    setDeliveryAddressState((current) => (current && addressId(current) === id ? null : current));
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
        savedAddresses,
        saveAddress,
        removeSavedAddress,
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

'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode, startTransition, useCallback } from 'react';
import { isGermanAddress } from '~/lib/addressSearch';
import { checkDeliveryZone, type DeliveryZone } from '~/lib/api';
import {
  EMPTY_RATE,
  resolveDeliveryRate,
  zoneMatches,
  type DeliveryRate,
  type DeliveryZoneAnswer,
  type DeliveryZoneStatus,
} from '~/lib/deliveryZone';
import { clampOrderType, type OrderType } from '~/lib/orderType';
import type { IStoreInfo } from '~/lib/types';

export type { OrderType };
export { clampOrderType };

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
  /** Google's long name, in the browser's language ("Deutschland", "Germany"). */
  country?: string;
  /** Two-letter code ("DE"). Missing on addresses saved before 1 Nov 2026. */
  countryCode?: string;
};

/** A delivery address the customer chose to keep, optionally tagged "Home"/"Work". */
export type SavedAddress = DeliveryAddress & { id: string; label?: string };

type AddressState = {
  orderType: OrderType;
  deliveryAddress: DeliveryAddress | null;
  savedAddresses?: SavedAddress[];
  /** The server's zone answer for `deliveryAddress`. Absent before 1 Nov 2026. */
  deliveryZone?: DeliveryZoneAnswer | null;
};

interface AddressContextType {
  /**
   * How this order is placed. Inside a store page this is already checked
   * against the store: a type the store has switched off is never returned,
   * and `dineIn` only with a valid table.
   */
  orderType: OrderType;
  setOrderType: (t: OrderType) => void;

  deliveryAddress: DeliveryAddress | null;
  setDeliveryAddress: (a: DeliveryAddress | null) => void;

  savedAddresses: SavedAddress[];
  saveAddress: (a: DeliveryAddress, label?: string) => SavedAddress;
  removeSavedAddress: (id: string) => void;

  clearAddress: () => void;

  /** The stored choices have been read. Before that `orderType` is only a default. */
  hydrated: boolean;

  /** The server's delivery-zone answer for the active address, when there is one. */
  deliveryZone: DeliveryZoneAnswer | null;
  deliveryZoneStatus: DeliveryZoneStatus;
  /**
   * Keep a zone answer the caller already has for this postcode — the zone
   * gate and the address dialog ask before the address is chosen, so the
   * address does not have to be asked about twice.
   */
  rememberDeliveryZone: (postalCode: string, zone: DeliveryZone) => void;
  /**
   * Availability, minimum order, fee and ETA for the active address: the
   * server's answer, or the store's rate table while the server cannot be
   * reached. Read this instead of `getPostalRateInfo`.
   */
  deliveryRate: DeliveryRate;
}

/**
 * Google's place id is the natural key — the same building always resolves to
 * the same id, so re-adding an address updates the existing entry instead of
 * filling the list with duplicates. Manually entered addresses without a place
 * id fall back to their formatted string.
 */
const addressId = (a: DeliveryAddress) => a.placeId || a.formattedAddress;

const postalOf = (a: DeliveryAddress | null | undefined) => (a?.postalCode ?? '').trim();

const AddressContext = createContext<AddressContextType | undefined>(undefined);

/** Internal: lets a store page ask for the zone of the active address. */
type ZoneRequester = (store: { adminId: string; storeId: string; apiKey: string }, postalCode: string, background: boolean) => void;
const ZoneRequestContext = createContext<ZoneRequester | null>(null);

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

const ORDER_TYPES: OrderType[] = ['pickup', 'delivery', 'dineIn'];

/** The zone answer, how asking for it went, and the postcode both are about. */
type ZoneState = { zone: DeliveryZoneAnswer | null; status: DeliveryZoneStatus; forPostal: string };
const NO_ZONE: ZoneState = { zone: null, status: 'none', forPostal: '' };

/**
 * AddressProvider
 * storeKey should be something stable per store/tenant (slug is best)
 *
 * Example:
 * <AddressProvider storeKey={slug}>
 *   <CartProvider>...</CartProvider>
 * </AddressProvider>
 */
export function AddressProvider({ children, storeKey }: { children: ReactNode; storeKey: string }) {
  const storageKey = useMemo(() => getStorageKey(storeKey || 'default'), [storeKey]);

  // The guest's own choice. Store pages narrow it to what the store offers.
  const [orderType, setOrderTypeState] = useState<OrderType>('pickup');
  const [deliveryAddress, setDeliveryAddressState] = useState<DeliveryAddress | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  /*
   * The zone answer and the state of asking for it change together — a new
   * address clears both at once — so they are one piece of state.
   */
  const [zoneState, setZoneState] = useState<ZoneState>(NO_ZONE);
  const deliveryZone = zoneState.zone;
  const zoneStatus = zoneState.status;
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = getStoredState(storageKey);
    /*
     * The shop delivers in Germany only. Before 1 Nov 2026 the address search
     * also offered foreign addresses, and one picked then would still be loaded
     * here — and checkout only compares postcodes, where a US ZIP like 10115
     * looks like Berlin. So foreign entries are dropped on load.
     */
    const active = stored.deliveryAddress && isGermanAddress(stored.deliveryAddress) ? stored.deliveryAddress : null;
    const book = Array.isArray(stored.savedAddresses) ? stored.savedAddresses.filter((a) => isGermanAddress(a)) : [];
    // Only an answer for the address it was asked about is worth keeping.
    const zone = active && zoneMatches(stored.deliveryZone, postalOf(active)) ? stored.deliveryZone! : null;
    const type = ORDER_TYPES.includes(stored.orderType) ? stored.orderType : 'pickup';
    startTransition(() => {
      setOrderTypeState(type);
      setDeliveryAddressState(active);
      setSavedAddresses(book);
      setZoneState(zone ? { zone, status: 'ok', forPostal: postalOf(active) } : NO_ZONE);
      setIsHydrated(true);
    });
  }, [storageKey]);

  useEffect(() => {
    if (!isHydrated) return;
    saveState(storageKey, { orderType, deliveryAddress, savedAddresses, deliveryZone });
  }, [orderType, deliveryAddress, savedAddresses, deliveryZone, isHydrated, storageKey]);

  /*
   * The postcode the zone answer has to match. A ref as well as state, so an
   * answer that comes back after the guest has moved on to another address is
   * recognised as stale and dropped.
   */
  const activePostal = useRef('');
  useEffect(() => {
    activePostal.current = postalOf(deliveryAddress);
  }, [deliveryAddress]);

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
    activePostal.current = postalOf(a);
    // A zone answer only stands for the postcode it was asked about; another
    // postcode starts over, so the store page asks again.
    setZoneState((prev) => (a && prev.forPostal === postalOf(a) ? prev : NO_ZONE));

    // If an address is set, ensure order type is delivery
    if (a) setOrderTypeState('delivery');
  }, []);

  const rememberDeliveryZone = useCallback((postalCode: string, zone: DeliveryZone) => {
    if (!zone || !postalCode.trim()) return;
    const postal = postalCode.trim();
    setZoneState({ zone: { ...zone, requestedPostalCode: postal, checkedAt: Date.now() }, status: 'ok', forPostal: postal });
  }, []);

  /*
   * One lookup at a time per postcode, whichever screen asked. `refreshed`
   * remembers what this page load has already confirmed, so an answer carried
   * over from an earlier visit is re-checked once, quietly, and not again on
   * every screen.
   */
  const inflight = useRef<string | null>(null);
  const refreshed = useRef<Set<string>>(new Set());
  const requestZone = useCallback<ZoneRequester>((store, postalCode, background) => {
    const key = `${store.storeId}:${postalCode}`;
    if (inflight.current === key) return;
    if (background && refreshed.current.has(key)) return;
    inflight.current = key;
    refreshed.current.add(key);
    if (!background) setZoneState((prev) => ({ zone: prev.forPostal === postalCode ? prev.zone : null, status: 'pending', forPostal: postalCode }));

    checkDeliveryZone(store.adminId, store.storeId, store.apiKey, postalCode)
      .then((zone) => {
        if (activePostal.current !== postalCode || !zone) return;
        setZoneState({ zone: { ...zone, requestedPostalCode: postalCode, checkedAt: Date.now() }, status: 'ok', forPostal: postalCode });
      })
      .catch((error) => {
        if (activePostal.current !== postalCode) return;
        /*
         * Not a refusal: the screens fall back to the store's own rate table,
         * which never refuses a store without zones. A background re-check
         * that fails keeps the answer already held.
         */
        console.error('[delivery zone] lookup failed, using the local rate table', error);
        refreshed.current.delete(key);
        if (!background) setZoneState((prev) => ({ zone: prev.forPostal === postalCode ? prev.zone : null, status: 'error', forPostal: postalCode }));
      })
      .finally(() => {
        if (inflight.current === key) inflight.current = null;
      });
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
    setZoneState(NO_ZONE);
  }, []);

  // Outside a store page there is no rate table; the server's answer alone.
  const deliveryRate = useMemo(
    () =>
      resolveDeliveryRate({
        postalCode: postalOf(deliveryAddress),
        isGerman: isGermanAddress(deliveryAddress),
        zone: deliveryZone,
        status: zoneStatus,
        postalRates: null,
      }),
    [deliveryAddress, deliveryZone, zoneStatus],
  );

  const value = useMemo<AddressContextType>(
    () => ({
      orderType,
      setOrderType,
      deliveryAddress,
      setDeliveryAddress,
      savedAddresses,
      saveAddress,
      removeSavedAddress,
      clearAddress,
      hydrated: isHydrated,
      deliveryZone,
      deliveryZoneStatus: zoneStatus,
      rememberDeliveryZone,
      deliveryRate: deliveryAddress ? deliveryRate : EMPTY_RATE,
    }),
    [orderType, setOrderType, deliveryAddress, setDeliveryAddress, savedAddresses, saveAddress, removeSavedAddress, clearAddress, isHydrated, deliveryZone, zoneStatus, rememberDeliveryZone, deliveryRate],
  );

  return (
    <ZoneRequestContext.Provider value={requestZone}>
      <AddressContext.Provider value={value}>{children}</AddressContext.Provider>
    </ZoneRequestContext.Provider>
  );
}

/**
 * The address context as a store page sees it: the order type narrowed to
 * what this store takes, and the delivery terms for the active address taken
 * from the server — asked for here when they are missing or for another
 * address.
 *
 * Rendered by `StoreProvider`, because the address provider sits in the
 * layout, above the page that knows which store it is.
 */
export function StoreAddressScope({ store, children }: { store: IStoreInfo | null; children: ReactNode }) {
  const outer = useContext(AddressContext);
  const requestZone = useContext(ZoneRequestContext);

  const hasTable = !!store?.tableInfo?.token;
  const rules = store?.settings?.orderTypes;
  const deliveryOffered = !hasTable && (rules?.delivery ?? false);

  const orderType = outer ? clampOrderType(outer.orderType, rules, hasTable) : 'pickup';
  const address = outer?.deliveryAddress ?? null;
  const postal = postalOf(address);
  const zone = outer?.deliveryZone ?? null;
  const status = outer?.deliveryZoneStatus ?? 'none';
  const hydrated = !!outer?.hydrated;
  const haveAnswer = zoneMatches(zone, postal);

  const adminId = store?.adminId ?? '';
  const storeId = store?.storeId ?? '';
  const apiKey = store?.apiKey ?? '';

  // Ask when the address changes, or after a reload when no answer is held;
  // an answer carried over from an earlier visit is re-checked quietly.
  useEffect(() => {
    if (!hydrated || !requestZone || !deliveryOffered || !storeId || !postal) return;
    if (!isGermanAddress(address)) return;
    if (haveAnswer) requestZone({ adminId, storeId, apiKey }, postal, true);
    else if (status !== 'error' && status !== 'pending') requestZone({ adminId, storeId, apiKey }, postal, false);
  }, [hydrated, requestZone, deliveryOffered, adminId, storeId, apiKey, postal, address, haveAnswer, status]);

  const deliveryRate = useMemo(
    () =>
      address
        ? resolveDeliveryRate({
            postalCode: postal,
            isGerman: isGermanAddress(address),
            zone,
            // No lookup is coming before hydration or without delivery; the
            // table is the answer then, not a pending one.
            status: deliveryOffered && hydrated ? status : 'error',
            postalRates: store?.postalRates,
          })
        : EMPTY_RATE,
    [address, postal, zone, status, deliveryOffered, hydrated, store?.postalRates],
  );

  const value = useMemo<AddressContextType | undefined>(
    () => (outer ? { ...outer, orderType, deliveryRate } : undefined),
    [outer, orderType, deliveryRate],
  );

  if (!outer) return <>{children}</>;
  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddress() {
  const context = useContext(AddressContext);
  if (!context) {
    throw new Error('useAddress must be used within AddressProvider');
  }
  return context;
}

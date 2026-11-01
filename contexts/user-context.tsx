'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from '~/contexts/store-context';
import { clearFavorites } from '~/lib/favorites';
import { clearPlacedOrder } from '~/lib/lastOrder';

export type Voucher = {
  id?: string; // backend "id"
  uniqueId?: string; // backend "_id" mapped if needed
  title?: string;
  description?: string;
  code?: string;
  discountType?: string;
  discountCode?: string;
  minimumOrderValue?: number;
  maximumDiscountValue?: number;
  validFrom?: string; // ISO string (recommended)
  validUntil?: string; // ISO string
  status?: string;
  discountValue?: number;
};

/**
 * The signed-in customer, as the shop keeps it.
 *
 * Only what the screens need and the token that proves it is theirs. The
 * session used to be whatever the server sent — Stripe customer id, push
 * tokens, promo codes, the voucher wallet — written to localStorage as is.
 */
export type User = {
  _id: string;
  name: string;
  phoneNumber?: string;
  emailAddress?: string;
  isVerified?: boolean;
  /** The JWT from `/user/login`. Every customer route needs it (server 0051). */
  authToken?: string;
  /** Same as `emailAddress`; derived for the screens that read `email`, never stored. */
  email?: string;

  /*
   * No longer stored — declared so older screens still type-check. They are
   * always undefined now.
   */
  id?: string;
  isGuest?: boolean;
  points?: number;
  vouchers?: Voucher[];
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
};

/** The fields a session may hold — nothing else reaches storage. */
export type StoredUser = Pick<User, '_id' | 'name' | 'phoneNumber' | 'emailAddress' | 'isVerified' | 'authToken'>;

type StoredSession = { v: 2; adminId: string; user: StoredUser };

type UserContextValue = {
  /** Sessions by tenant (adminId). Read through `useUser`, which picks the store's. */
  sessions: Record<string, StoredUser>;
  isHydrated: boolean;
  setSession: (adminId: string, user: StoredUser) => void;
  clearSession: (adminId: string) => void;
};

/*
 * One key per tenant.
 *
 * All restaurants on the platform domain share one origin, so one
 * `user_session` key meant restaurant B greeted the customer of restaurant A
 * by name, listed A's vouchers and order history, and wrote favourites into
 * A's customer record. Customers belong to a tenant on the server, so the
 * session does too.
 */
const LEGACY_KEY = 'user_session';
const KEY_PREFIX = 'user_session:';
export const sessionKey = (adminId: string) => `${KEY_PREFIX}${adminId}`;

/** Whitelist the server's customer object down to what the shop keeps. */
export function sanitizeUser(raw: any): StoredUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const _id = String(raw._id ?? raw.id ?? '');
  const authToken = typeof raw.authToken === 'string' ? raw.authToken : '';
  // A session without its token cannot read anything any more — it is not a session.
  if (!_id || !authToken) return null;
  const emailAddress = raw.emailAddress ?? raw.email;
  return {
    _id,
    name: typeof raw.name === 'string' ? raw.name : '',
    ...(raw.phoneNumber ? { phoneNumber: String(raw.phoneNumber) } : {}),
    ...(emailAddress ? { emailAddress: String(emailAddress) } : {}),
    isVerified: raw.isVerified === true,
    authToken,
  };
}

/** Parse one stored session; null when it is malformed or belongs to another tenant. */
export function readStoredSession(adminId: string, raw: string | null): StoredUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (parsed?.v !== 2 || parsed.adminId !== adminId) return null;
    return sanitizeUser(parsed.user);
  } catch {
    return null;
  }
}

const UserContext = createContext<UserContextValue | null>(null);

function safeStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Record<string, StoredUser>>({});
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const ls = safeStorage();
    const loaded: Record<string, StoredUser> = {};
    if (ls) {
      // The old shared key cannot be attributed to a tenant and carries fields
      // that should never have been stored. It is dropped, not migrated.
      try {
        ls.removeItem(LEGACY_KEY);
      } catch {
        /* storage unavailable */
      }
      const keys: string[] = [];
      for (let i = 0; i < ls.length; i += 1) {
        const k = ls.key(i);
        if (k && k.startsWith(KEY_PREFIX)) keys.push(k);
      }
      for (const k of keys) {
        const adminId = k.slice(KEY_PREFIX.length);
        const user = readStoredSession(adminId, ls.getItem(k));
        if (user) loaded[adminId] = user;
        else {
          try {
            ls.removeItem(k);
          } catch {
            /* storage unavailable */
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage is only readable after mount
    setSessions(loaded);
    setIsHydrated(true);

    // Another tab signing in or out of the same restaurant.
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !e.key.startsWith(KEY_PREFIX)) return;
      const adminId = e.key.slice(KEY_PREFIX.length);
      const user = readStoredSession(adminId, e.newValue);
      setSessions((prev) => {
        const next = { ...prev };
        if (user) next[adminId] = user;
        else delete next[adminId];
        return next;
      });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setSession = useCallback((adminId: string, user: StoredUser) => {
    if (!adminId) return;
    setSessions((prev) => ({ ...prev, [adminId]: user }));
    try {
      safeStorage()?.setItem(sessionKey(adminId), JSON.stringify({ v: 2, adminId, user } satisfies StoredSession));
    } catch {
      /* storage unavailable — the session lasts for this page only */
    }
  }, []);

  const clearSession = useCallback((adminId: string) => {
    if (!adminId) return;
    setSessions((prev) => {
      if (!(adminId in prev)) return prev;
      const next = { ...prev };
      delete next[adminId];
      return next;
    });
    try {
      safeStorage()?.removeItem(sessionKey(adminId));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo<UserContextValue>(() => ({ sessions, isHydrated, setSession, clearSession }), [sessions, isHydrated, setSession, clearSession]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/** Per-store checkout contact details (name, e-mail, phone). See `useCheckout`. */
export const contactStorageKey = (slug: string) => `pos-contact:${slug || 'default'}`;
/** Per-store checkout form (payment method, tip, bell name…), session only. */
export const checkoutFormStorageKey = (slug: string) => `pos-checkout-form:${slug || 'default'}`;

/**
 * Everything personal the shop keeps for one restaurant, gone.
 * Exported for the logout test; screens call `clearUser()`.
 */
export function forgetStoreData(slug: string) {
  const ls = safeStorage();
  try {
    ls?.removeItem(contactStorageKey(slug));
    // The pre-0051 contact key was shared by every restaurant.
    ls?.removeItem('persisted');
  } catch {
    /* storage unavailable */
  }
  try {
    sessionStorage.removeItem(checkoutFormStorageKey(slug));
  } catch {
    /* storage unavailable */
  }
  if (slug) {
    try {
      clearFavorites(slug);
      window.dispatchEvent(new Event('favorites:changed'));
    } catch {
      /* storage unavailable */
    }
    clearPlacedOrder(slug);
  }
}

/**
 * The customer signed in at *this* restaurant, or null.
 *
 * Reads the store from context, so a session from another tenant on the same
 * domain is never returned, and `setUser` files the session under this one.
 */
export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  const store = useStore();
  const adminId = store?.adminId || '';
  const slug = store?.slug || '';
  const { sessions, isHydrated, setSession, clearSession } = ctx;

  const stored = adminId ? sessions[adminId] : undefined;
  const user = useMemo<User | null>(() => (stored ? { ...stored, email: stored.emailAddress } : null), [stored]);

  /** Adopt a customer object from `/user/login` or `/user/register`. Anything without a token is ignored. */
  const setUser = useCallback(
    (raw: unknown) => {
      const clean = sanitizeUser(raw);
      if (clean && adminId) setSession(adminId, clean);
      return clean;
    },
    [adminId, setSession],
  );

  /**
   * Log out of this restaurant: the session, Firebase, the remembered contact
   * details, favourites and the last order snapshot of this store.
   */
  const clearUser = useCallback(() => {
    clearSession(adminId);
    forgetStoreData(slug);
    // Loaded on demand: the Firebase SDK is not needed to render a logged-out shop.
    void import('~/lib/firebase')
      .then(async ({ auth }) => {
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
      })
      .catch(() => {
        /* already signed out, or Firebase unavailable */
      });
  }, [adminId, slug, clearSession]);

  return { user, isHydrated, setUser, clearUser };
}

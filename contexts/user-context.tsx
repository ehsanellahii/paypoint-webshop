/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '~/lib/utils';

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

export type User = {
  _id: string;
  id?: string;
  name: string;
  userId?: string;
  email?: string;
  phoneNumber?: string;
  fcmToken?: string;
  stripeCustomerId?: string;
  promoCode?: string;

  address?: string;
  street?: string;
  houseNumber?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;

  isGuest?: boolean;

  userLatitude?: number;
  userLongitude?: number;

  points?: number;
  vouchers?: Voucher[];
  usedVouchers?: Voucher[];

  uid?: string;
};

type UserContextValue = {
  user: User | null;
  isHydrated: boolean;
  setUser: (user: User) => void;
  clearUser: () => void;
};

const USER_STORAGE_KEY = 'user_session';

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = storage.get<User | null>(USER_STORAGE_KEY, null);
    setUserState(saved);
    setIsHydrated(true);
  }, []);

  const setUser = (u: User) => {
    setUserState(u);
    storage.set(USER_STORAGE_KEY, u);
  };

  const clearUser = () => {
    setUserState(null);
    storage.set(USER_STORAGE_KEY, null);
  };

  const value = useMemo<UserContextValue>(() => ({ user, isHydrated, setUser, clearUser }), [user, isHydrated]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}

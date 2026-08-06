// app/[storeSlug]/StoreProvider.tsx
'use client';
import { createContext, useContext } from 'react';
import { IStoreInfo } from '~/lib/types';

const StoreCtx = createContext<IStoreInfo | null>(null);
export const useStore = () => useContext(StoreCtx);

export default function StoreProvider({ value, children }: { value: IStoreInfo | null; children: React.ReactNode }) {
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

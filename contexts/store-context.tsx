// app/[storeSlug]/StoreProvider.tsx
'use client';
import { createContext, useContext } from 'react';
import { IStoreInfo } from '~/lib/types';
import { StoreAddressScope } from '~/contexts/address-context';

const StoreCtx = createContext<IStoreInfo | null>(null);
export const useStore = () => useContext(StoreCtx);

/*
 * The address scope rides along with the store: the address provider lives in
 * the layout, above any one store page, so it is here — where the store is
 * known — that the order type is narrowed to what the store offers and the
 * delivery terms for the active address are fetched.
 */
export default function StoreProvider({ value, children }: { value: IStoreInfo | null; children: React.ReactNode }) {
  return (
    <StoreCtx.Provider value={value}>
      <StoreAddressScope store={value}>{children}</StoreAddressScope>
    </StoreCtx.Provider>
  );
}

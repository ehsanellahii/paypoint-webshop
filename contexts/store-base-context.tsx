'use client';

import { createContext, useContext, type ReactNode } from 'react';

/*
 * Null rather than '' as the default, so a consumer can tell "no provider"
 * from "a custom domain, so no prefix" — the two need different fallbacks and
 * '' would silently look like the second.
 */
const StoreBaseContext = createContext<string | null>(null);

/**
 * Makes the server's URL prefix readable from client components.
 *
 * Decided once per request in `proxy.ts` and resolved in the layout, for the
 * same reason the device is: it depends on the hostname, which the browser
 * cannot be asked about during the server render without the two disagreeing.
 * The value never changes for the life of the document.
 */
export function StoreBaseProvider({ base, children }: { base: string; children: ReactNode }) {
  return <StoreBaseContext.Provider value={base}>{children}</StoreBaseContext.Provider>;
}

/**
 * The prefix, or null when no provider is above — callers fall back to the
 * slug, which is the platform-host shape.
 */
export function useStoreBase() {
  return useContext(StoreBaseContext);
}

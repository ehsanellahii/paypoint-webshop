'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Device } from '~/lib/device';

const DeviceContext = createContext<Device>('desktop');

/**
 * Makes the server's device decision readable from client components, so a
 * shared component (cart, product options, checkout logic) can pick its
 * presentation without every route threading a prop down.
 *
 * The value never changes for the life of the document — it comes from the
 * request, not from a resize listener. A desktop browser narrowed to phone
 * width keeps the desktop tree, which is what the handover's own User-Agent
 * switch does too.
 */
export function DeviceProvider({ device, children }: { device: Device; children: ReactNode }) {
  return <DeviceContext.Provider value={device}>{children}</DeviceContext.Provider>;
}

export function useDevice() {
  return useContext(DeviceContext);
}

export function useIsMobile() {
  return useContext(DeviceContext) === 'mobile';
}

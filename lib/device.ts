import { headers } from 'next/headers';

export type Device = 'mobile' | 'desktop';

/**
 * The device decided by `proxy.ts` for this request.
 *
 * Server-side rather than a media query because the two designs are different
 * component trees, not one tree restyled: rendering both and hiding one with
 * CSS would ship the whole other app's markup on every page. Desktop is the
 * fallback when the header is absent (e.g. a request that bypassed the
 * proxy), which is the safer default on an unknown client.
 */
export async function getDevice(): Promise<Device> {
  const h = await headers();
  return h.get('x-device') === 'mobile' ? 'mobile' : 'desktop';
}

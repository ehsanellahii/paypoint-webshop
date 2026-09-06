/**
 * Headers `proxy.ts` stamps on a request for the render to read.
 *
 * Their own module so neither side has to import the other: a page reaching
 * into `proxy.ts` would pull the middleware entry into the page bundle, and
 * spelling the names out at both ends invites a rename that only fails at
 * runtime, on one host, in production.
 */

/** 'mobile' | 'desktop', decided from the User-Agent. See `lib/device.ts`. */
export const DEVICE_HEADER = 'x-device';

/**
 * The restaurant's own hostname, set only when the request arrived on one.
 * Its presence is what makes the slug disappear from every emitted URL — see
 * `lib/storeBase.ts`.
 */
export const CUSTOM_DOMAIN_HEADER = 'x-custom-domain';

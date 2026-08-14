/*
 * The account sections, in a plain module on purpose.
 *
 * They used to be exported from `MobileAccountScreen`, which is a `'use client'`
 * module. A Server Component importing a non-component export from a client
 * module does not get the value — React hands back a client-reference proxy —
 * so the route's `ACCOUNT_SECTIONS.includes(...)` guard died with
 * "includes is not a function". Neither side owns this list, so it lives here
 * and both import it.
 */
export const ACCOUNT_SECTIONS = ['favorites', 'orders', 'vouchers'] as const;

export type AccountSection = (typeof ACCOUNT_SECTIONS)[number];

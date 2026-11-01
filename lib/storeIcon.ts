import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

import { getStoreData } from './api';
import type { IStoreInfo } from './types';

/*
 * The shop's icons, drawn from the logo the restaurant uploaded in the admin
 * (31.10.2026, owner: Google shows the favicon next to the order link in the
 * Business Profile, and every shop still showed our cutlery mark).
 *
 * Google's rules for that favicon decide the shape of this file: a square,
 * a multiple of 48 px, a stable URL on the shop's own domain, linked from the
 * HTML the server sends. A restaurant's logo is rarely square, so it is
 * scaled to fit and padded on white — never stretched — and served from
 * fixed paths (`/favicon.ico`, `/icon-192.png`, …) rather than an optimizer
 * URL that changes with the logo.
 */

/** Every size the shop serves, in px. */
export const ICON_SIZES = {
  favicon: 48,
  apple: 180,
  icon192: 192,
  icon512: 512,
} as const;

/** The logo is drawn at this share of the square, so it never touches the edge. */
const LOGO_SHARE = 0.84;
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

/*
 * A day in every cache: the URL is fixed, so a new logo shows up once the
 * day is over — Google re-reads favicons far less often than that anyway.
 */
const CACHE_CONTROL = 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';

/*
 * Rendered icons per logo and size, so a warm instance answers from memory.
 * Keyed by the logo URL itself: an uploaded new logo has a new URL and is
 * drawn fresh without anything to invalidate.
 */
const rendered = new Map<string, Buffer>();
const MAX_RENDERED = 300;

/** The same picture the header shows: the webshop logo, else the firm's. */
export function storeLogoURL(store: IStoreInfo | null): string | null {
  return store?.settings?.logo?.trim() || store?.logo?.trim() || null;
}

async function fetchBytes(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

/** The picture scaled into a white square of `size`, centred, as PNG. */
async function drawSquare(source: Buffer, size: number): Promise<Buffer> {
  const inner = Math.round(size * LOGO_SHARE);
  // `density` so an SVG logo is rasterised sharp rather than at 72 dpi.
  const logo = await sharp(source, { density: 300 })
    .resize(inner, inner, { fit: 'contain', background: WHITE })
    .flatten({ background: WHITE })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function iconFor(sourceURL: string, size: number): Promise<Buffer | null> {
  const key = `${size}|${sourceURL}`;
  const hit = rendered.get(key);
  if (hit) return hit;
  const bytes = await fetchBytes(sourceURL);
  if (!bytes) return null;
  try {
    const png = await drawSquare(bytes, size);
    if (rendered.size >= MAX_RENDERED) rendered.delete(rendered.keys().next().value as string);
    rendered.set(key, png);
    return png;
  } catch {
    // Not an image sharp can read (or a broken upload): fall back like "no logo".
    return null;
  }
}

/** The store, or null — an icon request never turns a backend fault into an error page. */
async function storeFor(slug: string | null): Promise<IStoreInfo | null> {
  if (!slug) return null;
  try {
    return (await getStoreData(slug)) as IStoreInfo | null;
  } catch {
    return null;
  }
}

/*
 * Our own mark, read from disk — never fetched over HTTP.
 *
 * It used to be fetched from `<request origin>/only_logo.png`, and the origin
 * comes from the request's Host / X-Forwarded-Host headers: anyone could make
 * the server download a picture from a host of their choosing and serve it,
 * cached publicly for a day, as a restaurant's favicon.
 */
let fallbackBytes: Promise<Buffer | null> | null = null;
function fallbackLogo(): Promise<Buffer | null> {
  if (!fallbackBytes) {
    fallbackBytes = readFile(path.join(process.cwd(), 'public', 'only_logo.png')).catch(() => {
      fallbackBytes = null;
      return null;
    });
  }
  return fallbackBytes;
}

async function fallbackIcon(size: number): Promise<Buffer | null> {
  const key = `${size}|fallback`;
  const hit = rendered.get(key);
  if (hit) return hit;
  const bytes = await fallbackLogo();
  if (!bytes) return null;
  try {
    const png = await drawSquare(bytes, size);
    rendered.set(key, png);
    return png;
  } catch {
    return null;
  }
}

/**
 * The PNG for one icon request: the store's logo, or our own mark when the
 * store has none, it cannot be loaded, or there is no store (`slug` null).
 */
export async function iconResponse(slug: string | null, size: number): Promise<Response> {
  const store = await storeFor(slug);
  const logo = storeLogoURL(store);
  let png = logo ? await iconFor(logo, size) : null;
  if (!png) png = await fallbackIcon(size);
  if (!png) return new Response('Icon not available', { status: 404 });
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': CACHE_CONTROL },
  });
}

/**
 * The web app manifest of a shop: its name and the same icons, so "add to
 * home screen" and Google both find the logo. `base` is '' on the shop's own
 * domain and '/<slug>' on ours, exactly like every other link the shop emits.
 */
export async function manifestResponse(slug: string, base: string): Promise<Response> {
  const store = await storeFor(slug);
  const name = store?.brandName?.trim() || 'Online Ordering';
  /*
   * The installed shop opens on the mobile design's page colour
   * (`--background` under `[data-device='mobile']`, globals.css), so the splash
   * screen and the status bar match the dark app instead of flashing white.
   * The store accent stays out: Pizza M&M's is white.
   */
  const pageColour = '#0c0f1c';
  /*
   * `start_url` must lie inside `scope`. "/pizza-mandm" is not inside
   * "/pizza-mandm/" (scope is a plain prefix, and the shop's own URLs carry no
   * trailing slash — Next redirects "/pizza-mandm/" away), so the scope is
   * the store base itself. On the restaurant's own domain both are "/".
   */
  const manifest = {
    name,
    short_name: name.length > 12 ? name.slice(0, 12).trim() : name,
    start_url: base || '/',
    scope: base || '/',
    display: 'standalone',
    background_color: pageColour,
    theme_color: pageColour,
    icons: [
      { src: `${base}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${base}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}

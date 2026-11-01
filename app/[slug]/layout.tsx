import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans, Baloo_2, Kaushan_Script, Playfair_Display } from 'next/font/google';
import '../globals.css';
import { CartProvider } from '~/contexts/cart-context';
import { LanguageProvider } from '@/contexts/language-context';
import { AddressProvider } from '~/contexts/address-context';
import { UserProvider } from '~/contexts/user-context';
import DebugPersistError from '~/lib/DebugPersistError';
import { getDevice } from '~/lib/device';
import { DeviceProvider } from '~/contexts/device-context';
import { getStoreBase } from '~/lib/storeBase';
import { FALLBACK_ICONS } from '~/lib/metadata';
import { StoreBaseProvider } from '~/contexts/store-base-context';
import { notFound } from 'next/navigation';
import { getStoreData } from '~/lib/api';
import { BLOCKEDSLUGS } from './page';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

// Body / UI font
const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

// Display / heading font
const baloo = Baloo_2({
  variable: '--font-baloo',
  subsets: ['latin'],
  weight: ['700', '800'],
  display: 'swap',
});

// Script logo font
const kaushan = Kaushan_Script({
  variable: '--font-kaushan',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

// Serif accent font
const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  display: 'swap',
});

/*
 * Static on purpose. Each page under this layout builds its own metadata from
 * the store via `buildStoreMetadata`, so fetching the store a second time here
 * bought nothing — and it was the fetch that logged "Failed to fetch store
 * data" whenever a browser asked for /favicon.ico, which has no file and lands
 * on this route. What is left is only the fallback for a request that never
 * reaches a page.
 *
 * The icons here are therefore our own mark only. Every page below replaces
 * them with the restaurant's logo through `buildStoreMetadata`, which is why
 * each route under this layout has to declare metadata — without it the tab
 * falls back to the platform mark on that route alone.
 */
export const metadata: Metadata = {
  title: 'Online Ordering',
  description: 'Order food online',
  icons: FALLBACK_ICONS,
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  /*
   * The till-style screens are laid out for the width they are given, so a
   * stray double-tap or pinch just leaves the guest stranded mid-page.
   *
   * Worth knowing: iOS Safari has ignored `user-scalable=no` since iOS 10 and
   * will still pinch-zoom on purpose. This stops double-tap zoom and the
   * Android behaviour; the jump that actually annoys people on an iPhone —
   * the page lurching when a field is focused — is handled by the 16px floor
   * on form controls in globals.css.
   */
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  /*
   * A slug that names no store is a 404 — decided here, before anything is
   * sent. The page's own check came too late: `loading.tsx` has already
   * streamed the skeleton with a 200 by the time the page finds out, so an
   * unknown address answered "200 OK" with a not-found screen in it (a soft
   * 404 to search engines). Same call and arguments as the page makes, so
   * React's per-request cache serves the page from this fetch.
   *
   * A backend fault is not a missing store: it is left to the page, whose
   * error boundary says so in German instead of a 404.
   */
  if (BLOCKEDSLUGS.has(slug)) notFound();
  let storeExists = true;
  try {
    storeExists = !!(await getStoreData(slug, undefined));
  } catch {
    storeExists = true;
  }
  if (!storeExists) notFound();
  // Decided in proxy.ts from the User-Agent (or ?view=). Stamped on <html>
  // so the mobile palette in globals.css can scope to it, and passed through
  // context so client components can pick their tree.
  const device = await getDevice();
  // '' on the restaurant's own domain, '/<slug>' on ours. Every link and
  // redirect the app emits hangs off this; routing is already decided.
  const storeBase = await getStoreBase(slug);
  return (
    // German by default, as the shop is; LanguageProvider updates it when a guest switches.
    <html lang='de' className='dark' data-device={device}>
      {/*
       * No hand-written <head>: Next builds it from the Metadata API, so the
       * icons and colour scheme are declared as `metadata` and `viewport`
       * above. Keeping every head tag in one place means the next person
       * adding one does not have to guess which of two mechanisms wins.
       */}
      <body className={`${inter.variable} ${jakarta.variable} ${baloo.variable} ${kaushan.variable} ${playfair.variable} antialiased`}>
        {/*
         * Maps is loaded by `useGoogleMaps`, not here. Loading it in the layout
         * too meant two copies of the SDK on every page — Google warns about
         * that in the console — and this one used the global env key, while
         * every actual consumer wants the store's own `posGoogleApiKey`. It
         * also downloaded the SDK on the menu page, which never draws a map.
         */}
        <DeviceProvider device={device}>
          <StoreBaseProvider base={storeBase}>
          <LanguageProvider>
          <UserProvider>
            <AddressProvider storeKey={slug || 'default'}>
              <DebugPersistError />
              <CartProvider storeKey={slug || 'default'}>{children}</CartProvider>
            </AddressProvider>
          </UserProvider>
          </LanguageProvider>
          </StoreBaseProvider>
        </DeviceProvider>
      </body>
    </html>
  );
}

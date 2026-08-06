import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans, Baloo_2, Kaushan_Script, Playfair_Display } from 'next/font/google';
import '../globals.css';
import { CartProvider } from '~/contexts/cart-context';
import { LanguageProvider } from '@/contexts/language-context';
import { AddressProvider } from '~/contexts/address-context';
import { UserProvider } from '~/contexts/user-context';
import DebugPersistError from '~/lib/DebugPersistError';

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
 */
export const metadata: Metadata = {
  title: 'Online Ordering',
  description: 'Order food online',
  icons: {
    icon: [
      { url: '/logo-light.svg', media: '(prefers-color-scheme: light)' },
      { url: '/logo-dark.svg', media: '(prefers-color-scheme: dark)' },
    ],
  },
};

export const viewport: Viewport = {
  colorScheme: 'dark',
};

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <html lang='en' className='dark'>
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
        <LanguageProvider>
          <UserProvider>
            <AddressProvider storeKey={slug || 'default'}>
              <DebugPersistError />
              <CartProvider storeKey={slug || 'default'}>{children}</CartProvider>
            </AddressProvider>
          </UserProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

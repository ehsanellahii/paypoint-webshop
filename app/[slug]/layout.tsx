import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans, Baloo_2, Kaushan_Script, Playfair_Display } from 'next/font/google';
import '../globals.css';
import { CartProvider } from '~/contexts/cart-context';
import { LanguageProvider } from '@/contexts/language-context';
import Script from 'next/script';
import { AddressProvider } from '~/contexts/address-context';
import { UserProvider } from '~/contexts/user-context';
import DebugPersistError from '~/lib/DebugPersistError';
import { getStoreData } from '~/lib/api';

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

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sParams = await searchParams;
  const store = await getStoreData(slug, sParams?.t as string);

  return {
    title: {
      default: 'Order Online',
      template: `%s - ${store?.brandName || 'Online Ordering'}`,
    },
    description: 'Order delicious burgers, wings, and more online',
    openGraph: {
      title: store?.brandName || 'Online Ordering',
      description: store?.brandName ? `Order online from ${store?.brandName}` : 'Order delicious burgers, wings, and more online',
      images: store?.logo ? [store.logo] : [],
    },
  };
}

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <html lang='en' className='dark'>
      <head>
        <link rel='icon' href='/logo-light.svg' media='(prefers-color-scheme: light)' />
        <link rel='icon' href='/logo-dark.svg' media='(prefers-color-scheme: dark)' />
        <meta name='color-scheme' content='dark' />
      </head>
      <body className={`${inter.variable} ${jakarta.variable} ${baloo.variable} ${kaushan.variable} ${playfair.variable} antialiased`}>
        <Script
          id='google-maps'
          strategy='afterInteractive'
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        />

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

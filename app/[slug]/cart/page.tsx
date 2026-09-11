import { notFound, redirect } from 'next/navigation';
import { getStoreData } from '~/lib/api';
import { getDevice } from '~/lib/device';
import { getStoreBase } from '~/lib/storeBase';
import StoreProvider from '~/contexts/store-context';
import ThemeVars from '~/lib/ThemeVars';
import MobileCartScreen from '~/app/components/mobile/MobileCartScreen';
import { buildStoreMetadata } from '~/lib/metadata';
import type { Metadata } from 'next';

/*
 * Declared so the tab keeps the restaurant's own logo and name here. Metadata
 * resolves per route, so a page without this inherits the layout's platform
 * mark — the icon would flip back the moment the guest opened the cart.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreData(slug);
  return buildStoreMetadata({
    store,
    slug,
    path: '/cart',
    title: store?.brandName ? `Cart | ${store.brandName}` : 'Cart',
  });
}

/*
 * The cart is a full screen on mobile and a modal on desktop, so this route
 * exists for mobile only — a desktop request is sent to the menu, where the
 * cart opens over it.
 */
export default async function CartPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const { t: token } = await searchParams;

  const device = await getDevice();
  // The menu's own address, which is the bare domain when the store is served
  // on one — `/${slug}` there would only bounce back through the proxy.
  const base = await getStoreBase(slug);
  if (device !== 'mobile') redirect(token ? `${base || '/'}?t=${token}` : base || '/');

  const storeInfo = await getStoreData(slug, token as string);
  if (!storeInfo) notFound();

  return (
    <StoreProvider value={storeInfo}>
      <ThemeVars primary={storeInfo?.settings?.themeColors?.primaryColor} selectedText={storeInfo?.settings?.themeColors?.selectedTextColor} />
      <MobileCartScreen />
    </StoreProvider>
  );
}

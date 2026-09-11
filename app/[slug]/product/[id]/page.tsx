import { notFound, redirect } from 'next/navigation';
import { getStoreData } from '~/lib/api';
import { getDevice } from '~/lib/device';
import { getStoreBase } from '~/lib/storeBase';
import StoreProvider from '~/contexts/store-context';
import ThemeVars from '~/lib/ThemeVars';
import MobileProductScreen from '~/app/components/mobile/MobileProductScreen';
import { buildStoreMetadata } from '~/lib/metadata';
import type { Metadata } from 'next';

/*
 * Store-level only: the product name would mean fetching the menu just to
 * title the tab, and this screen is reached from the menu rather than shared
 * on its own. The point here is the restaurant's logo in the tab, which the
 * layout's fallback would otherwise take back on this route.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const store = await getStoreData(slug);
  return buildStoreMetadata({ store, slug, path: `/product/${id}` });
}

/*
 * Product detail exists as a route only on mobile, where the design makes it a
 * full screen — a real URL so the hardware back button and swipe-back work.
 * Desktop opens the same product in a modal over the menu, so a desktop request
 * for this URL is sent to the menu instead of rendering a second presentation.
 */
export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug, id } = await params;
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
      <MobileProductScreen productId={id} />
    </StoreProvider>
  );
}

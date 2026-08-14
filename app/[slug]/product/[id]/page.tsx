import { notFound, redirect } from 'next/navigation';
import { getStoreData } from '~/lib/api';
import { getDevice } from '~/lib/device';
import StoreProvider from '~/contexts/store-context';
import ThemeVars from '~/lib/ThemeVars';
import MobileProductScreen from '~/app/components/mobile/MobileProductScreen';

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
  if (device !== 'mobile') redirect(token ? `/${slug}?t=${token}` : `/${slug}`);

  const storeInfo = await getStoreData(slug, token as string);
  if (!storeInfo) notFound();

  return (
    <StoreProvider value={storeInfo}>
      <ThemeVars primary={storeInfo?.settings?.themeColors?.primaryColor} selectedText={storeInfo?.settings?.themeColors?.selectedTextColor} />
      <MobileProductScreen productId={id} />
    </StoreProvider>
  );
}

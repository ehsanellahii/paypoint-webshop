import { notFound, redirect } from 'next/navigation';
import { getStoreData } from '~/lib/api';
import { getDevice } from '~/lib/device';
import StoreProvider from '~/contexts/store-context';
import ThemeVars from '~/lib/ThemeVars';
import MobileCartScreen from '~/app/components/mobile/MobileCartScreen';

/*
 * The cart is a full screen on mobile and a modal on desktop, so this route
 * exists for mobile only — a desktop request is sent to the menu, where the
 * cart opens over it.
 */
export default async function CartPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const { t: token } = await searchParams;

  const device = await getDevice();
  if (device !== 'mobile') redirect(token ? `/${slug}?t=${token}` : `/${slug}`);

  const storeInfo = await getStoreData(slug, token as string);
  if (!storeInfo) notFound();

  return (
    <StoreProvider value={storeInfo}>
      <ThemeVars primary={storeInfo?.settings?.themeColors?.primaryColor} selectedText={storeInfo?.settings?.themeColors?.selectedTextColor} />
      <MobileCartScreen />
    </StoreProvider>
  );
}

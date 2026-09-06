import { notFound, redirect } from 'next/navigation';
import { getStoreData } from '~/lib/api';
import { getDevice } from '~/lib/device';
import { getStoreBase } from '~/lib/storeBase';
import StoreProvider from '~/contexts/store-context';
import ThemeVars from '~/lib/ThemeVars';
import MobileAccountScreen from '~/app/components/mobile/MobileAccountScreen';
import { ACCOUNT_SECTIONS, type AccountSection } from '~/lib/accountSections';

/*
 * Favorites, orders, vouchers and invite are top-level screens on mobile and
 * views inside the account drawer on desktop — so these routes are mobile only,
 * and a desktop request goes to the menu, where the drawer opens over it.
 */
export default async function AccountPage({ params, searchParams }: { params: Promise<{ slug: string; section: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug, section } = await params;
  const { t: token } = await searchParams;

  if (!ACCOUNT_SECTIONS.includes(section as AccountSection)) notFound();

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
      <MobileAccountScreen section={section as AccountSection} />
    </StoreProvider>
  );
}

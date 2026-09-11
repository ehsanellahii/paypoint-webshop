import { notFound, redirect } from 'next/navigation';
import { getStoreData } from '~/lib/api';
import { getDevice } from '~/lib/device';
import { getStoreBase } from '~/lib/storeBase';
import StoreProvider from '~/contexts/store-context';
import ThemeVars from '~/lib/ThemeVars';
import MobileAccountScreen from '~/app/components/mobile/MobileAccountScreen';
import { ACCOUNT_SECTIONS, type AccountSection } from '~/lib/accountSections';
import { buildStoreMetadata } from '~/lib/metadata';
import type { Metadata } from 'next';

/** Tab headings for the sections; the screens themselves are translated. */
const SECTION_TITLES: Record<AccountSection, string> = {
  favorites: 'Favorites',
  orders: 'Orders',
  vouchers: 'Vouchers',
};

/*
 * Keeps the restaurant's logo in the tab on these screens too — metadata
 * resolves per route, so without this the layout's platform mark wins here.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string; section: string }> }): Promise<Metadata> {
  const { slug, section } = await params;
  const store = await getStoreData(slug);
  const label = SECTION_TITLES[section as AccountSection];
  return buildStoreMetadata({
    store,
    slug,
    path: `/account/${section}`,
    title: label && store?.brandName ? `${label} | ${store.brandName}` : label,
  });
}

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

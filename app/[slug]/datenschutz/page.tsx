// The privacy-policy text must be checked by a lawyer before go-live (see lib/legalTexts.ts).
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import LegalScreen from '~/components/legal/LegalScreen';
import StoreProvider from '~/contexts/store-context';
import { getStoreData } from '~/lib/api';
import { buildStoreMetadata } from '~/lib/metadata';
import ThemeVars from '~/lib/ThemeVars';

/*
 * The restaurant's privacy policy, one per store. Same metadata as every other store
 * route, so the tab keeps the restaurant's logo; indexable like the menu.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreData(slug);
  return buildStoreMetadata({ store, slug, path: '/datenschutz', title: store?.brandName ? `Datenschutzerklärung · ${store.brandName}` : 'Datenschutzerklärung' });
}

export default async function DatenschutzPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const { t: token } = await searchParams;
  const storeInfo = await getStoreData(slug, typeof token === 'string' ? token : undefined);
  if (!storeInfo) notFound();
  return (
    <StoreProvider value={storeInfo}>
      <ThemeVars primary={storeInfo.settings?.themeColors?.primaryColor ?? ''} selectedText={storeInfo.settings?.themeColors?.selectedTextColor ?? ''} />
      <LegalScreen kind='datenschutz' />
    </StoreProvider>
  );
}

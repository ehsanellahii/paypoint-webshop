import React from 'react';
import HomeScreen from '../components/HomeScreen';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStoreData } from '~/lib/api';
import { buildStoreMetadata } from '~/lib/metadata';
import ThemeVars from '~/lib/ThemeVars';
import StoreProvider from '~/contexts/store-context';

// export const dynamic = 'force-dynamic';
// export const revalidate = 0;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { t: token } = await searchParams;
  if (BLOCKEDSLUGS.has(slug)) notFound();
  const store = await getStoreData(slug, token as string);

  return buildStoreMetadata({ store, slug });
}

export const BLOCKEDSLUGS = new Set(['favicon.ico', 'robots.txt', 'sitemap.xml', 'favicon.png']);

const page = async ({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) => {
  const paramsResult = await params;
  const { slug } = paramsResult;
  if (BLOCKEDSLUGS.has(slug)) notFound();
  const { t: token } = await searchParams;
  const storeInfo = await getStoreData(slug, token as string);
  // No store behind the slug — a 404 page, not an empty shell.
  if (!storeInfo) notFound();
  const primaryColor = storeInfo?.settings?.themeColors?.primaryColor;
  const selectedColor = storeInfo?.settings?.themeColors?.selectedTextColor;
  return (
    <StoreProvider value={storeInfo}>
      <ThemeVars primary={primaryColor} selectedText={selectedColor} />
      <HomeScreen />
    </StoreProvider>
  );
};

export default page;

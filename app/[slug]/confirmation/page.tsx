import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStoreData } from '~/lib/api';
import ThemeVars from '~/lib/ThemeVars';
import StoreProvider from '~/contexts/store-context';
import ConfirmationScreen from '~/app/components/ConfirmationScreen';
import { BLOCKEDSLUGS } from '../page';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreData(slug);
  return {
    title: store?.brandName ? `Order confirmed | ${store.brandName}` : 'Order confirmed',
  };
}

const ConfirmationPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const { slug } = await params;
  if (BLOCKEDSLUGS.has(slug)) notFound();

  const { t: token } = await searchParams;
  const storeInfo = await getStoreData(slug, token as string);

  return (
    <StoreProvider value={storeInfo}>
      <ThemeVars primary={storeInfo?.settings?.themeColors?.primaryColor} selectedText={storeInfo?.settings?.themeColors?.selectedTextColor} />
      <ConfirmationScreen />
    </StoreProvider>
  );
};

export default ConfirmationPage;

import type { IStoreInfo } from '~/lib/types';

type AddressShape = Partial<Pick<IStoreInfo, 'address' | 'street' | 'houseNumber' | 'postalCode' | 'city'>> | null | undefined;

/**
 * The store's address as guests read it: "Adalbertstraße 36, 10179 Berlin".
 *
 * Built from the parts when they are there. The admin's free-text `address`
 * often already carries city and country ("Adalbertstraße 36, Berlin,
 * Deutschland"), so joining it with postcode and city printed both twice
 * ("…, Berlin, Deutschland, 10179, Berlin"). Only when the parts are missing
 * is the free text used, as it is.
 */
export function formatStoreAddress(store: AddressShape): string {
  const line1 = [store?.street, store?.houseNumber].map((v) => (v ?? '').trim()).filter(Boolean).join(' ');
  const line2 = [store?.postalCode, store?.city].map((v) => String(v ?? '').trim()).filter(Boolean).join(' ');
  if (line1) return [line1, line2].filter(Boolean).join(', ');
  return (store?.address ?? '').trim() || line2;
}

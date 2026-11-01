import type { IStoreInfo, StoreLegal } from './types';
import { formatStoreAddress } from './storeAddress';

type StoreForLegal = Pick<IStoreInfo, 'brandName' | 'address' | 'street' | 'houseNumber' | 'postalCode' | 'city' | 'phone' | 'email'> &
  Partial<Pick<IStoreInfo, 'name' | 'legal'>>;

/** What the imprint shows. Every field is '' when unknown, and the page then leaves that line out. */
export type ImprintData = {
  company: string;
  address: string;
  representedBy: string;
  phone: string;
  email: string;
  register: string;
  vatId: string;
};

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * The imprint of a store, from its `legal` block (server 0051) where filled in,
 * falling back field by field to the store's own name, address and contact.
 *
 * An older server sends no `legal` at all, and a new one sends null for
 * anything the restaurant has not entered yet — either way the line is left
 * out rather than shown as a placeholder. The fallbacks are only ever the
 * store's own published data; nothing is made up.
 */
export function imprintData(store: StoreForLegal | null | undefined): ImprintData {
  const legal: Partial<StoreLegal> = store?.legal ?? {};
  const legalAddress = formatStoreAddress({
    street: clean(legal.street),
    houseNumber: clean(legal.houseNumber),
    postalCode: clean(legal.postalCode),
    city: clean(legal.city),
    address: '',
  });
  return {
    company: clean(legal.companyName) || clean(store?.brandName) || clean(store?.name),
    address: legalAddress || formatStoreAddress(store),
    representedBy: clean(legal.managingDirector),
    phone: clean(legal.phone) || clean(store?.phone),
    email: clean(legal.email) || clean(store?.email),
    register: clean(legal.commercialRegistrationNumber),
    vatId: clean(legal.vatId),
  };
}

/** The controller block of the privacy policy: name, address, contact — only what is known. */
export function controllerLines(data: ImprintData, labels: { phone: string; email: string }): string[] {
  return [
    data.company,
    data.address,
    data.phone ? `${labels.phone}: ${data.phone}` : '',
    data.email ? `${labels.email}: ${data.email}` : '',
  ].filter(Boolean);
}

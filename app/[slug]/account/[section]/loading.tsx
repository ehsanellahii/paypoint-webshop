import LoadingSkeleton from '~/app/components/LoadingSkeleton';
import { MobileAccountSkeleton } from '~/components/mobile/MobileSkeleton';
import { getDevice } from '~/lib/device';

/*
 * Favourites, orders and vouchers are full screens on a phone and all three
 * share a header and a list of cards, so one placeholder serves every section.
 *
 * Desktop keeps the menu skeleton it already had: those sections are a drawer
 * over the menu there rather than a page of their own.
 */
export default async function Loading() {
  const device = await getDevice();
  return device === 'mobile' ? <MobileAccountSkeleton /> : <LoadingSkeleton />;
}

import LoadingSkeleton from '~/app/components/LoadingSkeleton';
import { MobileProductSkeleton } from '~/components/mobile/MobileSkeleton';
import { getDevice } from '~/lib/device';

/*
 * A product opens full-screen on a phone, so inheriting `[slug]`'s fallback
 * meant tapping an item redrew the whole menu before the item appeared.
 *
 * Desktop keeps the menu skeleton it already had: the product opens in a dialog
 * over the menu there, so that fallback is closer to right than it is on mobile.
 */
export default async function Loading() {
  const device = await getDevice();
  return device === 'mobile' ? <MobileProductSkeleton /> : <LoadingSkeleton />;
}

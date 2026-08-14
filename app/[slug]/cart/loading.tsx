import LoadingSkeleton from '~/app/components/LoadingSkeleton';
import { MobileCartSkeleton } from '~/components/mobile/MobileSkeleton';
import { getDevice } from '~/lib/device';

/*
 * The cart had no fallback of its own, so it inherited `[slug]`'s and opened
 * behind the menu's skeleton — on a phone, a cover photo and a product grid
 * where a list of line items was about to appear.
 *
 * Desktop keeps the menu skeleton it already had: there is no cart-shaped
 * desktop placeholder to switch to yet.
 */
export default async function Loading() {
  const device = await getDevice();
  return device === 'mobile' ? <MobileCartSkeleton /> : <LoadingSkeleton />;
}

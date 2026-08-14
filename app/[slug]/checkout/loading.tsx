import CheckoutSkeleton from '~/app/components/CheckoutSkeleton';
import MobileSkeleton from '~/components/mobile/MobileSkeleton';
import { getDevice } from '~/lib/device';

/*
 * Without this, the `[slug]` fallback applies and checkout loads behind the
 * menu's skeleton — a hero, category chips and a product grid that then reflow
 * into a form. Same device split as the menu's, for the same reason.
 */
export default async function Loading() {
  const device = await getDevice();
  return device === 'mobile' ? <MobileSkeleton /> : <CheckoutSkeleton />;
}

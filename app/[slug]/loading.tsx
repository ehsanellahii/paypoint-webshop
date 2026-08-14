import LoadingSkeleton from '../components/LoadingSkeleton';
import MobileSkeleton from '~/components/mobile/MobileSkeleton';
import { getDevice } from '~/lib/device';

/*
 * Route-level Suspense fallback. It has to make the same device choice the page
 * does — otherwise a phone streams the desktop skeleton first and visibly
 * reflows into the mobile layout once the page resolves.
 */
export default async function Loading() {
  const device = await getDevice();
  return device === 'mobile' ? <MobileSkeleton /> : <LoadingSkeleton />;
}

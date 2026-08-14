import ConfirmationSkeleton from '~/app/components/ConfirmationSkeleton';
import MobileSkeleton from '~/components/mobile/MobileSkeleton';
import { getDevice } from '~/lib/device';

export default async function Loading() {
  const device = await getDevice();
  return device === 'mobile' ? <MobileSkeleton /> : <ConfirmationSkeleton />;
}

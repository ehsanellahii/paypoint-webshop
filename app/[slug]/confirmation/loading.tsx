import ConfirmationSkeleton from '~/app/components/ConfirmationSkeleton';
import { MobileConfirmationSkeleton } from '~/components/mobile/MobileSkeleton';
import { getDevice } from '~/lib/device';

export default async function Loading() {
  const device = await getDevice();
  return device === 'mobile' ? <MobileConfirmationSkeleton /> : <ConfirmationSkeleton />;
}

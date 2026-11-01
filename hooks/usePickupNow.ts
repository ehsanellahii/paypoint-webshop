'use client';

import { useAddress } from '~/contexts/address-context';
import { forgetPassedSlot } from '~/hooks/useOrderingWindow';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { savePreorderSlot } from '~/lib/preorderSlot';

/**
 * "Abholung jetzt möglich": switch to pickup **now**. The link promises an
 * order for now, so a delivery time the guest had picked earlier is dropped
 * as well; otherwise the order would silently become a pickup pre-order for
 * that time (review 01.11.2026). The guest can still pick a pickup time under
 * "Vorbestellen".
 */
export function usePickupNow() {
  const { slug } = useStoreNavigation();
  const { setOrderType } = useAddress();
  return () => {
    forgetPassedSlot(slug);
    savePreorderSlot(slug, null);
    setOrderType('pickup');
  };
}

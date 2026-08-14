'use client';

import { Check, MapPin, RotateCcw, X } from 'lucide-react';
import { Dialog } from '@base-ui/react/dialog';
import { formatPrice } from '~/lib/api';
import { useLanguage } from '~/contexts/language-context';
import { useIsMobile } from '~/contexts/device-context';
import MobileSheet from '~/components/mobile/MobileSheet';
import { useStore } from '~/contexts/store-context';
import type { Order } from './OrdersPanel';
import { getStatusMeta } from './OrdersPanel';

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

/**
 * Single-order detail (prototype `orderViewOpen`): a 480px modal with the line
 * items, total, delivery address and a reorder action. The prototype opens this
 * from the orders list rather than navigating away.
 */
/**
 * The detail itself — status, lines, total, where it went. Exported so the
 * desktop order-details page renders exactly what the sheet does instead of a
 * second copy that drifts.
 */
export function OrderDetailBody({ order }: { order: Order }) {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const brand = storeInfo?.brandName || 'Restaurant';
  const isDelivery = order.orderType === 'delivery';
  const addressLine = isDelivery ? (order.addressDetails?.address ?? '—') : `${order.storeDetails?.name ?? brand}${order.storeDetails?.address ? ` · ${order.storeDetails.address}` : ''}`;
  const status = getStatusMeta(order.status, t);

  return (
    <>
      <span className='inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-[7px] text-[11.5px] font-extrabold text-white'>
        <Check className='h-3 w-3' strokeWidth={2.4} />
        {status.label}
      </span>

      {/* Lines */}
      <div className='mt-5 flex flex-col'>
        {(order.items || []).map((it) => (
          <div key={it.uid || it.id} className='flex items-center gap-3 border-b border-white/[0.07] py-3'>
            <span className='flex h-[30px] min-w-8 shrink-0 items-center justify-center rounded-[9px] bg-surface-3 px-2 text-[13px] font-extrabold'>{it.quantity}×</span>
            <span className='min-w-0 flex-1 text-[14.5px] font-semibold'>{it.name}</span>
            <span className='shrink-0 text-[14.5px] font-bold'>{formatPrice(it.totalPrice)}</span>
          </div>
        ))}
        <div className='flex items-center justify-between pt-[15px]'>
          <span className='text-base font-extrabold'>{t.total}</span>
          <span className='text-base font-extrabold'>{formatPrice(order.totalOrderPrice)}</span>
        </div>
      </div>

      {/* Where it went */}
      <div className='mt-4 flex items-center gap-3 rounded-[14px] bg-surface-3 px-3.5 py-3.5'>
        <MapPin className='h-[19px] w-[19px] shrink-0 text-muted-foreground' strokeWidth={1.8} />
        <div className='min-w-0 flex-1'>
          <div className='text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground'>{isDelivery ? t.deliveredTo : t.pickupAt}</div>
          <div className='mt-0.5 text-[13.5px] font-semibold text-white'>{addressLine}</div>
        </div>
      </div>
    </>
  );
}

/** Date + reference line shown above the detail. */
export function orderMetaLine(order: Order, t: any) {
  return `${formatDateTime(order.orderDate)} · ${t.orderNumber} ${order.collectionCode || order.orderNumber}`;
}

export default function OrderDetailModal({ order, onClose, onReorder }: { order: Order | null; onClose: () => void; onReorder: (o: Order) => void }) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const storeInfo = useStore();
  const brand = storeInfo?.brandName || 'Restaurant';

  if (!order) return null;

  const isDelivery = order.orderType === 'delivery';
  const addressLine = isDelivery ? (order.addressDetails?.address ?? '—') : `${order.storeDetails?.name ?? brand}${order.storeDetails?.address ? ` · ${order.storeDetails.address}` : ''}`;
  const status = getStatusMeta(order.status, t);

  const body = <OrderDetailBody order={order} />;

  const reorderButton = (
    <button
      onClick={() => onReorder(order)}
      className='flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15.5px] font-extrabold text-selected-text transition active:scale-[0.98]'>
      <RotateCcw className='h-[17px] w-[17px]' strokeWidth={2.2} />
      {t.reorder}
    </button>
  );

  if (isMobile) {
    return (
      <MobileSheet open={!!order} onClose={onClose} title={t.orderDetails} maxHeight='86%'>
        <div className='mb-3 text-center text-[12.5px] font-medium text-muted-foreground'>
          {formatDateTime(order.orderDate)} · {t.orderNumber} {order.collectionCode || order.orderNumber}
        </div>
        {body}
        <div className='mt-5'>{reorderButton}</div>
      </MobileSheet>
    );
  }

  return (
    <Dialog.Root open={!!order} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 z-[68] bg-black/74 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0' />
        <Dialog.Viewport className='fixed inset-0 z-[68] flex items-start justify-center overflow-y-auto p-3 pt-6 sm:items-center sm:p-8'>
          <Dialog.Popup className='anim-scalein relative flex max-h-[86vh] w-[480px] max-w-full flex-col overflow-hidden rounded-3xl border border-border-strong bg-card shadow-[0_40px_90px_-20px_rgba(0,0,0,0.8)]'>
            <Dialog.Close
              aria-label={t.close}
              className='absolute right-[18px] top-[18px] z-[4] flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-white transition active:scale-90'>
              <X className='h-[18px] w-[18px]' strokeWidth={2.2} />
            </Dialog.Close>

            <div className='thinbar min-h-0 flex-1 overflow-y-auto p-7'>
              {/* Header */}
              <div className='flex items-center gap-3.5 pr-12'>
                <span className='flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-white'>
                  <span className='font-script text-[26px] leading-none text-card'>{brand.slice(0, 2)}</span>
                </span>
                <div className='min-w-0 flex-1'>
                  <Dialog.Title className='text-lg font-extrabold tracking-[-0.01em]'>{t.orderDetails}</Dialog.Title>
                  <div className='mt-px text-[12.5px] font-medium text-muted-foreground'>
                    {formatDateTime(order.orderDate)} · {t.orderNumber} {order.collectionCode || order.orderNumber}
                  </div>
                </div>
              </div>

              <div className='mt-3'>{body}</div>
            </div>

            <div className='shrink-0 border-t border-border px-7 pb-[22px] pt-4'>
              {reorderButton}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

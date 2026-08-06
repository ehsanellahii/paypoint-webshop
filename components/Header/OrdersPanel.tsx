/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronDown, Loader2, Receipt, Eye, RotateCcw } from 'lucide-react';
import { API_BASE_URL, formatPrice as apiFormatPrice, X_API_KEY } from '@/lib/api';
import { cn, getImageURL, MenuProduct } from '~/lib/utils';
import { useUser } from '~/contexts/user-context';
import { useLanguage } from '@/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useCart } from '~/contexts/cart-context';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import { savePlacedOrder } from '~/lib/lastOrder';
import SmartImage from '~/lib/SmartImage';

/** ---- Types ---- */
type OrderAddOn = { id: string; uid: string; name: string; quantity: number; price: number };
type OrderItem = {
  id: string;
  uid: string;
  quantity: number;
  name: string;
  currentPrice: number;
  originalPrice: number;
  discount: number;
  discountType: string;
  totalPrice: number;
  image?: string;
  addOns?: OrderAddOn[];
};
type Coordinates = { lat: number; lng: number };
type AddressDetails = { address: string; postalCode: string; coordinates?: Coordinates };
type CustomerDetails = { name: string; phoneNumber?: string; email?: string };
type StoreDetails = { name: string; address?: string; coordinates?: Coordinates };
type Voucher = { id: string; code?: string; title?: string; discountType?: string; discountAmount?: number };
export type Order = {
  id: string;
  orderNumber: number;
  collectionCode: string;
  orderDate: string;
  orderType: string;
  status: string;
  items: OrderItem[];
  paymentMethod: string;
  totalItemsPrice: number;
  isDiscounted: boolean;
  isVoucherApplied: boolean;
  discountAmount: number;
  totalOrderPrice: number;
  taxRate: number;
  taxAmount: number;
  deliveryTime?: number;
  deliveryCharges?: number;
  storeDetails: StoreDetails;
  customerDetails: CustomerDetails;
  addressDetails?: AddressDetails;
  vouchers?: Voucher[];
};
type OrdersResponse = { data: Order[]; success: boolean };

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}
function normalizeStatus(status?: string) {
  const lower = (status || '').trim().toLowerCase();
  if (lower === 'senttostore') return 'sentToStore';
  if (lower === 'indelivery') return 'inDelivery';
  if (lower === 'isdelivered') return 'isDelivered';
  if (lower === 'iscancelled') return 'isCancelled';
  return (status || '').trim();
}
export function getStatusMeta(status?: string, t?: any) {
  const st = normalizeStatus(status);
  const labelMap: Record<string, string> = {
    sentToStore: t?.sentToStore ?? 'Sent to store',
    inDelivery: t?.inDelivery ?? 'In delivery',
    isDelivered: t?.isDelivered ?? 'Delivered',
    isCancelled: t?.isCancelled ?? 'Cancelled',
  };
  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  switch (st) {
    case 'isCancelled':
      return { label: labelMap[st], className: cn(base, 'bg-red-100 text-red-700') };
    case 'isDelivered':
      return { label: labelMap[st], className: cn(base, 'bg-green-100 text-green-700') };
    case 'inDelivery':
      return { label: labelMap[st], className: cn(base, 'bg-blue-100 text-blue-700') };
    case 'sentToStore':
      return { label: labelMap[st], className: cn(base, 'bg-yellow-100 text-yellow-800') };
    default:
      return { label: status || 'Unknown', className: cn(base, 'bg-gray-100 text-foreground') };
  }
}
const getOrderTypeMeta = (type?: string, t?: any) => (type === 'delivery' ? t.delivery : type === 'pickup' ? t.pickup : type === 'dineIn' ? t.dineIn : t.unknown);

function Row({ label, value, labelClassName, valueClassName }: { label: string; value: string; labelClassName?: string; valueClassName?: string }) {
  return (
    <div className='flex items-center justify-between gap-3'>
      <div className={cn('text-foreground', labelClassName)}>{label}</div>
      <div className={cn('text-foreground', valueClassName)}>{value}</div>
    </div>
  );
}
function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='rounded-lg border border-border bg-surface-3 p-3'>
      <div className='text-xs font-semibold text-muted-foreground'>{title}</div>
      <div className='mt-1'>{children}</div>
    </div>
  );
}
function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className='flex h-[60vh] flex-col items-center justify-center text-center'>
      <div className='mb-3 text-muted-foreground'>{icon}</div>
      <div className='text-lg font-bold text-foreground'>{title}</div>
      <div className='mt-1 max-w-md text-sm text-muted-foreground'>{subtitle}</div>
    </div>
  );
}

/**
 * Order-history body — used both inside the OrdersDialog and inline in the
 * account drawer. `active` gates the fetch (whether the panel is visible).
 * `onLoaded` reports the fetched count so a host can render a footer.
 */
export default function OrdersPanel({
  active,
  wrapperClassName,
  onLoaded,
  compact = false,
  onReordered,
}: {
  active: boolean;
  wrapperClassName?: string;
  onLoaded?: (count: number) => void;
  /** Drawer variant: compact list of cards that open a separate detail view. */
  compact?: boolean;
  /** Called after a reorder adds items to the cart (e.g. to close the drawer). */
  onReordered?: () => void;
}) {
  const { t } = useLanguage();
  const { user } = useUser();
  const storeInfo = useStore();
  const { addToCart } = useCart();
  const { slug, toConfirmation } = useStoreNavigation();
  const logoURL = storeInfo?.settings?.logo || '';
  const userId = user?.id ?? user?._id;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // "View" opens the confirmation-style page. Persist a snapshot of the chosen
  // order and navigate; the confirmation screen reads it back by order ref.
  const viewOrder = useCallback(
    (o: Order) => {
      const isDelivery = o.orderType === 'delivery';
      savePlacedOrder(slug, {
        orderRef: o.collectionCode,
        isDelivery,
        paymentName: o.paymentMethod === 'cash' ? t.cash : o.paymentMethod === 'ec-card reader' ? t.posCardPayment : o.paymentMethod,
        total: o.totalOrderPrice,
        etaLo: 0,
        etaHi: 0,
        addressLine: isDelivery ? (o.addressDetails?.address ?? '') : `${o.storeDetails?.name ?? ''}${o.storeDetails?.address ? ` · ${o.storeDetails.address}` : ''}`,
        items: (o.items || []).map((it) => ({ name: it.name, qty: it.quantity, lineTotal: it.totalPrice, image: it.image ? getImageURL(it.image) : '' })),
        status: o.status,
        placedAt: new Date(o.orderDate).getTime() || Date.now(),
      });
      toConfirmation(o.collectionCode);
    },
    [slug, t, toConfirmation]
  );

  // Re-add an order's items to the cart. Add-ons aren't reconstructed (the
  // history summary doesn't carry group ids); the server reprices on submit.
  const reorder = useCallback(
    (o: Order) => {
      o.items?.forEach((it) => {
        const product = {
          _id: it.id,
          id: it.id,
          name: it.name,
          currentPrice: it.currentPrice,
          images: (it.image ? [it.image] : []) as string[],
          haveCustomizations: false,
          addOns: [],
        } as unknown as MenuProduct;
        addToCart(product, it.quantity || 1, {});
      });
      onReordered?.();
    },
    [addToCart, onReordered]
  );

  const fetchOrders = useCallback(async () => {
    if (!userId) {
      setOrders([]);
      setErr(null);
      onLoaded?.(0);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'x-api-key': X_API_KEY },
        cache: 'no-store',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as OrdersResponse | Order[];
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setOrders(list);
      onLoaded?.(list.length);
      // Auto-expand the most recent order in the full (dialog) view only.
      if (!compact && list.length > 0) {
        const first = list.slice().sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())[0];
        setExpanded({ [first.id]: true });
      }
    } catch (e: any) {
      setErr(e?.message || 'Failed to load orders');
      setOrders([]);
      onLoaded?.(0);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, compact]);

  useEffect(() => {
    if (active) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, userId]);

  return (
    <div className={wrapperClassName ?? 'flex-1 overflow-y-auto scrollbar-hide px-2 py-4 md:px-6'}>
      {!userId ? (
        <EmptyState icon={<Receipt className='h-10 w-10' />} title={t?.pleaseLogin ?? 'Please login'} subtitle={t?.loginToSeeOrders ?? 'Login to see your order history.'} />
      ) : loading ? (
        <div className='flex h-[60vh] items-center justify-center'>
          <div className='flex items-center gap-2 text-muted-foreground'>
            <Loader2 className='h-5 w-5 animate-spin' />
            <span>{t?.loading ?? 'Loading...'}</span>
          </div>
        </div>
      ) : err ? (
        <div className='rounded-lg border border-brand-red/40 bg-brand-red/10 p-4 text-brand-red'>
          <div className='font-semibold'>{t?.somethingWentWrong ?? 'Something went wrong'}</div>
          <div className='mt-1 wrap-break-word text-sm'>{err}</div>
          <button onClick={fetchOrders} className='mt-3 rounded bg-surface-3 px-4 py-2 text-sm font-semibold text-white transition hover:bg-elevated'>
            {t?.retry ?? 'Retry'}
          </button>
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon={<Receipt className='h-10 w-10' />} title={t?.noOrdersYet ?? 'No orders yet'} subtitle={t?.yourOrdersWillAppearHere ?? 'Your recent orders will appear here.'} />
      ) : compact ? (
        <OrdersCompact orders={orders} onView={viewOrder} onReorder={reorder} logoURL={logoURL} t={t} />
      ) : (
        <div className='space-y-3'>
          {orders
            .slice()
            .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
            .map((o) => {
              const isExpanded = !!expanded[o.id];
              const itemsCount = o.items?.reduce((sum, it) => sum + (it.quantity || 0), 0) ?? 0;
              const meta = getStatusMeta(o.status, t);
              return (
                <div key={o.id} className='overflow-hidden rounded-lg bg-surface-1'>
                  <button onClick={() => setExpanded((p) => ({ ...p, [o.id]: !p[o.id] }))} className='flex w-full items-center gap-3 p-4 text-left transition hover:bg-surface-2'>
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap items-center justify-between gap-3'>
                        <div className='truncate font-semibold text-foreground'>
                          {t?.order ?? 'Order'} - {o.collectionCode}
                        </div>
                        <div className='flex w-full justify-end'>
                          <span className={meta.className}>{meta.label}</span>
                        </div>
                      </div>
                      <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground'>
                        <span className='whitespace-nowrap'>{formatDateTime(o.orderDate)}</span>
                        <span className='text-muted-foreground-2'>•</span>
                        <span className='whitespace-nowrap'>{getOrderTypeMeta(o.orderType, t)}</span>
                        <span className='text-muted-foreground-2'>•</span>
                        <span className='whitespace-nowrap'>
                          {itemsCount} {t?.items ?? 'items'}
                        </span>
                        <span className='text-muted-foreground-2'>•</span>
                        <span className='whitespace-nowrap font-semibold text-foreground'>{apiFormatPrice(o.totalOrderPrice)}</span>
                      </div>
                      <div className='mt-1 truncate text-sm text-muted-foreground'>
                        {o.storeDetails?.name}
                        {o.storeDetails?.address ? ` — ${o.storeDetails.address}` : ''}
                      </div>
                    </div>
                    <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition', isExpanded && 'rotate-180')} />
                  </button>

                  {isExpanded && (
                    <div className='border-t border-border bg-card p-4'>
                      <div className='mb-2 text-sm font-semibold text-foreground'>{t?.items ?? 'Items'}</div>
                      <div className='space-y-2'>
                        {o.items?.map((it) => (
                          <div key={it.id} className='flex gap-3 rounded-lg bg-surface-3 p-3'>
                            <div className='relative hidden h-14 w-14 shrink-0 overflow-hidden rounded-md bg-white md:block'>
                              {it.image ? (
                                <SmartImage fallbackSrc={logoURL} src={getImageURL(it.image)} alt={it.name} fill className='object-cover' sizes='56px' />
                              ) : logoURL ? (
                                <div className='relative h-14 w-14 opacity-40 grayscale'>
                                  <Image src={logoURL} alt='Restaurant logo' fill className='object-contain' sizes='56px' />
                                </div>
                              ) : null}
                            </div>
                            <div className='min-w-0 flex-1'>
                              <div className='flex items-start justify-between gap-2'>
                                <div className='min-w-0'>
                                  <div className='truncate font-semibold text-foreground'>
                                    {it.quantity}× {it.name}
                                  </div>
                                  {!!it.addOns?.length && (
                                    <div className='mt-1 space-y-0.5 text-xs text-muted-foreground'>
                                      {it.addOns.map((a) => (
                                        <div key={a.id} className='flex items-center justify-between gap-2'>
                                          <span className='truncate'>
                                            {a.name}
                                            {a.quantity > 1 ? ` × ${a.quantity}` : ''}
                                          </span>
                                          <span className='shrink-0'>{apiFormatPrice((a.price || 0) * (a.quantity || 1))}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className='shrink-0 text-right'>
                                  <div className='font-semibold text-foreground'>{apiFormatPrice(it.totalPrice)}</div>
                                  {(it.discount || 0) > 0 && <div className='text-xs text-muted-foreground line-through'>{apiFormatPrice((it.originalPrice || 0) * (it.quantity || 1))}</div>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className='mt-4 grid gap-2 text-sm'>
                        <Row label={t?.itemsTotal ?? 'Items total'} value={apiFormatPrice(o.totalItemsPrice)} />
                        {!!o.deliveryCharges && o.deliveryCharges > 0 && <Row label={t?.deliveryCharges ?? 'Delivery charges'} value={apiFormatPrice(o.deliveryCharges)} />}
                        {o.isVoucherApplied && (o.discountAmount || 0) > 0 && <Row label={t?.discount ?? 'Discount'} value={`- ${apiFormatPrice(o.discountAmount)}`} valueClassName='font-semibold text-success' />}
                        <Row label={`${t?.tax ?? 'Tax'} (${o.taxRate}%)`} value={apiFormatPrice(o.taxAmount)} />
                        <div className='my-1 border-t border-border' />
                        <Row label={t?.totalIncludingVAT ?? 'Total'} value={apiFormatPrice(o.totalOrderPrice)} labelClassName='font-bold' valueClassName='font-bold text-foreground' />
                      </div>

                      {/* Payment / customer / address / voucher details — full (dialog) view only */}
                      {!compact && (
                        <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-2'>
                          <InfoCard title={t?.paymentMethod ?? 'Payment'}>
                            <div className='text-sm text-foreground'>{o.paymentMethod === 'cash' ? t.cash : o.paymentMethod === 'ec-card reader' ? t.posCardPayment : o.paymentMethod}</div>
                          </InfoCard>
                          <InfoCard title={t?.customer ?? 'Customer'}>
                            <div className='text-sm text-foreground'>{o.customerDetails?.name}</div>
                            {o.customerDetails?.phoneNumber && <div className='text-sm text-muted-foreground'>{o.customerDetails.phoneNumber}</div>}
                            {o.customerDetails?.email && <div className='text-sm text-muted-foreground'>{o.customerDetails.email}</div>}
                          </InfoCard>
                          {o.addressDetails?.address && (
                            <InfoCard title={t?.address ?? 'Address'}>
                              <div className='text-sm text-foreground'>{o.addressDetails.address}</div>
                              {o.addressDetails.postalCode && <div className='text-sm text-muted-foreground'>{o.addressDetails.postalCode}</div>}
                            </InfoCard>
                          )}
                          {!!o.vouchers?.length && (
                            <InfoCard title={t?.vouchers ?? 'Vouchers'}>
                              <div className='space-y-1'>
                                {o.vouchers.map((v) => (
                                  <div key={v.id} className='text-sm text-foreground'>
                                    <span className='font-semibold'>{v.title || v.code || 'Voucher'}</span>
                                    {v.code ? <span className='text-muted-foreground'> — {v.code}</span> : null}
                                  </div>
                                ))}
                              </div>
                            </InfoCard>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

/** Compact drawer list; "View" opens the confirmation page, matching the prototype. */
function OrdersCompact({ orders, onView, onReorder, logoURL, t }: { orders: Order[]; onView: (o: Order) => void; onReorder: (o: Order) => void; logoURL: string; t: any }) {
  const sorted = orders.slice().sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

  return (
    <div className='flex flex-col gap-2.5'>
      {sorted.map((o) => {
        const summary = (o.items || []).map((it) => it.name).filter(Boolean).join(', ');
        return (
          <div key={o.id} className='rounded-[14px] bg-surface-3 p-3.5'>
            <div className='flex items-center gap-3'>
              <span className='flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-white'>
                {logoURL ? <img src={logoURL} alt='' className='h-full w-full object-contain' /> : <Receipt className='h-5 w-5 text-black' />}
              </span>
              <div className='min-w-0 flex-1'>
                <div className='truncate text-[14px] font-bold'>{o.storeDetails?.name || (t?.order ?? 'Order')}</div>
                <div className='mt-0.5 text-[11.5px] font-medium text-muted-foreground'>
                  {formatDateTime(o.orderDate)} · {apiFormatPrice(o.totalOrderPrice)}
                </div>
              </div>
            </div>
            {summary && <div className='mt-2.5 line-clamp-2 text-[12px] font-medium text-[#a9adb3]'>{summary}</div>}
            <div className='mt-3 flex gap-2'>
              <button
                onClick={() => onView(o)}
                className='flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[11px] border border-border-strong bg-transparent text-[12.5px] font-extrabold text-white transition hover:bg-surface-1'>
                <Eye className='h-3.5 w-3.5' /> {t?.viewOrder ?? 'View'}
              </button>
              <button
                onClick={() => onReorder(o)}
                className='flex h-10 flex-[1.4] items-center justify-center gap-1.5 whitespace-nowrap rounded-[11px] bg-primary text-[12.5px] font-extrabold text-selected-text transition active:scale-[0.97]'>
                <RotateCcw className='h-3.5 w-3.5' strokeWidth={2.4} /> {t?.reorder ?? 'Reorder'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

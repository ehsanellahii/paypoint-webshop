'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStoreNavigation } from '~/hooks/useStoreNavigation';
import Image from 'next/image';
import { ChevronDown, Loader2, Receipt, ChevronRight, ShoppingBag } from 'lucide-react';
import { API_BASE_URL, formatPrice as apiFormatPrice, apiHeaders } from '@/lib/api';
import { cn, getImageURL, MenuProduct } from '~/lib/utils';
import { useUser } from '~/contexts/user-context';
import { useLanguage } from '@/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useCart } from '~/contexts/cart-context';
import SmartImage from '~/lib/SmartImage';
import OrderDetailModal from './OrderDetailModal';

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
  // Tinted on the dark shell — the light-theme chips these used to be were
  // unreadable against `bg-card`.
  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold';
  switch (st) {
    case 'isCancelled':
      return { label: labelMap[st], className: cn(base, 'bg-destructive/12 text-destructive') };
    case 'isDelivered':
      return { label: labelMap[st], className: cn(base, 'bg-success/12 text-success') };
    case 'inDelivery':
      return { label: labelMap[st], className: cn(base, 'bg-link/12 text-link') };
    case 'sentToStore':
      return { label: labelMap[st], className: cn(base, 'bg-star/12 text-star') };
    default:
      return { label: status || 'Unknown', className: cn(base, 'bg-surface-3 text-muted-foreground') };
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
  const logoURL = storeInfo?.settings?.logo || '';
  const userId = user?.id ?? user?._id;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<Order | null>(null);
  const { toConfirmation } = useStoreNavigation();

  /*
   * Clicking an order opens the confirmation screen for it, which is the same
   * view the customer saw when they placed it — it reads the order back from
   * the API by the reference in the URL.
   */
  const openOrder = useCallback((o: Order) => toConfirmation(o.collectionCode || String(o.orderNumber || o.id)), [toConfirmation]);

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
      const list = await fetchUserOrders(userId, storeInfo?.apiKey || '');
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
  console.log('compact', compact);
  return (
    <div className={wrapperClassName ?? 'flex-1 overflow-y-auto scrollbar-hide px-2 py-4 md:px-6'}>
      {!userId ? (
        <EmptyState
          icon={<Receipt className='h-10 w-10' />}
          title={t?.pleaseLogin ?? 'Please login'}
          subtitle={t?.loginToSeeOrders ?? 'Login to see your order history.'}
        />
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
        compact ? (
          <OrdersEmpty t={t} onBrowse={onReordered} />
        ) : (
          <EmptyState
            icon={<Receipt className='h-10 w-10' />}
            title={t?.noOrdersYet ?? 'No orders yet'}
            subtitle={t?.yourOrdersWillAppearHere ?? 'Your recent orders will appear here.'}
          />
        )
      ) : compact ? (
        <OrdersCompact orders={orders} onView={openOrder} onReorder={reorder} logoURL={logoURL} t={t} />
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
                  <button
                    onClick={() => setExpanded((p) => ({ ...p, [o.id]: !p[o.id] }))}
                    className='flex w-full items-center gap-3 p-4 text-left transition hover:bg-surface-2'>
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
                                  {(it.discount || 0) > 0 && (
                                    <div className='text-xs text-muted-foreground line-through'>{apiFormatPrice((it.originalPrice || 0) * (it.quantity || 1))}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className='mt-4 grid gap-2 text-sm'>
                        <Row label={t?.itemsTotal ?? 'Items total'} value={apiFormatPrice(o.totalItemsPrice)} />
                        {!!o.deliveryCharges && o.deliveryCharges > 0 && (
                          <Row label={t?.deliveryCharges ?? 'Delivery charges'} value={apiFormatPrice(o.deliveryCharges)} />
                        )}
                        {o.isVoucherApplied && (o.discountAmount || 0) > 0 && (
                          <Row label={t?.discount ?? 'Discount'} value={`- ${apiFormatPrice(o.discountAmount)}`} valueClassName='font-semibold text-success' />
                        )}
                        <Row label={`${t?.tax ?? 'Tax'} (${o.taxRate}%)`} value={apiFormatPrice(o.taxAmount)} />
                        <div className='my-1 border-t border-border' />
                        <Row
                          label={t?.totalIncludingVAT ?? 'Total'}
                          value={apiFormatPrice(o.totalOrderPrice)}
                          labelClassName='font-bold'
                          valueClassName='font-bold text-foreground'
                        />
                      </div>

                      {/* Payment / customer / address / voucher details — full (dialog) view only */}
                      {!compact && (
                        <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-2'>
                          <InfoCard title={t?.paymentMethod ?? 'Payment'}>
                            <div className='text-sm text-foreground'>
                              {o.paymentMethod === 'cash' ? t.cash : o.paymentMethod === 'ec-card reader' ? t.posCardPayment : o.paymentMethod}
                            </div>
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

      <OrderDetailModal
        order={detail}
        onClose={() => setDetail(null)}
        onReorder={(o) => {
          reorder(o);
          setDetail(null);
        }}
      />
    </div>
  );
}

/** Prototype `ordersEmpty`: a floating bag glyph over two soft discs, then a CTA. */
/*
 * Empty state on the design's own pattern (it shows one for favourites; orders
 * simply had none drawn): a disc, a heading, a line of explanation, and a way
 * out to the menu. The last part was missing — the panel said there was nothing
 * here and left the customer to find their own way back.
 */
function OrdersEmpty({ t, onBrowse }: { t: any; onBrowse?: () => void }) {
  return (
    <div className='anim-fade flex flex-col items-center px-[30px] pb-8 pt-12 text-center'>
      <div className='flex h-[74px] w-[74px] items-center justify-center rounded-full bg-card'>
        <ShoppingBag className='h-8 w-8 text-fg-disabled' strokeWidth={1.6} />
      </div>
      <div className='mt-[18px] text-[17px] font-extrabold'>{t?.noOrdersYet ?? 'No orders yet'}</div>
      <p className='mt-[7px] max-w-[300px] text-[13.5px] font-medium leading-[1.5] text-muted-foreground'>{t?.yourOrdersWillAppearHere ?? ''}</p>
      {onBrowse && (
        <button
          onClick={onBrowse}
          className='mt-5 rounded-[14px] bg-primary px-[22px] py-[13px] text-sm font-extrabold text-selected-text transition active:scale-[0.97]'>
          {t?.continueToMenu ?? 'Explore menu'}
        </button>
      )}
    </div>
  );
}

/**
 * The customer's orders. Exported because the desktop order-details page needs
 * the same call — the integration API has no "one order by id" endpoint, so a
 * details view fetches the list and picks its order out of it.
 */
export async function fetchUserOrders(userId: string, apiKey: string): Promise<Order[]> {
  const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: apiHeaders({ apiKey }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  const data = (await res.json()) as OrdersResponse | Order[];
  return Array.isArray(data) ? data : (data?.data ?? []);
}

/** Compact drawer list, split into the active order and past orders. */
function OrdersCompact({
  orders,
  onView,
  onReorder,
  logoURL,
  t,
}: {
  orders: Order[];
  onView: (o: Order) => void;
  onReorder: (o: Order) => void;
  logoURL: string;
  t: any;
}) {
  const sorted = orders.slice().sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

  // The prototype splits the list into a live order and everything before it.
  // Derived from the order's own status rather than a session snapshot, so it
  // stays right after a refresh or on another device.
  const isLive = (o: Order) => {
    const st = normalizeStatus(o.status);
    return st === 'sentToStore' || st === 'inDelivery';
  };
  const live = sorted.filter(isLive);
  const past = sorted.filter((o) => !isLive(o));

  return (
    <div className='flex flex-col'>
      {live.length > 0 && (
        <>
          <div className='text-[11px] font-bold uppercase tracking-[0.04em] text-white'>{t?.active ?? 'Active'}</div>
          <div className='mb-6 mt-2.5 flex flex-col gap-2.5'>
            {live.map((o) => {
              /*
               * A live card used to show the store name and a status, and the
               * store name comes back empty — so every in-flight order read
               * just "Order" with no way to tell one from another. Lead with
               * the reference the customer is actually given, then when it was
               * placed, what it cost and what is in it.
               */
              const ref = o.collectionCode || (o.orderNumber ? `#${o.orderNumber}` : '');
              const summary = (o.items || [])
                .map((it) => `${it.quantity}× ${it.name}`)
                .filter(Boolean)
                .join(', ');
              return (
                <button
                  key={o.id}
                  onClick={() => onView(o)}
                  className='flex w-full items-start gap-3 rounded-[14px] border border-success/35 bg-surface-3 p-3.5 text-left transition hover:bg-elevated'>
                  <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-card'>
                    <span className='h-4 w-4 animate-spin rounded-full border-[2.5px] border-white/20 border-t-success' />
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='flex items-baseline gap-2'>
                      <span className='min-w-0 truncate text-[14.5px] font-bold'>{ref || o.storeDetails?.name || (t?.order ?? 'Order')}</span>
                      {o.orderType && (
                        <span className='shrink-0 text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground'>{getOrderTypeMeta(o.orderType, t)}</span>
                      )}
                    </span>
                    <span className='mt-0.5 block text-[12px] font-semibold text-success'>{getStatusMeta(o.status, t).label}</span>
                    <span className='mt-1 block text-[11.5px] font-medium text-muted-foreground'>
                      {formatDateTime(o.orderDate)} · {apiFormatPrice(o.totalOrderPrice)}
                    </span>
                    {summary && <span className='mt-1 line-clamp-2 block text-[12px] font-medium text-fg-tertiary'>{summary}</span>}
                  </span>
                  <ChevronRight className='mt-0.5 size-4.25 shrink-0 text-muted-foreground' strokeWidth={2.2} />
                </button>
              );
            })}
          </div>
        </>
      )}

      {past.length > 0 && live.length > 0 && (
        <div className='mt-6.5 text-[11px] font-bold uppercase tracking-[0.04em] text-white'>{t?.pastOrders ?? 'Past orders'}</div>
      )}

      <div className={cn('flex flex-col gap-3', past.length > 0 && live.length > 0 && 'mt-2.75')}>
        {past.map((o) => {
          const summary = (o.items || [])
            .map((it) => it.name)
            .filter(Boolean)
            .join(', ');
          return (
            /*
            Card per the design: logo, name over "<date> · Nr. <order no>", and
            the total with its item count right-aligned. The total used to sit in
            the meta line, which left the order number nowhere to go — and that
            number is what a customer reads out on the phone.
          */
            <div key={o.id} className='rounded-2xl bg-card p-[15px]'>
              <div className='flex items-center gap-3'>
                <span className='flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-white'>
                  {logoURL ? <img src={logoURL} alt='' className='h-full w-full object-contain' /> : <Receipt className='h-5 w-5 text-black' />}
                </span>
                <div className='min-w-0 flex-1'>
                  <div className='truncate text-[14.5px] font-bold'>{o.storeDetails?.name || (t?.order ?? 'Order')}</div>
                  <div className='mt-px truncate text-[12px] font-medium text-muted-foreground'>
                    {formatDateTime(o.orderDate)}
                    {(o.collectionCode || o.orderNumber) && ` · ${t?.orderNumber ?? 'No.'} ${o.collectionCode || o.orderNumber}`}
                  </div>
                </div>
                <div className='shrink-0 text-right'>
                  <div className='text-[14.5px] font-extrabold'>{apiFormatPrice(o.totalOrderPrice)}</div>
                  <div className='mt-px text-[11.5px] font-semibold text-muted-foreground'>
                    {(o.items || []).length} {t?.items ?? 'items'}
                  </div>
                </div>
              </div>
              {summary && <div className='mt-2.5 line-clamp-2 text-[12.5px] font-medium leading-[1.4] text-fg-tertiary'>{summary}</div>}
              <div className='mt-[13px] flex gap-2.5'>
                {/*
                Text only, and the reorder button is white on black — both
                straight from the design, which draws no icons here and does not
                tint this button with the store accent.
              */}
                <button
                  onClick={() => onView(o)}
                  className='flex h-[42px] flex-1 items-center justify-center rounded-xl border-[1.5px] border-elevated bg-transparent text-[13.5px] font-extrabold text-white transition hover:bg-surface-hover active:scale-[0.98]'>
                  {t?.viewOrder ?? 'View'}
                </button>
                <button
                  onClick={() => onReorder(o)}
                  className='flex h-[42px] flex-[1.5] items-center justify-center whitespace-nowrap rounded-xl bg-white text-[13px] font-extrabold text-black transition active:scale-[0.98]'>
                  {t?.reorder ?? 'Reorder'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

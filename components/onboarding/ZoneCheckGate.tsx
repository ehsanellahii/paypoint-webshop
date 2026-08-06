/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Crosshair, Check, AlertCircle, ArrowRight, Phone, Loader2, Clock, Leaf, Star } from 'lucide-react';
import { useGoogleMaps } from '~/hooks/useGoogleMaps';
import { useStore } from '~/contexts/store-context';
import { useAddress, type DeliveryAddress } from '~/contexts/address-context';
import { useLanguage } from '~/contexts/language-context';
import { getPostalRateInfo } from '~/lib/utils';
import { formatPrice } from '@/lib/api';

function parseAddress(place: google.maps.places.PlaceResult | google.maps.GeocoderResult): DeliveryAddress {
  const comps = place.address_components ?? [];
  const get = (type: string) => comps.find((c) => c.types.includes(type))?.long_name;
  const lat = place.geometry?.location?.lat?.() ?? 0;
  const lng = place.geometry?.location?.lng?.() ?? 0;
  return {
    formattedAddress: (place as any).formatted_address ?? (place as any).name ?? '',
    placeId: place.place_id ?? '',
    lat,
    lng,
    streetNumber: get('street_number'),
    route: get('route'),
    postalCode: get('postal_code'),
    locality: get('locality') ?? get('postal_town'),
    adminArea: get('administrative_area_level_1'),
    country: get('country'),
  };
}

type Result = { status: 'ok'; address: DeliveryAddress; min: number | null; fee: number | null } | { status: 'no'; address: DeliveryAddress } | null;

export default function ZoneCheckGate({ onDone }: { onDone: (dismissForever?: boolean) => void }) {
  const { t } = useLanguage();
  const storeInfo = useStore();
  const { setDeliveryAddress, setOrderType } = useAddress();
  const { loaded } = useGoogleMaps(storeInfo?.posGoogleApiKey || '');

  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [continuing, setContinuing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') document.body.classList.add('overlay-open');
    return () => {
      if (typeof document !== 'undefined') document.body.classList.remove('overlay-open');
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const q = query.trim();
    if (q.length < 3) {
      setPredictions([]);
      return;
    }
    const svc = new google.maps.places.AutocompleteService();
    const handle = window.setTimeout(() => {
      setLoading(true);
      svc.getPlacePredictions({ input: q, types: ['address'] }, (res, status) => {
        setLoading(false);
        setPredictions(status === google.maps.places.PlacesServiceStatus.OK && res ? res : []);
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, loaded]);

  const checkAddress = (address: DeliveryAddress) => {
    const rate = getPostalRateInfo(Number(address.postalCode || 0), storeInfo?.postalRates || []);
    setResult(rate.isAvailable ? { status: 'ok', address, min: rate.minimumOrderAmount, fee: rate.deliveryCharges } : { status: 'no', address });
  };

  const pickPrediction = (placeId: string, label: string) => {
    setQuery(label);
    setPredictions([]);
    if (!loaded) return;
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    service.getDetails({ placeId, fields: ['place_id', 'formatted_address', 'address_components', 'geometry', 'name'] }, (place, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return;
      checkAddress(parseAddress(place));
    });
  };

  const useLocation = () => {
    if (!loaded || typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat: pos.coords.latitude, lng: pos.coords.longitude } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const addr = parseAddress(results[0]);
          setQuery(addr.formattedAddress);
          checkAddress(addr);
        }
      });
    });
  };

  const continueToMenu = () => {
    if (result?.status !== 'ok') return;
    setContinuing(true);
    setDeliveryAddress(result.address); // also sets orderType = delivery
    setTimeout(() => onDone(true), 600);
  };

  const brand = storeInfo?.brandName || 'Restaurant';
  const cover = storeInfo?.settings?.logo || storeInfo?.logo || '';

  return (
    <div className='fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-background p-6'>
      <div className='anim-fade grid w-full max-w-[1060px] grid-cols-1 overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)] md:grid-cols-[1.05fr_1fr]'>
        {/* Left hero */}
        <div className='relative hidden min-h-[580px] flex-col justify-between overflow-hidden p-11 md:flex'>
          <div className='absolute inset-0 bg-[#0f0f11] bg-cover bg-center' style={cover ? { backgroundImage: `url("${cover}")` } : undefined} />
          <div className='absolute inset-0 bg-gradient-to-b from-[rgba(15,15,17,0.55)] to-[rgba(15,15,17,0.82)]' />
          <div className='relative flex flex-col leading-[0.9]'>
            <span className='font-script text-[34px] leading-none text-white'>{brand}</span>
          </div>
          <div className='relative'>
            <h2 className='m-0 max-w-[340px] font-serif text-[38px] font-extrabold leading-[1.08] tracking-tight'>{t.zoneHeroTitle ?? 'Real cuisine, fresh to your door.'}</h2>
            <div className='mt-6 flex flex-col gap-3.5'>
              {[
                { icon: Clock, text: t.zoneFeature1 ?? 'Delivered in 20–40 min' },
                { icon: Leaf, text: t.zoneFeature2 ?? 'Fresh ingredients, daily' },
                { icon: Star, text: t.zoneFeature3 ?? '4.8 ★ · 820+ reviews' },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className='flex items-center gap-3'>
                  <span className='flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-white/10 backdrop-blur'>
                    <Icon className='h-[19px] w-[19px]' />
                  </span>
                  <span className='text-[14.5px] font-semibold text-[#e7e8ea]'>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: address check */}
        <div className='relative flex flex-col justify-center p-8 md:p-12'>
          <div className='inline-flex self-start items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-[7px]'>
            <span className='h-[7px] w-[7px] rounded-full bg-success' />
            <span className='text-[11.5px] font-extrabold uppercase tracking-[0.05em] text-[#7fd083]'>{t.deliveryAndPickup ?? 'Delivery & pickup'}</span>
          </div>
          <h1 className='mt-4 text-[34px] font-extrabold leading-[1.05] tracking-tight'>{t.doWeDeliver ?? 'Do we deliver to you?'}</h1>
          <p className='mt-3 max-w-[360px] text-[15px] font-medium leading-relaxed text-muted-foreground'>{t.doWeDeliverSub ?? 'Enter your address — we’ll instantly check if you’re in our delivery area.'}</p>

          {/* Search */}
          <div className='relative mt-6'>
            <div className='flex h-[60px] items-center gap-3 rounded-2xl border border-border bg-background px-4'>
              <Search className='h-5 w-5 shrink-0 text-muted-foreground' />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setResult(null);
                }}
                placeholder={t.streetHouseAndPostcode ?? 'Street, house no. & postcode'}
                autoComplete='off'
                className='min-w-0 flex-1 border-none bg-transparent text-[15px] font-semibold text-white outline-none'
              />
              {loading && <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />}
            </div>
            {predictions.length > 0 && (
              <div className='absolute inset-x-0 top-full z-[6] mt-2 overflow-hidden rounded-[15px] border border-border bg-surface-2 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]'>
                {predictions.slice(0, 5).map((p) => (
                  <button
                    key={p.place_id}
                    onClick={() => pickPrediction(p.place_id, p.structured_formatting?.main_text ?? p.description)}
                    className='flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left last:border-b-0 hover:bg-[#303034]'>
                    <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-card'>
                      <MapPin className='h-4 w-4 text-muted-foreground' />
                    </span>
                    <span className='min-w-0 flex-1'>
                      <span className='block truncate text-sm font-bold'>{p.structured_formatting?.main_text ?? p.description}</span>
                      <span className='block truncate text-xs font-medium text-muted-foreground'>{p.structured_formatting?.secondary_text ?? ''}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Use location */}
          <button onClick={useLocation} className='mt-2.5 flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left transition hover:bg-surface-1'>
            <span className='flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-surface-1'>
              <Crosshair className='h-[17px] w-[17px]' />
            </span>
            <span className='text-sm font-bold'>{t.useCurrentLocation ?? 'Use current location'}</span>
          </button>

          {/* Result: OK */}
          {result?.status === 'ok' && (
            <>
              <div className='anim-fade mt-3.5 flex items-center gap-3 rounded-2xl border border-success/40 bg-success/10 p-4'>
                <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success'>
                  <Check className='h-[19px] w-[19px] text-[#0d1f14]' strokeWidth={2.6} />
                </span>
                <div className='min-w-0 flex-1'>
                  <div className='text-[15px] font-extrabold'>{t.weDeliverToYou ?? 'Yay, we deliver to you!'}</div>
                  <div className='mt-0.5 text-[12.5px] font-medium text-[#b9bbbf]'>
                    {(t.deliveryTimeApprox ?? 'Delivery approx. 20–40 min')}
                    {result.min != null && ` · ${t.from ?? 'from'} ${formatPrice(result.min)}`}
                  </div>
                </div>
              </div>
              <button onClick={continueToMenu} className='mt-3.5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15.5px] font-extrabold text-selected-text transition active:scale-[0.98]'>
                {continuing ? <Loader2 className='h-5 w-5 animate-spin' /> : (
                  <>
                    {t.continueToMenu ?? 'Continue to menu'} <ArrowRight className='h-[17px] w-[17px]' />
                  </>
                )}
              </button>
            </>
          )}

          {/* Result: out of zone */}
          {result?.status === 'no' && (
            <>
              <div className='anim-fade mt-3.5 flex items-center gap-3 rounded-2xl border border-brand-red/40 bg-brand-red/10 p-4'>
                <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-red/20'>
                  <AlertCircle className='h-[19px] w-[19px] text-brand-red' />
                </span>
                <div className='min-w-0 flex-1'>
                  <div className='text-[15px] font-extrabold'>{t.outsideDeliveryArea ?? 'Unfortunately still outside'}</div>
                  <div className='mt-0.5 text-[12.5px] font-medium text-[#d6b3ae]'>{t.outsideDeliveryAreaSub ?? 'This address is outside our delivery area.'}</div>
                </div>
              </div>
              <div className='mt-3 flex gap-2.5'>
                <button onClick={() => { setResult(null); setQuery(''); }} className='h-14 flex-1 rounded-2xl border border-border-strong bg-transparent font-bold text-white transition hover:bg-surface-1'>
                  {t.checkAnotherAddress ?? 'Check another address'}
                </button>
                {storeInfo?.phone && (
                  <a href={`tel:${storeInfo.phone}`} className='flex h-14 items-center gap-2 rounded-2xl bg-primary px-5 font-extrabold text-selected-text transition active:scale-[0.97]'>
                    <Phone className='h-[17px] w-[17px]' />
                    {t.callUs ?? 'Call'}
                  </a>
                )}
              </div>
              <button onClick={() => { setOrderType('pickup'); onDone(true); }} className='mt-2.5 flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] text-sm font-bold text-muted-foreground transition hover:text-white'>
                {t.switchToPickupBrowse ?? 'Switch to pickup & browse'} <ArrowRight className='h-4 w-4' />
              </button>
            </>
          )}

          {/* Skip */}
          {!result && (
            <button onClick={() => onDone(true)} className='mt-4 flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-white'>
              {t.exploreShopAnyway ?? 'Explore the shop anyway'} <ArrowRight className='h-4 w-4' />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

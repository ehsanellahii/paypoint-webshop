'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Crosshair, Check, AlertCircle, ArrowRight, ChevronLeft, Phone, Loader2, Clock, Leaf } from 'lucide-react';
import { SAFE_TOP } from '~/components/mobile/MobileShell';
import { isKeyRefused, MAPS_AUTH_ERROR, useGoogleMaps } from '~/hooks/useGoogleMaps';
import { useIsMobile } from '~/contexts/device-context';
import { useStore } from '~/contexts/store-context';
import { useAddress, type DeliveryAddress } from '~/contexts/address-context';
import { useLanguage } from '~/contexts/language-context';
import { cn, getPostalRateInfo } from '~/lib/utils';
import { getStoreCover } from '~/lib/storeMedia';
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

/** The design enables the check button once more than three characters are typed. */
const MIN_QUERY = 3;

/**
 * The design's own "use my location" glyph: a centre dot with four detached
 * ticks. Inlined rather than taken from lucide — its `Crosshair` draws a full
 * outer ring and edge-to-edge lines, which reads much heavier at 17px.
 * Geometry copied verbatim from the handover; `currentColor` replaces the
 * design's hardcoded #fff so the icon still follows the button's text colour.
 */
function LocateIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 20 20'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.9}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
      className={className}>
      <circle cx='10' cy='10' r='3' />
      <path d='M10 1.5v3M10 15.5v3M18.5 10h-3M4.5 10h-3' />
    </svg>
  );
}

type Result =
  | {
      status: 'ok';
      address: DeliveryAddress;
      min: number | null;
      fee: number | null;
    }
  | { status: 'no'; address: DeliveryAddress }
  | null;

export default function ZoneCheckGate({ onDone }: { onDone: (dismissForever?: boolean) => void }) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const storeInfo = useStore();
  const { setDeliveryAddress, setOrderType, saveAddress } = useAddress();
  const { loaded, error: mapsError } = useGoogleMaps(storeInfo?.posGoogleApiKey || '');

  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [continuing, setContinuing] = useState(false);
  const [checking, setChecking] = useState(false);
  /* Set when a Places/Geocoder request comes back refused — see isKeyRefused. */
  const [lookupError, setLookupError] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  /*
   * The query value we filled in ourselves — by picking a suggestion or by
   * geolocating. The lookup effect below keys on `query`, so without this it
   * searches for the address we just resolved and re-opens the dropdown on top
   * of the availability result. Cleared as soon as the customer types again.
   */
  const autofilled = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') document.body.classList.add('overlay-open');
    return () => {
      if (typeof document !== 'undefined') document.body.classList.remove('overlay-open');
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    // Already resolved by us — nothing to look up, and the list must stay shut.
    if (autofilled.current === query) {
      setPredictions((prev) => (prev.length ? [] : prev));
      return;
    }
    const q = query.trim();
    // Too-short input clears on the next tick rather than after the debounce,
    // so deleting the query drops the dropdown at once.
    const handle = window.setTimeout(
      () => {
        if (q.length < 3) {
          setPredictions([]);
          return;
        }
        setLoading(true);
        const svc = new google.maps.places.AutocompleteService();
        svc.getPlacePredictions({ input: q, types: ['address'] }, (res, status) => {
          setLoading(false);
          if (isKeyRefused(status)) setLookupError(MAPS_AUTH_ERROR);
          setPredictions(status === google.maps.places.PlacesServiceStatus.OK && res ? res : []);
        });
      },
      q.length < 3 ? 0 : 250,
    );
    return () => window.clearTimeout(handle);
  }, [query, loaded]);

  const checkAddress = (address: DeliveryAddress) => {
    // Every path into a result ends here, so this is the one place that has to
    // close the dropdown — including "check" pressed with the list still open.
    setPredictions([]);
    const rate = getPostalRateInfo(Number(address.postalCode || 0), storeInfo?.postalRates || []);
    setResult(
      rate.isAvailable
        ? {
            status: 'ok',
            address,
            min: rate.minimumOrderAmount,
            fee: rate.deliveryCharges,
          }
        : { status: 'no', address },
    );
  };

  const pickPrediction = (placeId: string, label: string) => {
    autofilled.current = label;
    setQuery(label);
    setPredictions([]);
    if (!loaded) return;
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    service.getDetails(
      {
        placeId,
        fields: ['place_id', 'formatted_address', 'address_components', 'geometry', 'name'],
      },
      (place, status) => {
        if (isKeyRefused(status)) setLookupError(MAPS_AUTH_ERROR);
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return;
        checkAddress(parseAddress(place));
      },
    );
  };

  const useLocation = () => {
    if (!loaded || typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat: pos.coords.latitude, lng: pos.coords.longitude } }, (results, status) => {
        if (isKeyRefused(status)) setLookupError(MAPS_AUTH_ERROR);
        if (status === 'OK' && results && results[0]) {
          const addr = parseAddress(results[0]);
          autofilled.current = addr.formattedAddress;
          setQuery(addr.formattedAddress);
          checkAddress(addr);
        }
      });
    });
  };

  /*
   * The design checks the typed address on a button press. It can do that
   * synchronously because its reference build fakes the answer with a regex;
   * we have to geocode what was typed first, which is why this button carries
   * a loading state the design's does not.
   *
   * Picking a suggestion still checks straight away — this is for someone who
   * types an address and presses the button without touching the dropdown.
   */
  const runCheck = () => {
    const typed = query.trim();
    if (typed.length <= MIN_QUERY || checking || !loaded) return;
    setChecking(true);
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: typed }, (results, status) => {
      setChecking(false);
      if (isKeyRefused(status)) setLookupError(MAPS_AUTH_ERROR);
      /*
       * Only decide when we actually resolved an address. A geocode that finds
       * nothing means we could not read what was typed — saying "outside our
       * area" there would turn a typo into a lost order.
       */
      if (status === 'OK' && results && results[0]) {
        checkAddress(parseAddress(results[0]));
      }
    });
  };

  const continueToMenu = () => {
    if (result?.status !== 'ok') return;
    setContinuing(true);
    /*
     * Keep it in the address book too, not just as the active address.
     * Every other entry point goes through DeliveryAddressModal, which saves on
     * commit; this gate used to set only the active address, so the header's
     * address dialog opened on an empty "add your first address" form right
     * after the customer had entered one.
     */
    saveAddress(result.address);
    setDeliveryAddress(result.address); // also sets orderType = delivery
    setTimeout(() => onDone(true), 600);
  };

  const brand = storeInfo?.brandName || 'Restaurant';
  const cover = getStoreCover(storeInfo);
  const logo = storeInfo?.settings?.logo || storeInfo?.logo || '';

  const view: ZoneViewProps = {
    t,
    brand,
    cover,
    logo,
    query,
    predictions,
    loading,
    result,
    continuing,
    phone: storeInfo?.phone || '',
    inputRef,
    onQueryChange: (value) => {
      // Typing again means the value is no longer one we resolved, so
      // suggestions resume.
      autofilled.current = null;
      setQuery(value);
      setResult(null);
    },
    onPick: pickPrediction,
    onUseLocation: useLocation,
    onContinue: continueToMenu,
    onReset: () => {
      // Must clear too, or retyping that exact address later would be mistaken
      // for an autofill and silently show no suggestions.
      autofilled.current = null;
      setResult(null);
      setQuery('');
    },
    onPickup: () => {
      setOrderType('pickup');
      onDone(true);
    },
    onSkip: () => onDone(true),
    onCheck: runCheck,
    checking,
    canCheck: query.trim().length > MIN_QUERY && !checking && !mapsError && !lookupError,
    mapsError: mapsError || lookupError,
  };

  // A phone gets a full screen: the split panel's hero column is hidden below
  // `md` anyway, which left the form alone in a floating card with nothing
  // beside it.
  return isMobile ? <MobileZoneScreen {...view} /> : <DesktopZonePanel {...view} />;
}

type ZoneViewProps = {
  t: ReturnType<typeof useLanguage>['t'];
  brand: string;
  cover: string;
  logo: string;
  query: string;
  predictions: google.maps.places.AutocompletePrediction[];
  loading: boolean;
  result: Result;
  continuing: boolean;
  phone: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onQueryChange: (value: string) => void;
  onPick: (placeId: string, label: string) => void;
  onUseLocation: () => void;
  onContinue: () => void;
  onReset: () => void;
  onPickup: () => void;
  onSkip: () => void;
  onCheck: () => void;
  checking: boolean;
  canCheck: boolean;
  mapsError: string;
};

function DesktopZonePanel({
  t,
  brand,
  cover,
  logo,
  query,
  predictions,
  loading,
  result,
  continuing,
  phone,
  inputRef,
  onQueryChange,
  onPick,
  onUseLocation,
  onContinue,
  onReset,
  onPickup,
  onCheck,
  checking,
  canCheck,
  mapsError,
}: ZoneViewProps) {
  return (
    <div className='fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-background p-6'>
      <div className='anim-fade grid w-full max-w-[1060px] grid-cols-1 overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)] md:grid-cols-[1.05fr_1fr]'>
        {/* Left hero */}
        <div className='relative hidden min-h-[580px] flex-col justify-between overflow-hidden p-11 md:flex'>
          <div
            className='absolute inset-0 bg-[#0f0f11] bg-top bg-no-repeat'
            style={cover ? { backgroundImage: `url("${cover}")`, backgroundSize: '100% auto' } : undefined}
          />
          <div className='absolute inset-0 bg-gradient-to-b from-[rgba(15,15,17,0.55)] to-[rgba(15,15,17,0.82)]' />
          <div className='relative flex flex-col items-start leading-[0.9]'>
            {/* The design shows the logo here, same as the auth hero; the
                script wordmark is only the fallback for a store without one. */}
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={brand} className='block h-[76px] w-auto self-start rounded-[14px]' />
            ) : (
              <span className='font-script text-[34px] leading-none text-white'>{brand}</span>
            )}
          </div>
          <div className='relative'>
            <h2 className='m-0 max-w-[340px] font-serif text-[38px] font-extrabold leading-[1.08] tracking-tight'>{t.zoneHeroTitle ?? 'Real cuisine, fresh to your door.'}</h2>
            <div className='mt-6 flex flex-col gap-3.5'>
              {[
                {
                  icon: Clock,
                  text: t.zoneFeature1 ?? 'Delivered in 20–40 min',
                },
                {
                  icon: Leaf,
                  text: t.zoneFeature2 ?? 'Fresh ingredients, daily',
                },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className='flex items-center gap-3'>
                  <span className='flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-white/10 backdrop-blur'>
                    <Icon className='h-[19px] w-[19px]' />
                  </span>
                  <span className='text-[14.5px] font-semibold text-fg-strong'>{text}</span>
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
          <p className='mt-3 max-w-[360px] text-[15px] font-medium leading-relaxed text-muted-foreground'>
            {t.doWeDeliverSub ?? 'Enter your address — we’ll instantly check if you’re in our delivery area.'}
          </p>

          {/* Search */}
          <div className='relative mt-6'>
            <div className='flex h-[60px] items-center gap-3 rounded-2xl border border-border bg-background px-4'>
              <Search className='h-5 w-5 shrink-0 text-muted-foreground' />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
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
                    onClick={() => onPick(p.place_id, p.structured_formatting?.main_text ?? p.description)}
                    className='flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left last:border-b-0 hover:bg-surface-suggest'>
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
          <button onClick={onUseLocation} className='mt-2.5 flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left transition hover:bg-surface-hover'>
            <span className='flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-surface-1'>
              <LocateIcon className='h-[17px] w-[17px]' />
            </span>
            <span className='text-sm font-bold'>{t.useCurrentLocation ?? 'Use current location'}</span>
          </button>

          {/*
            A rejected key used to be invisible: the SDK logs to the console and
            the address box simply stops finding anything. Say so on screen, and
            point at the two routes that still work without a lookup.
          */}
          {mapsError && (
            <div className='anim-fade mt-3.5 flex items-start gap-3 rounded-2xl border border-brand-red/40 bg-brand-red/10 p-4' role='alert'>
              <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-red/20'>
                <AlertCircle className='h-[19px] w-[19px] text-brand-red' />
              </span>
              <div className='min-w-0 flex-1'>
                <div className='text-[15px] font-extrabold'>{t.addressLookupUnavailable ?? 'Address search is unavailable'}</div>
                <div className='mt-0.5 text-[12.5px] font-medium text-[#d6b3ae]'>{t.addressLookupUnavailableSub ?? 'Choose pickup, or call us and we’ll check for you.'}</div>
                {process.env.NODE_ENV !== 'production' && <div className='mt-1.5 font-mono text-[11px] text-muted-foreground-2'>{mapsError}</div>}
              </div>
            </div>
          )}

          {/*
            Check CTA. Two states, straight from the design: enabled is the
            store's primary on its selected-text colour (#fff on #000 by
            default), disabled is #2a2a2c / #6b6d72 — the --surface-3 and
            --muted-foreground-2 tokens. The spinner is the design's continue
            button spinner, which is the only one it specifies.
          */}
          {!result && (
            <button
              onClick={onCheck}
              disabled={!canCheck}
              aria-busy={checking}
              className={cn(
                'mt-3.5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15.5px] font-extrabold transition',
                canCheck
                  ? 'cursor-pointer bg-primary text-selected-text active:scale-[0.98]'
                  : 'cursor-not-allowed bg-surface-3 text-muted-foreground-2',
              )}>
              {checking ? (
                <>
                  <Loader2 className='h-5 w-5 animate-spin' />
                  {t.loading ?? 'Loading...'}
                </>
              ) : (
                t.checkDeliveryArea ?? 'Check delivery area'
              )}
            </button>
          )}

          {/* Result: OK */}
          {result?.status === 'ok' && (
            <>
              <div className='anim-fade mt-3.5 flex items-center gap-3 rounded-2xl border border-success/40 bg-success/10 p-4'>
                <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success'>
                  <Check className='h-[19px] w-[19px] text-[#0d1f14]' strokeWidth={2.6} />
                </span>
                <div className='min-w-0 flex-1'>
                  <div className='text-[15px] font-extrabold'>{t.weDeliverToYou ?? 'Yay, we deliver to you!'}</div>
                  <div className='mt-0.5 text-[12.5px] font-medium text-fg-secondary'>
                    {t.deliveryTimeApprox ?? 'Delivery approx. 20–40 min'}
                    {result.min != null && ` · ${t.from ?? 'from'} ${formatPrice(result.min)}`}
                  </div>
                </div>
              </div>
              <button
                onClick={onContinue}
                className='mt-3.5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15.5px] font-extrabold text-selected-text transition active:scale-[0.98]'>
                {continuing ? (
                  <Loader2 className='h-5 w-5 animate-spin' />
                ) : (
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
                <button onClick={onReset} className='h-14 flex-1 rounded-2xl border border-border-strong bg-transparent font-bold text-white transition hover:bg-surface-hover'>
                  {t.checkAnotherAddress ?? 'Check another address'}
                </button>
                {phone && (
                  <a href={`tel:${phone}`} className='flex h-14 items-center gap-2 rounded-2xl bg-primary px-5 font-extrabold text-selected-text transition active:scale-[0.97]'>
                    <Phone className='h-[17px] w-[17px]' />
                    {t.callUs ?? 'Call'}
                  </a>
                )}
              </div>
              <button onClick={onPickup} className='mt-2.5 flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] text-sm font-bold text-muted-foreground transition hover:text-white'>
                {t.switchToPickupBrowse ?? 'Switch to pickup & browse'} <ArrowRight className='h-4 w-4' />
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

/**
 * The delivery-zone check as a full screen (mobile).
 *
 * Follows the design's own zone screen: a radial glow behind a centred logo and
 * headline, the search field below it, and the outcome stacked underneath —
 * rather than the desktop panel, whose hero column never renders at this width.
 */
function MobileZoneScreen({
  t,
  brand,
  logo,
  query,
  predictions,
  loading,
  result,
  continuing,
  phone,
  inputRef,
  onQueryChange,
  onPick,
  onUseLocation,
  onContinue,
  onReset,
  onPickup,
  onCheck,
  checking,
  canCheck,
  mapsError,
  onSkip,
}: ZoneViewProps) {
  return (
    <div className='noscroll fixed inset-0 z-[89] flex justify-center overflow-y-auto bg-background'>
      <div className='relative w-full max-w-[440px]'>
        {/* Glow bleeding in from above the headline */}
        <div
          className='pointer-events-none absolute left-1/2 top-[-100px] h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(138,208,242,0.16)_0%,transparent_70%)]'
          aria-hidden
        />

        <div className='relative flex min-h-full flex-col px-6 pb-9' style={{ paddingTop: SAFE_TOP }}>
          <button onClick={onSkip} aria-label={t.close} className='flex h-[42px] w-[42px] items-center justify-center rounded-full bg-card text-white transition active:scale-90'>
            <ChevronLeft className='h-5 w-5' strokeWidth={2.2} />
          </button>

          <div className='mt-[30px] flex flex-col items-center text-center'>
            {logo ? <img src={logo} alt='' className='h-[62px] w-[62px] rounded-[18px] object-cover' /> : <span className='font-script text-[30px] leading-none text-white'>{brand}</span>}
            <h1 className='m-0 mt-[26px] text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em] text-white'>{t.doWeDeliver ?? 'Do we deliver to you?'}</h1>
            <p className='mt-[11px] max-w-[280px] text-[14.5px] font-medium leading-relaxed text-muted-foreground'>
              {t.doWeDeliverSub ?? 'Enter your address — we’ll instantly check if you’re in our delivery area.'}
            </p>
          </div>

          {/* Search */}
          <div className='relative mt-[30px]'>
            <div className='flex h-[58px] items-center gap-3 rounded-2xl border-[1.5px] border-border bg-card px-4'>
              <Search className='h-5 w-5 shrink-0 text-muted-foreground' />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder={t.streetHouseAndPostcode ?? 'Street, house no. & postcode'}
                autoComplete='off'
                className='min-w-0 flex-1 border-none bg-transparent text-[15px] font-semibold text-white'
              />
              {loading && <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />}
            </div>
            {predictions.length > 0 && (
              <div className='absolute inset-x-0 top-full z-[7] mt-2 overflow-hidden rounded-[15px] border border-border bg-surface-1 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]'>
                {predictions.slice(0, 5).map((p) => (
                  <button
                    key={p.place_id}
                    onClick={() => onPick(p.place_id, p.structured_formatting?.main_text ?? p.description)}
                    className='flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left last:border-b-0 active:bg-surface-suggest'>
                    <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-card'>
                      <MapPin className='h-4 w-4 text-muted-foreground' />
                    </span>
                    <span className='min-w-0 flex-1'>
                      <span className='block truncate text-sm font-bold text-white'>{p.structured_formatting?.main_text ?? p.description}</span>
                      <span className='block truncate text-xs font-medium text-muted-foreground'>{p.structured_formatting?.secondary_text ?? ''}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Use location */}
          <button onClick={onUseLocation} className='mt-2.5 flex w-full items-center gap-3 rounded-[14px] px-2 py-3 text-left'>
            <span className='flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-surface-1'>
              <Crosshair className='h-[17px] w-[17px] text-white' />
            </span>
            <span className='text-sm font-bold text-white'>{t.useCurrentLocation ?? 'Use current location'}</span>
          </button>

          {/*
            A rejected key used to be invisible: the SDK logs to the console and
            the address box simply stops finding anything. Say so on screen, and
            point at the two routes that still work without a lookup.
          */}
          {mapsError && (
            <div className='anim-fade mt-3.5 flex items-start gap-3 rounded-2xl border border-brand-red/40 bg-brand-red/10 p-4' role='alert'>
              <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-red/20'>
                <AlertCircle className='h-[19px] w-[19px] text-brand-red' />
              </span>
              <div className='min-w-0 flex-1'>
                <div className='text-[15px] font-extrabold'>{t.addressLookupUnavailable ?? 'Address search is unavailable'}</div>
                <div className='mt-0.5 text-[12.5px] font-medium text-[#d6b3ae]'>{t.addressLookupUnavailableSub ?? 'Choose pickup, or call us and we’ll check for you.'}</div>
                {process.env.NODE_ENV !== 'production' && <div className='mt-1.5 font-mono text-[11px] text-muted-foreground-2'>{mapsError}</div>}
              </div>
            </div>
          )}

          {/* Check CTA — same two states as the desktop panel. */}
          {!result && (
            <button
              onClick={onCheck}
              disabled={!canCheck}
              aria-busy={checking}
              className={cn(
                'mt-3.5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15.5px] font-extrabold transition',
                canCheck ? 'bg-primary text-selected-text active:scale-[0.98]' : 'bg-surface-3 text-muted-foreground-2',
              )}>
              {checking ? (
                <>
                  <Loader2 className='h-5 w-5 animate-spin' />
                  {t.loading ?? 'Loading...'}
                </>
              ) : (
                t.checkDeliveryArea ?? 'Check delivery area'
              )}
            </button>
          )}

          {/* Result: in zone */}
          {result?.status === 'ok' && (
            <>
              <div className='anim-fade mt-3.5 flex items-center gap-3 rounded-2xl border border-success/40 bg-success/10 p-4'>
                <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success'>
                  <Check className='h-[19px] w-[19px] text-[#0d1f14]' strokeWidth={2.6} />
                </span>
                <div className='min-w-0 flex-1'>
                  <div className='text-[15px] font-extrabold text-white'>{t.weDeliverToYou ?? 'Yay, we deliver to you!'}</div>
                  <div className='mt-0.5 text-[12.5px] font-medium text-fg-secondary'>
                    {t.deliveryTimeApprox ?? 'Delivery approx. 20–40 min'}
                    {result.min != null && ` · ${t.from ?? 'from'} ${formatPrice(result.min)}`}
                  </div>
                </div>
              </div>
              <button
                onClick={onContinue}
                className='mt-3.5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15.5px] font-extrabold text-selected-text transition active:scale-[0.98]'>
                {continuing ? (
                  <Loader2 className='h-5 w-5 animate-spin' />
                ) : (
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
                  <div className='text-[15px] font-extrabold text-white'>{t.outsideDeliveryArea ?? 'Unfortunately still outside'}</div>
                  <div className='mt-0.5 text-[12.5px] font-medium text-[#d6b3ae]'>{t.outsideDeliveryAreaSub ?? 'This address is outside our delivery area.'}</div>
                </div>
              </div>
              {/* Stacked, not side by side: two 14px labels do not survive a 440px row. */}
              <button onClick={onReset} className='mt-3 h-14 w-full rounded-2xl border-[1.5px] border-border-strong text-[15px] font-bold text-white transition active:scale-[0.98]'>
                {t.checkAnotherAddress ?? 'Check another address'}
              </button>
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className='mt-2.5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-extrabold text-selected-text transition active:scale-[0.98]'>
                  <Phone className='h-[17px] w-[17px]' />
                  {t.callUs ?? 'Call'}
                </a>
              )}
              <button onClick={onPickup} className='mt-2.5 flex h-[50px] w-full items-center justify-center gap-2 text-sm font-bold text-muted-foreground'>
                {t.switchToPickupBrowse ?? 'Switch to pickup & browse'} <ArrowRight className='h-4 w-4' />
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

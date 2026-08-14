'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { AlertCircle, Loader2, MapPin, Phone, Plus, Search, X } from 'lucide-react';
import { cn, getPostalRateInfo } from '~/lib/utils';
import { isKeyRefused, MAPS_AUTH_ERROR, useGoogleMaps } from '~/hooks/useGoogleMaps';
import { useLanguage } from '~/contexts/language-context';
import { useStore } from '~/contexts/store-context';
import { useAddress, type DeliveryAddress } from '~/contexts/address-context';
import { useIsMobile } from '~/contexts/device-context';
import MobileSheet from '~/components/mobile/MobileSheet';

type AddressParts = {
  formattedAddress: string;
  placeId: string;
  lat: number;
  lng: number;

  streetNumber?: string;
  route?: string;
  postalCode?: string;
  locality?: string; // city
  adminArea?: string; // state/region
  country?: string;

  // Useful for backend
  raw?: google.maps.places.PlaceResult;
};

type DeliveryAddressModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (address: AddressParts) => void;
  googleApiKey: string;
  onSuccess?: () => void;
};

function parseAddress(place: google.maps.places.PlaceResult): AddressParts {
  const comps = place.address_components ?? [];
  const get = (type: string) => comps.find((c) => c.types.includes(type))?.long_name;

  const lat = place.geometry?.location?.lat?.() ?? 0;
  const lng = place.geometry?.location?.lng?.() ?? 0;

  return {
    formattedAddress: place.formatted_address ?? place.name ?? '',
    placeId: place.place_id ?? '',
    lat,
    lng,
    streetNumber: get('street_number'),
    route: get('route'),
    postalCode: get('postal_code'),
    locality: get('locality') ?? get('postal_town'),
    adminArea: get('administrative_area_level_1'),
    country: get('country'),
    raw: place,
  };
}

function validateAddress(a: AddressParts, t: any) {
  const missing: string[] = [];
  if (!a.streetNumber) missing.push(t.houseStreetNumber);
  if (!a.route) missing.push(t.streetName);
  if (!a.postalCode) missing.push(t.postalCode);
  return {
    ok: missing.length === 0,
    message: missing.length === 0 ? '' : `${t.pleaseSelectCompleteAddress} ${missing.join(', ')}.`,
  };
}

/** `raw` holds the whole Google PlaceResult — useful in memory, far too big for localStorage. */
function toDeliveryAddress(a: AddressParts): DeliveryAddress {
  const plain = { ...a };
  delete plain.raw;
  return plain;
}

/** First line of an address row: "Genter Str. 69", falling back to the formatted string. */
function shortLine(a: DeliveryAddress) {
  const line = `${a.route ?? ''} ${a.streetNumber ?? ''}`.trim();
  return line || a.formattedAddress;
}

export default function DeliveryAddressModal({ open, onClose, onSelect, googleApiKey, onSuccess }: DeliveryAddressModalProps) {
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const storeInfo = useStore();
  const { deliveryAddress, savedAddresses, saveAddress, removeSavedAddress, setOrderType } = useAddress();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 'list' shows the address book, 'form' the search + save flow. The sheet
  // opens straight into the form while the book is still empty.
  const [mode, setMode] = useState<'list' | 'form'>('list');

  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [typingError, setTypingError] = useState<string>('');
  const [selectionError, setSelectionError] = useState<string>('');
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // An address chosen from the suggestions but not yet confirmed with "Save".
  const [picked, setPicked] = useState<AddressParts | null>(null);
  const [label, setLabel] = useState<string | undefined>(undefined);

  const { loaded, error } = useGoogleMaps(googleApiKey);
  const canUseGoogle = loaded;

  const LABELS = useMemo(() => [t.labelHome, t.labelWork, t.labelOther], [t]);

  // A store with no postal rates at all has no delivery zone to fail — treating
  // "no rates configured" as "out of area" would reject every address.
  const hasZones = (storeInfo?.postalRates?.length ?? 0) > 0;
  const outOfZone = !!picked && hasZones && !getPostalRateInfo(Number(picked.postalCode || 0), storeInfo?.postalRates || []).isAvailable;

  const resetForm = () => {
    setQuery('');
    setPredictions([]);
    setTypingError('');
    setSelectionError('');
    setActiveIndex(-1);
    setPicked(null);
    setLabel(undefined);
  };

  // Reset when opened
  useEffect(() => {
    if (!open) return;
    resetForm();
    setMode(savedAddresses.length > 0 ? 'list' : 'form');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && mode === 'form') requestAnimationFrame(() => inputRef.current?.focus());
  }, [open, mode]);

  // Debounced autocomplete
  useEffect(() => {
    if (!open || mode !== 'form' || !loaded) return;

    if (!canUseGoogle) {
      setTypingError(t.googleMapNotLoadedError);
      return;
    }

    const q = query.trim();
    setSelectionError('');

    if (q.length === 0) {
      setPredictions([]);
      setTypingError('');
      return;
    }

    // Lightweight typing hint (while user types)
    // (Real validation happens on selection via place details)
    if (q.length < 6) {
      setTypingError(t.typeMoreDetailsError);
    } else {
      setTypingError('');
    }

    const svc = new google.maps.places.AutocompleteService();

    const handle = window.setTimeout(() => {
      setLoading(true);
      svc.getPlacePredictions({ input: q, types: ['address'] }, (res, status) => {
        setLoading(false);
        // A refused key answers every request the same way; say so rather than
        // showing an empty dropdown that looks like "no such address".
        if (isKeyRefused(status)) setSelectionError(t.addressLookupUnavailableSub);
        if (status !== google.maps.places.PlacesServiceStatus.OK || !res) {
          setPredictions([]);
          return;
        }
        setPredictions(res);
      });
    }, 250);

    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, loaded, open, mode, canUseGoogle]);

  /** Hand an address to the caller and close. */
  const select = (a: DeliveryAddress) => {
    onSelect(a);
    onSuccess?.();
    onClose();
  };

  /** Confirm a newly searched address: persist it to the book, then select it. */
  const commit = (a: AddressParts, withLabel?: string) => {
    const plain = toDeliveryAddress(a);
    saveAddress(plain, withLabel);
    select(plain);
  };

  const fetchPlaceDetails = (placeId: string) => {
    if (!canUseGoogle) return;

    setLoading(true);
    setSelectionError('');

    // PlacesService requires a DOM node
    const dummy = document.createElement('div');
    const service = new google.maps.places.PlacesService(dummy);

    service.getDetails({ placeId, fields: ['place_id', 'formatted_address', 'address_components', 'geometry', 'name'] }, (place, status) => {
      setLoading(false);
      if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
        setSelectionError(isKeyRefused(status) ? t.addressLookupUnavailableSub : t.couldNotFetchAddressDetails);
        return;
      }

      const parsed = parseAddress(place);
      const v = validateAddress(parsed, t);

      if (!v.ok) {
        setSelectionError(v.message);
        return;
      }

      // Held rather than committed, so the customer can still tag it or be told
      // it falls outside the delivery area before anything is saved.
      setPicked(parsed);
      setPredictions([]);
      setQuery(parsed.formattedAddress);
      setTypingError('');
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (predictions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, predictions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault();
        fetchPlaceDetails(predictions[activeIndex].place_id);
      }
    }
  };

  /* ------------------------------------------------------------------ views */

  const canSave = !!picked && !outOfZone;
  const currentId = deliveryAddress?.placeId || deliveryAddress?.formattedAddress;

  /*
   * One dialog, three bodies. The shell is written out once rather than wrapped
   * in a local component — a component declared inside render is a new type on
   * every pass, which would remount the search input (and drop its focus) on
   * every keystroke.
   */
  let sub = t.startTypeAndChooseAddress;
  let body: React.ReactNode;

  if (error) {
    sub = t.googleMapNotLoadedError;
    body = (
      <>
        {/* A rejected key arrives as a code, not a sentence — say something a guest can act on. */}
        <div className='rounded-2xl border border-border bg-surface-1 px-4 py-4 text-[13.5px] font-semibold text-brand-red'>
          {error === MAPS_AUTH_ERROR ? (t.addressLookupUnavailableSub ?? 'Address search is unavailable right now.') : error}
        </div>
        <button onClick={onClose} type='button' className='mt-3.5 h-[54px] w-full rounded-[15px] bg-surface-3 text-[14.5px] font-bold text-white transition hover:bg-elevated'>
          {t.close}
        </button>
      </>
    );
  } else if (!loaded) {
    sub = t.pleaseWait;
    body = (
      <div className='flex items-center justify-center gap-3 py-8 text-sm font-semibold text-muted-foreground'>
        <Loader2 className='h-5 w-5 animate-spin' />
        {t.loadingMaps}…
      </div>
    );
  } else if (mode === 'list') {
    sub = t.addressBookSub;
    body = (
      <div role='radiogroup' aria-label={t.deliveryAddress} className='flex flex-col gap-2.5'>
          {savedAddresses.map((a) => {
            const selected = a.id === currentId;
            return (
              <div
                key={a.id}
                className={cn('flex items-center gap-3 rounded-[14px] border-2 p-3 transition', selected ? 'border-white bg-surface-selected' : 'border-transparent bg-surface-3 hover:bg-elevated')}>
                <button
                  type='button'
                  role='radio'
                  aria-checked={selected}
                  onClick={() => select(a)}
                  className='flex min-w-0 flex-1 items-center gap-3 text-left'>
                  <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-card'>
                    <MapPin className='h-5 w-5' strokeWidth={1.7} />
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate text-[15px] font-bold'>{a.label || shortLine(a)}</span>
                    <span className='mt-0.5 block truncate text-[12.5px] font-medium text-muted-foreground'>{a.formattedAddress}</span>
                  </span>
                  <span className={cn('flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2', selected ? 'border-white' : 'border-fg-faint')}>
                    {selected && <span className='h-[11px] w-[11px] rounded-full bg-white' />}
                  </span>
                </button>
                <button
                  type='button'
                  aria-label={t.deleteAddress}
                  onClick={() => removeSavedAddress(a.id)}
                  className='flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] text-delete transition hover:bg-[rgba(255,82,71,0.14)]'>
                  <X className='h-[17px] w-[17px]' strokeWidth={2.2} />
                </button>
              </div>
            );
          })}

          <button
            type='button'
            onClick={() => {
              resetForm();
              setMode('form');
            }}
            className='mt-1 flex h-[52px] items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-outline-soft text-[14.5px] font-bold text-white transition hover:border-border-strong hover:bg-surface-hover'>
            <Plus className='h-[17px] w-[17px]' strokeWidth={2.4} />
            {t.addNewAddress}
          </button>
      </div>
    );
  } else {
    body = (
      <div className='flex flex-col gap-3.5'>
        <div className='relative'>
          <div
            className={cn(
              'flex h-14 items-center gap-3 rounded-[15px] border-[1.5px] bg-surface-3 px-3.5 transition',
              selectionError ? 'border-brand-red' : 'border-transparent focus-within:border-white/60 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.12)]'
            )}>
            <Search className='h-[19px] w-[19px] shrink-0 text-muted-foreground' strokeWidth={1.8} />
            <input
              ref={inputRef}
              id='delivery-address'
              aria-label={t.deliveryAddress}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPicked(null);
              }}
              onKeyDown={onKeyDown}
              placeholder={t.addressSearchPlaceholder}
              autoComplete='off'
              className='min-w-0 flex-1 border-none bg-transparent text-[15px] font-semibold text-white placeholder:text-muted-foreground'
            />
            {loading && <Loader2 className='h-4 w-4 shrink-0 animate-spin text-muted-foreground' />}
          </div>

          {predictions.length > 0 && (
            <div className='absolute inset-x-0 top-full z-[5] mt-2 max-h-64 overflow-y-auto overflow-x-hidden rounded-[15px] border border-border-strong bg-surface-2 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]'>
              {predictions.map((p, idx) => (
                <button
                  key={p.place_id}
                  type='button'
                  onClick={() => fetchPlaceDetails(p.place_id)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={cn('flex w-full items-center gap-3 border-b border-white/5 px-4 py-3.5 text-left transition last:border-b-0 hover:bg-surface-suggest', idx === activeIndex && 'bg-surface-suggest')}>
                  <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-card'>
                    <MapPin className='h-4 w-4 text-muted-foreground' strokeWidth={1.8} />
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate text-sm font-bold'>{p.structured_formatting?.main_text ?? p.description}</span>
                    <span className='mt-px block truncate text-xs font-medium text-muted-foreground'>{p.structured_formatting?.secondary_text ?? ''}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {(selectionError || typingError || (!loading && !picked && query.trim().length > 0 && predictions.length === 0)) && (
            <div className={cn('mt-2 flex items-start gap-1.5 text-[12.5px] font-semibold', selectionError ? 'text-error-text' : 'text-muted-foreground')}>
              {selectionError && <AlertCircle className='mt-px h-[13px] w-[13px] shrink-0' strokeWidth={2} />}
              <span>{selectionError || typingError || t.noSuggestionsFoundAddPostalCode}</span>
            </div>
          )}
        </div>

        {outOfZone && (
          <div className='rounded-2xl border border-[rgba(255,255,255,0.09)] bg-card'>
            <div className='px-[18px] py-[17px]'>
              <div className='text-[14.5px] font-bold text-white'>{t.outsideDeliveryArea}</div>
              <div className='mt-1.5 text-[13px] font-medium leading-relaxed text-muted-foreground'>{t.outsideDeliveryAreaSub}</div>
              <div className='mt-3.5 flex flex-wrap gap-2.5'>
                <button
                  type='button'
                  onClick={() => {
                    setOrderType('pickup');
                    onClose();
                  }}
                  className='inline-flex h-[42px] items-center gap-2 rounded-xl bg-primary px-4 text-[13.5px] font-bold text-selected-text transition active:scale-[0.97]'>
                  {t.switchToPickup}
                </button>
                {storeInfo?.phone && (
                  <a
                    href={`tel:${storeInfo.phone}`}
                    className='inline-flex h-[42px] items-center gap-2 rounded-xl border border-border-strong px-4 text-[13.5px] font-bold text-white transition hover:bg-surface-2'>
                    <Phone className='h-[15px] w-[15px]' strokeWidth={1.9} />
                    {t.callUs}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {canSave && (
          <div>
            <div className='mb-2 text-[11.5px] font-bold uppercase tracking-[0.04em] text-muted-foreground'>
              {t.saveAs} <span className='font-semibold normal-case tracking-normal text-fg-hint'>· {t.optional}</span>
            </div>
            <div className='flex flex-wrap gap-2'>
              {LABELS.map((l) => {
                const active = label === l;
                return (
                  <button
                    key={l}
                    type='button'
                    onClick={() => setLabel(active ? undefined : l)}
                    className={cn(
                      'h-11 flex-1 rounded-xl border-[1.5px] text-[13.5px] font-bold transition',
                      active ? 'border-white bg-primary text-selected-text' : 'border-elevated bg-transparent text-white'
                    )}>
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className='mt-1 flex gap-2.5'>
          <button
            type='button'
            onClick={() => (savedAddresses.length > 0 ? setMode('list') : onClose())}
            className='h-[54px] w-[110px] shrink-0 rounded-[15px] border-[1.5px] border-elevated text-[14.5px] font-bold text-white transition hover:bg-surface-hover'>
            {t.back}
          </button>
          <button
            type='button'
            disabled={!canSave}
            onClick={() => picked && commit(picked, label)}
            className={cn(
              'h-[54px] flex-1 rounded-[15px] text-[15px] font-extrabold transition active:scale-[0.98]',
              canSave ? 'bg-primary text-selected-text' : 'cursor-not-allowed bg-surface-3 text-fg-disabled-2'
            )}>
            {picked ? t.saveAddress : t.chooseFromSuggestions}
          </button>
        </div>
      </div>
    );
  }

  // On a phone the design puts this at the bottom edge as a sheet. Only the
  // shell differs — `body` above is the same in both.
  if (isMobile) {
    return (
      <MobileSheet
        open={open}
        onClose={onClose}
        title={t.deliveryAddress}
        maxHeight={mode === 'form' ? '88%' : '80%'}
        onBack={mode === 'form' && savedAddresses.length > 0 ? () => setMode('list') : undefined}
        backLabel={t.back}>
        {body}
      </MobileSheet>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className='fixed inset-0 z-[62] bg-black/[0.66] backdrop-blur-[2px] data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0' />
        <Dialog.Viewport className='fixed inset-0 z-[62] flex items-start justify-center overflow-y-auto p-3 pt-6 sm:items-center sm:p-8'>
          <Dialog.Popup className='anim-scalein w-[480px] max-w-full rounded-3xl border border-border-strong bg-card p-6 text-foreground shadow-[0_40px_90px_-20px_rgba(0,0,0,0.8)]'>
            <div className='mb-5 flex items-start gap-3.5'>
              <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-surface-3'>
                <MapPin className='h-[22px] w-[22px]' strokeWidth={1.7} />
              </div>
              <div className='min-w-0 flex-1'>
                <Dialog.Title className='text-[19px] font-extrabold tracking-tight'>{t.deliveryAddress}</Dialog.Title>
                <div className='mt-0.5 text-[13px] font-medium text-muted-foreground'>{sub}</div>
              </div>
              <Dialog.Close
                aria-label={t.close}
                className='flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-surface-3 text-muted-foreground transition hover:bg-elevated hover:text-white'>
                <X className='h-4 w-4' strokeWidth={2.2} />
              </Dialog.Close>
            </div>
            {body}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

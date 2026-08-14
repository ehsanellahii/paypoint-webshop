'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    __gmapsKeyLoaded?: string;
    /** Called by the Maps SDK itself when the key is rejected. */
    gm_authFailure?: () => void;
  }
}

const SCRIPT_ID = 'google-maps-script';
/** Enough of the SDK URL to recognise a loader that is not this hook. */
const MAPS_SRC = 'maps.googleapis.com/maps/api/js';

export const MAPS_AUTH_ERROR = 'MAPS_AUTH_FAILED';

/**
 * Does this Places / Geocoder status mean the key was refused, rather than
 * "nothing matched"?
 *
 * `gm_authFailure` only fires for the Maps JavaScript API's own auth check,
 * which runs when a map is drawn. This app never draws one — it only asks
 * Places and the Geocoder — so a billing or key problem never reaches that
 * callback. It arrives here instead, once per request, while the SDK logs
 * "BillingNotEnabledMapError" to the console. Discarding the status is what
 * made the failure invisible.
 */
export function isKeyRefused(status: string): boolean {
  return status === 'REQUEST_DENIED' || status === 'OVER_QUERY_LIMIT';
}

/*
 * A rejected key — billing switched off, referrer not allowed, Places not
 * enabled — is not a load failure. Google serves the script, `onload` fires,
 * and only then does the SDK call `gm_authFailure` and log to the console.
 *
 * Without this the hook reported a healthy `loaded: true` while every Places
 * call quietly returned nothing, which is exactly how a billing problem
 * reaches a guest as an address box that simply never finds anything.
 *
 * Module scope, because the SDK gives us one global callback and every mounted
 * consumer needs to hear about it.
 */
let authFailed = false;
const authListeners = new Set<() => void>();

function installAuthFailureHook() {
  if (typeof window === 'undefined' || window.gm_authFailure) return;
  window.gm_authFailure = () => {
    authFailed = true;
    authListeners.forEach((notify) => notify());
  };
}

export function useGoogleMaps(apiKey?: string) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>('');

  // Listen for the SDK rejecting the key, whoever loaded it.
  useEffect(() => {
    installAuthFailureHook();
    const onAuthFailed = () => {
      setError(MAPS_AUTH_ERROR);
      setLoaded(false);
    };
    if (authFailed) onAuthFailed();
    authListeners.add(onAuthFailed);
    return () => {
      authListeners.delete(onAuthFailed);
    };
  }, []);

  useEffect(() => {
    if (authFailed) return;
    if (!apiKey) {
      setLoaded(false);
      setError('Missing Google Maps API key.');
      return;
    }

    // If already loaded and same key
    if (window.google?.maps?.places && window.__gmapsKeyLoaded === apiKey) {
      setLoaded(true);
      setError('');
      return;
    }

    // If Google already exists but key differs (navigation to another tenant)
    if (window.google?.maps && window.__gmapsKeyLoaded && window.__gmapsKeyLoaded !== apiKey) {
      // Easiest safe approach: hard reload to load correct script/key
      // (Google Maps JS doesn't support "unloading" cleanly)
      window.location.reload();
      return;
    }

    /*
     * Loaded by something that did not record a key. Adopt it instead of
     * fetching a second copy: the SDK refuses to be included twice and says so
     * in the console. Matching only on `__gmapsKeyLoaded` above is what let the
     * layout's own <Script> and this hook both load it.
     */
    if (window.google?.maps?.places) {
      window.__gmapsKeyLoaded = apiKey;
      setLoaded(true);
      setError('');
      return;
    }

    /*
     * A request is already in flight — ours by id, or anyone else's by src.
     * Wait on it rather than adding another.
     */
    const existing =
      (document.getElementById(SCRIPT_ID) as HTMLScriptElement | null) ??
      document.querySelector<HTMLScriptElement>(`script[src*="${MAPS_SRC}"]`);

    if (existing) {
      existing.addEventListener('load', () => setLoaded(true), { once: true });
      existing.addEventListener('error', () => setError('Google Maps failed to load.'), { once: true });
      return;
    }

    setLoaded(false);
    setError('');

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;

    script.onload = () => {
      window.__gmapsKeyLoaded = apiKey;
      setLoaded(true);
    };

    script.onerror = () => {
      setError('Google Maps failed to load.');
      setLoaded(false);
    };

    document.head.appendChild(script);
  }, [apiKey]);

  return { loaded, error };
}

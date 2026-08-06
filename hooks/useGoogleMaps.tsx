'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    __gmapsKeyLoaded?: string;
  }
}

const SCRIPT_ID = 'google-maps-script';
/** Enough of the SDK URL to recognise a loader that is not this hook. */
const MAPS_SRC = 'maps.googleapis.com/maps/api/js';

export function useGoogleMaps(apiKey?: string) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
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

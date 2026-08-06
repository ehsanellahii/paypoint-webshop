'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    __gmapsKeyLoaded?: string;
  }
}

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

    // Load script if not present
    const existing = document.getElementById('google-maps-script') as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener('load', () => setLoaded(true), { once: true });
      existing.addEventListener('error', () => setError('Google Maps failed to load.'), { once: true });
      return;
    }

    setLoaded(false);
    setError('');

    const script = document.createElement('script');
    script.id = 'google-maps-script';
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

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect } from 'react';

export default function DebugPersistError() {
  useEffect(() => {
    const origError = console.error;
    console.error = (...args: any[]) => {
      if (String(args?.[0] ?? '').includes('Persisting failed')) {
        // This prints the call stack showing who triggered it
        console.trace('Persisting failed trace:', ...args);
      }
      origError(...args);
    };

    return () => {
      console.error = origError;
    };
  }, []);

  return null;
}

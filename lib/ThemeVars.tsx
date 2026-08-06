'use client';

import { useEffect } from 'react';

export default function ThemeVars({ primary, selectedText }: { primary: string; selectedText: string }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;

    if (primary) root.style.setProperty('--primary', primary);
    if (selectedText) root.style.setProperty('--selected-text', selectedText);
  }, [primary, selectedText]);

  return null;
}

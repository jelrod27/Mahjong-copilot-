'use client';

import { useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';

/** Applies the `comfortable-text` class on the document root from Redux (persisted after init). */
export function ComfortableTextSync() {
  const largerUiText = useAppSelector((s) => s.settings.largerUiText);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('comfortable-text', largerUiText);
    return () => root.classList.remove('comfortable-text');
  }, [largerUiText]);

  return null;
}

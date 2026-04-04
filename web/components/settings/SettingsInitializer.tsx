'use client';

import { useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { initializeSettings } from '@/store/actions/settingsActions';

export function SettingsInitializer() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(initializeSettings());
  }, [dispatch]);

  return null;
}

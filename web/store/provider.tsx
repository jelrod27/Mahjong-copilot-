'use client';

import { Provider } from 'react-redux';
import { store } from './index';
import { AuthStateListener } from '@/components/auth/AuthStateListener';
import { SettingsInitializer } from '@/components/settings/SettingsInitializer';
import { ComfortableTextSync } from '@/components/settings/ComfortableTextSync';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthStateListener>
        <SettingsInitializer />
        <ComfortableTextSync />
        {children}
      </AuthStateListener>
    </Provider>
  );
}

'use client';

import { Provider } from 'react-redux';
import { store } from './index';
import { AuthStateListener } from '@/components/auth/AuthStateListener';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthStateListener>{children}</AuthStateListener>
    </Provider>
  );
}

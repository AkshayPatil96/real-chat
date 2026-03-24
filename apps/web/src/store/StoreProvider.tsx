'use client';

import { useRef, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import type { AppStore } from './store';
import { makeStore } from './store';

interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const storeRef = useRef<AppStore | null>(null);
  
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}

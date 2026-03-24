/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactElement } from 'react';
import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { makeStore } from '@/store/store';
import { vi } from 'vitest';

/**
 * Test utilities for rendering components with Redux store
 */

export function createTestStore() {
  return makeStore();
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  store?: ReturnType<typeof createTestStore>;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    store = createTestStore(),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Mock socket.io client for tests
 */
export function createMockSocket() {
  const eventHandlers: Record<string, ((...args: any[]) => void)[]> = {};
  
  return {
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    }),
    off: vi.fn((event: string, handler?: (...args: any[]) => void) => {
      if (handler) {
        eventHandlers[event] = eventHandlers[event]?.filter(h => h !== handler) || [];
      } else {
        delete eventHandlers[event];
      }
    }),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
    id: 'mock-socket-id',
    // Helper to trigger events in tests
    _trigger: (event: string, data: any) => {
      eventHandlers[event]?.forEach(handler => handler(data));
    },
    _getHandlers: () => eventHandlers,
  };
}

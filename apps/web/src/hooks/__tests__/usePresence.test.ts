/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePresence } from '../usePresence';
import type { Socket } from 'socket.io-client';

/**
 * Tests for usePresence hook
 * 
 * Purpose: Verify presence tracking logic prevents regressions in:
 * - User online/offline state management
 * - Memory management (Set-based storage)
 * - Socket event handling
 */

describe('usePresence', () => {
  let mockSocket: Partial<Socket>;
  let eventHandlers: Record<string, (...args: any[]) => void>;

  beforeEach(() => {
    eventHandlers = {};
    
    mockSocket = {
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        eventHandlers[event] = handler;
      }) as any,
      off: vi.fn() as any,
      emit: vi.fn() as any,
    };
  });

  it('should mark user as online when user:online event received', async () => {
    /**
     * PROTECTS AGAINST: Presence indicator showing offline when user is online
     */
    const { result } = renderHook(() => usePresence(mockSocket as Socket));

    act(() => {
      eventHandlers['user:online']?.({ userId: 'user-123' });
    });

    await waitFor(() => {
      expect(result.current.isUserOnline('user-123')).toBe(true);
    });
  });

  it('should mark user as offline when user:offline event received', async () => {
    /**
     * PROTECTS AGAINST: Presence indicator showing online when user is offline
     */
    const { result } = renderHook(() => usePresence(mockSocket as Socket));

    // First make user online
    act(() => {
      eventHandlers['user:online']?.({ userId: 'user-456' });
    });

    // Then offline
    act(() => {
      eventHandlers['user:offline']?.({ userId: 'user-456' });
    });

    await waitFor(() => {
      expect(result.current.isUserOnline('user-456')).toBe(false);
    });
  });

  it('should seed initial presence state', () => {
    /**
     * PROTECTS AGAINST: Missing presence indicators on page load
     */
    const { result } = renderHook(() => usePresence(mockSocket as Socket));

    act(() => {
      result.current.seedPresence({
        'user-1': true,
        'user-2': false,
        'user-3': true,
      });
    });

    expect(result.current.isUserOnline('user-1')).toBe(true);
    expect(result.current.isUserOnline('user-2')).toBe(false);
    expect(result.current.isUserOnline('user-3')).toBe(true);
  });

  it('should handle null socket gracefully', () => {
    /**
     * PROTECTS AGAINST: Crash when socket not connected
     */
    const { result } = renderHook(() => usePresence(null));

    expect(result.current.isUserOnline('any-user')).toBe(false);
    expect(() => result.current.seedPresence({ 'user-1': true })).not.toThrow();
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTyping } from '../useTyping';
import type { Socket } from 'socket.io-client';

/**
 * Tests for useTyping hook
 * 
 * Purpose: Verify typing indicator logic prevents regressions in:
 * - Typing state tracking
 * - Auto-stop timeout behavior
 * - Socket event emission
 */

describe('useTyping', () => {
  let mockSocket: Partial<Socket>;
  let eventHandlers: Record<string, (data: any) => void>;
  let emittedEvents: Array<{ event: string; data: any }>;

  beforeEach(() => {
    vi.useFakeTimers();
    eventHandlers = {};
    emittedEvents = [];
    
    mockSocket = {
      on: vi.fn((event: string, handler: (data: any) => void) => {
        eventHandlers[event] = handler;
      }) as any,
      off: vi.fn() as any,
      emit: vi.fn((event: string, data: any) => {
        emittedEvents.push({ event, data });
      }) as any,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should emit typing:start when startTyping called', () => {
    /**
     * PROTECTS AGAINST: Typing indicator not showing for other users
     */
    const { result } = renderHook(() => 
      useTyping(mockSocket as Socket, 'conv-1', 'user-1')
    );

    act(() => {
      result.current.startTyping();
    });

    expect(emittedEvents).toContainEqual({
      event: 'typing:start',
      data: { conversationId: 'conv-1' },
    });
  });

  it('should auto-stop typing after timeout', () => {
    /**
     * PROTECTS AGAINST: Typing indicator stuck on screen
     */
    const { result } = renderHook(() => 
      useTyping(mockSocket as Socket, 'conv-1', 'user-1')
    );

    act(() => {
      result.current.startTyping();
    });

    emittedEvents = []; // Clear

    // Fast-forward past timeout (3 seconds)
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(emittedEvents).toContainEqual({
      event: 'typing:stop',
      data: { conversationId: 'conv-1' },
    });
  });

  it('should track typing users from socket events', () => {
    /**
     * PROTECTS AGAINST: Not showing who is typing
     */
    const { result } = renderHook(() => 
      useTyping(mockSocket as Socket, 'conv-1', 'user-1')
    );

    act(() => {
      eventHandlers['typing:update']?.({
        userId: 'user-2',
        conversationId: 'conv-1',
        isTyping: true,
      });
    });

    expect(result.current.typingUsers.has('user-2')).toBe(true);
  });

  it('should remove user from typing when they stop', () => {
    /**
     * PROTECTS AGAINST: Typing indicator not clearing
     */
    const { result } = renderHook(() => 
      useTyping(mockSocket as Socket, 'conv-1', 'user-1')
    );

    // User starts typing
    act(() => {
      eventHandlers['typing:update']?.({
        userId: 'user-3',
        conversationId: 'conv-1',
        isTyping: true,
      });
    });

    // User stops typing
    act(() => {
      eventHandlers['typing:update']?.({
        userId: 'user-3',
        conversationId: 'conv-1',
        isTyping: false,
      });
    });

    expect(result.current.typingUsers.has('user-3')).toBe(false);
  });

  it('should not track current user typing', () => {
    /**
     * PROTECTS AGAINST: Showing "You are typing..." to yourself
     */
    const { result } = renderHook(() => 
      useTyping(mockSocket as Socket, 'conv-1', 'user-1')
    );

    act(() => {
      eventHandlers['typing:update']?.({
        userId: 'user-1', // Current user
        conversationId: 'conv-1',
        isTyping: true,
      });
    });

    expect(result.current.typingUsers.has('user-1')).toBe(false);
  });
});

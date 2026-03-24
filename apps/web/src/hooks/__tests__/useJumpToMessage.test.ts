/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useJumpToMessage } from '@/hooks/useJumpToMessage';
import { messagesApi } from '@/store/api/messagesApi';

/**
 * Jump-to-Message Hook Tests
 * 
 * Purpose: Verify jump-to-message functionality
 * - Fetches messages around target
 * - Scrolls to message
 * - Highlights message temporarily
 */

// Mock the API hooks
vi.mock('@/store/api/messagesApi', () => ({
  useLazyGetMessagesAroundQuery: vi.fn(),
}));

// Mock scrollIntoView
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.clearAllMocks();
});

describe('useJumpToMessage', () => {
  const mockGetMessagesAround = vi.fn();
  const mockOnMessagesLoad = vi.fn();

  beforeEach(() => {
    (messagesApi.useLazyGetMessagesAroundQuery as any).mockReturnValue([
      mockGetMessagesAround,
      { isLoading: false },
    ]);
  });

  it('should register message ref', () => {
    const { result } = renderHook(() =>
      useJumpToMessage({
        conversationId: 'conv-1',
        onMessagesLoad: mockOnMessagesLoad,
      })
    );

    const mockElement = document.createElement('div');
    result.current.registerMessageRef('msg-1', mockElement);

    // Verify element is registered by attempting to scroll to it
    result.current.scrollToMessage('msg-1');
    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });

  it('should jump to message and load surrounding messages', async () => {
    const mockMessages = [
      { id: 'msg-0', content: 'Before' },
      { id: 'msg-1', content: 'Target' },
      { id: 'msg-2', content: 'After' },
    ];

    mockGetMessagesAround.mockResolvedValue({
      unwrap: () =>
        Promise.resolve({
          centerMessageId: 'msg-1',
          messages: mockMessages,
        }),
    });

    const { result } = renderHook(() =>
      useJumpToMessage({
        conversationId: 'conv-1',
        onMessagesLoad: mockOnMessagesLoad,
      })
    );

    await result.current.jumpToMessage('msg-1');

    await waitFor(() => {
      expect(mockGetMessagesAround).toHaveBeenCalledWith({
        messageId: 'msg-1',
        limit: 50,
      });
      expect(mockOnMessagesLoad).toHaveBeenCalledWith(mockMessages, 'msg-1');
    });
  });

  it('should handle errors when jumping to message', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockGetMessagesAround.mockResolvedValue({
      unwrap: () => Promise.reject(new Error('Message not found')),
    });

    const { result } = renderHook(() =>
      useJumpToMessage({
        conversationId: 'conv-1',
        onMessagesLoad: mockOnMessagesLoad,
      })
    );

    await result.current.jumpToMessage('msg-1');

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Failed to jump to message:',
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });

  it('should scroll to message with smooth behavior', () => {
    const { result } = renderHook(() =>
      useJumpToMessage({
        conversationId: 'conv-1',
        onMessagesLoad: mockOnMessagesLoad,
      })
    );

    const mockElement = document.createElement('div');
    result.current.registerMessageRef('msg-1', mockElement);

    result.current.scrollToMessage('msg-1');

    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });

  it('should add and remove highlight class', async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      useJumpToMessage({
        conversationId: 'conv-1',
        onMessagesLoad: mockOnMessagesLoad,
      })
    );

    const mockElement = document.createElement('div');
    result.current.registerMessageRef('msg-1', mockElement);

    result.current.scrollToMessage('msg-1');

    // Highlight class should be added
    expect(mockElement.classList.contains('message-highlight')).toBe(true);

    // Fast-forward time by 2 seconds
    vi.advanceTimersByTime(2000);

    // Highlight class should be removed
    await waitFor(() => {
      expect(mockElement.classList.contains('message-highlight')).toBe(false);
    });

    vi.useRealTimers();
  });

  it('should unregister message ref when element is null', () => {
    const { result } = renderHook(() =>
      useJumpToMessage({
        conversationId: 'conv-1',
        onMessagesLoad: mockOnMessagesLoad,
      })
    );

    const mockElement = document.createElement('div');
    result.current.registerMessageRef('msg-1', mockElement);

    // Unregister
    result.current.registerMessageRef('msg-1', null);

    // Attempt to scroll should log warning
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    result.current.scrollToMessage('msg-1');

    expect(consoleWarn).toHaveBeenCalledWith(
      'Message element not found for ID: msg-1'
    );

    consoleWarn.mockRestore();
  });
});

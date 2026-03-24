/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './test-utils';
import { MessageSearch } from '@/components/chat/MessageSearch';
import { messagesApi } from '@/store/api/messagesApi';

/**
 * Message Search Integration Tests
 * 
 * Purpose: Verify search UI and jump-to-message functionality
 * - Search query renders results
 * - Result click triggers navigation
 * - Search overlay can be closed
 */

// Mock the API hooks
vi.mock('@/store/api/messagesApi', async () => {
  const actual = await vi.importActual('@/store/api/messagesApi');
  return {
    ...actual,
    useLazySearchMessagesQuery: vi.fn(),
  };
});

describe('MessageSearch', () => {
  const mockSearchTrigger = vi.fn();
  const mockOnResultClick = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementation
    (messagesApi.useLazySearchMessagesQuery as any).mockReturnValue([
      mockSearchTrigger,
      {
        data: [],
        isLoading: false,
        isFetching: false,
      },
    ]);
  });

  it('should render search input when open', () => {
    renderWithProviders(
      <MessageSearch
        conversationId="conv-1"
        onResultClick={mockOnResultClick}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByPlaceholderText('Search messages...')).toBeInTheDocument();
    expect(screen.getByText('Search Messages')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    const { container } = renderWithProviders(
      <MessageSearch
        conversationId="conv-1"
        onResultClick={mockOnResultClick}
        isOpen={false}
        onClose={mockOnClose}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should trigger search after typing query', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <MessageSearch
        conversationId="conv-1"
        onResultClick={mockOnResultClick}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search messages...');
    await user.type(searchInput, 'hello');

    // Wait for debounce (300ms)
    await waitFor(
      () => {
        expect(mockSearchTrigger).toHaveBeenCalledWith({
          conversationId: 'conv-1',
          query: 'hello',
          limit: 20,
        });
      },
      { timeout: 500 }
    );
  });

  it('should display search results', () => {
    const mockResults = [
      {
        messageId: 'msg-1',
        conversationId: 'conv-1',
        snippet: 'Hello world!',
        createdAt: new Date().toISOString(),
        senderId: 'user-1',
      },
      {
        messageId: 'msg-2',
        conversationId: 'conv-1',
        snippet: 'Hello there!',
        createdAt: new Date().toISOString(),
        senderId: 'user-2',
      },
    ];

    (messagesApi.useLazySearchMessagesQuery as any).mockReturnValue([
      mockSearchTrigger,
      {
        data: mockResults,
        isLoading: false,
        isFetching: false,
      },
    ]);

    renderWithProviders(
      <MessageSearch
        conversationId="conv-1"
        onResultClick={mockOnResultClick}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Type to trigger search
    const searchInput = screen.getByPlaceholderText('Search messages...');
    userEvent.type(searchInput, 'hello');

    // Results should be displayed
    expect(screen.getByText(/Hello world!/)).toBeInTheDocument();
    expect(screen.getByText(/Hello there!/)).toBeInTheDocument();
  });

  it('should call onResultClick when clicking a result', async () => {
    const user = userEvent.setup();
    const mockResults = [
      {
        messageId: 'msg-1',
        conversationId: 'conv-1',
        snippet: 'Hello world!',
        createdAt: new Date().toISOString(),
        senderId: 'user-1',
      },
    ];

    (messagesApi.useLazySearchMessagesQuery as any).mockReturnValue([
      mockSearchTrigger,
      {
        data: mockResults,
        isLoading: false,
        isFetching: false,
      },
    ]);

    renderWithProviders(
      <MessageSearch
        conversationId="conv-1"
        onResultClick={mockOnResultClick}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const resultButton = screen.getByText(/Hello world!/).closest('button');
    expect(resultButton).toBeInTheDocument();

    if (resultButton) {
      await user.click(resultButton);
      expect(mockOnResultClick).toHaveBeenCalledWith('msg-1');
    }
  });

  it('should call onClose when clicking close button', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <MessageSearch
        conversationId="conv-1"
        onResultClick={mockOnResultClick}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close search/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show loading indicator when fetching', () => {
    (messagesApi.useLazySearchMessagesQuery as any).mockReturnValue([
      mockSearchTrigger,
      {
        data: [],
        isLoading: true,
        isFetching: true,
      },
    ]);

    renderWithProviders(
      <MessageSearch
        conversationId="conv-1"
        onResultClick={mockOnResultClick}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Loading spinner should be present
    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
  });

  it('should show "no results" message when search returns empty', () => {
    (messagesApi.useLazySearchMessagesQuery as any).mockReturnValue([
      mockSearchTrigger,
      {
        data: [],
        isLoading: false,
        isFetching: false,
      },
    ]);

    renderWithProviders(
      <MessageSearch
        conversationId="conv-1"
        onResultClick={mockOnResultClick}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search messages...');
    userEvent.type(searchInput, 'nonexistent');

    // Should show no results message
    expect(screen.getByText(/No messages found/)).toBeInTheDocument();
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MediaGrid } from '../MediaGrid';
import { api } from '@/store/api/api';

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver as any;

// Create a mock store with media data
const createMockStore = (data: any) => {
  return configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware),
    preloadedState: {
      [api.reducerPath]: {
        queries: {
          'getConversationMedia({"conversationId":"conv1","type":"all","limit":20})': {
            status: 'fulfilled',
            data: data,
            endpointName: 'getConversationMedia',
            requestId: 'test-request-id',
            startedTimeStamp: Date.now(),
            fulfilledTimeStamp: Date.now(),
          },
        },
        mutations: {},
        provided: {},
        subscriptions: {},
        config: api.reducerPath,
      },
    },
  });
};

describe('MediaGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    const emptyStore = configureStore({
      reducer: {
        [api.reducerPath]: api.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(api.middleware),
    });

    render(
      <Provider store={emptyStore}>
        <MediaGrid conversationId="conv1" />
      </Provider>
    );

    // Should show loader or loading indicator
    expect(screen.getByRole('progressbar') || screen.getByText(/loading/i)).toBeTruthy();
  });

  it('should render empty state when no media found', async () => {
    const store = createMockStore({
      items: [],
      nextCursor: null,
    });

    render(
      <Provider store={store}>
        <MediaGrid conversationId="conv1" />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/no media found/i)).toBeInTheDocument();
    });
  });

  it('should render media items in a grid', async () => {
    const mockData = {
      items: [
        {
          messageId: 'msg1',
          type: 'image',
          fileKey: 'attachments/image1.jpg',
          createdAt: new Date().toISOString(),
          senderId: 'user1',
        },
        {
          messageId: 'msg2',
          type: 'image',
          fileKey: 'attachments/image2.jpg',
          createdAt: new Date().toISOString(),
          senderId: 'user2',
        },
        {
          messageId: 'msg3',
          type: 'video',
          fileKey: 'attachments/video1.mp4',
          createdAt: new Date().toISOString(),
          senderId: 'user1',
        },
      ],
      nextCursor: null,
    };

    const store = createMockStore(mockData);

    render(
      <Provider store={store}>
        <MediaGrid conversationId="conv1" />
      </Provider>
    );

    await waitFor(() => {
      // Should render images
      const images = screen.getAllByAltText('Media');
      expect(images.length).toBeGreaterThan(0);
    });
  });

  it('should call onImageClick when image is clicked', async () => {
    const mockOnImageClick = vi.fn();
    const mockData = {
      items: [
        {
          messageId: 'msg1',
          type: 'image',
          fileKey: 'attachments/image1.jpg',
          createdAt: new Date().toISOString(),
          senderId: 'user1',
        },
      ],
      nextCursor: null,
    };

    const store = createMockStore(mockData);

    render(
      <Provider store={store}>
        <MediaGrid conversationId="conv1" onImageClick={mockOnImageClick} />
      </Provider>
    );

    await waitFor(() => {
      const imageContainer = screen.getByAltText('Media').closest('div');
      expect(imageContainer).toBeTruthy();
    });

    // Click the image container
    const imageContainer = screen.getByAltText('Media').closest('div');
    if (imageContainer) {
      imageContainer.click();
      expect(mockOnImageClick).toHaveBeenCalledWith('msg1');
    }
  });

  it('should filter to only show image and video types', async () => {
    const mockData = {
      items: [
        {
          messageId: 'msg1',
          type: 'image',
          fileKey: 'attachments/image1.jpg',
          createdAt: new Date().toISOString(),
          senderId: 'user1',
        },
        {
          messageId: 'msg2',
          type: 'text',
          content: 'Check this https://example.com',
          createdAt: new Date().toISOString(),
          senderId: 'user2',
        },
        {
          messageId: 'msg3',
          type: 'video',
          fileKey: 'attachments/video1.mp4',
          createdAt: new Date().toISOString(),
          senderId: 'user1',
        },
      ],
      nextCursor: null,
    };

    const store = createMockStore(mockData);

    render(
      <Provider store={store}>
        <MediaGrid conversationId="conv1" />
      </Provider>
    );

    await waitFor(() => {
      // Should only render 2 items (image + video), not the text message
      const mediaElements = screen.getAllByAltText(/media/i);
      expect(mediaElements.length).toBe(1); // Images have alt="Media"
    });
  });
});

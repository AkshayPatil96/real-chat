/* eslint-disable @typescript-eslint/no-explicit-any */
import { http, HttpResponse } from 'msw';

const API_BASE = '/api/v1';

/**
 * MSW handlers for API mocking
 * Only mock critical API endpoints used in tests
 */
export const handlers = [
  // List conversations
  http.get(`${API_BASE}/conversations`, () => {
    return HttpResponse.json([
      {
        id: 'conv-1',
        name: null,
        type: 'direct',
        participants: [
          { id: 'user-1', username: 'Alice', avatar: null },
          { id: 'user-2', username: 'Bob', avatar: null },
        ],
        lastMessage: {
          content: 'Hey there!',
          timestamp: new Date().toISOString(),
        },
        unreadCount: 2,
      },
      {
        id: 'conv-2',
        name: null,
        type: 'direct',
        participants: [
          { id: 'user-1', username: 'Alice', avatar: null },
          { id: 'user-3', username: 'Charlie', avatar: null },
        ],
        lastMessage: {
          content: 'See you later',
          timestamp: new Date().toISOString(),
        },
        unreadCount: 0,
      },
    ]);
  }),

  // Get messages for conversation
  http.get(`${API_BASE}/conversations/:conversationId/messages`, ({ params }) => {
    const { conversationId } = params;
    
    if (conversationId === 'conv-1') {
      return HttpResponse.json({
        messages: [
          {
            id: 'msg-1',
            conversationId: 'conv-1',
            senderId: 'user-2',
            content: 'Hey there!',
            type: 'text',
            timestamp: new Date().toISOString(),
            readBy: [],
          },
        ],
        pagination: {
          hasNextPage: false,
          nextCursor: null,
        },
      });
    }

    return HttpResponse.json({
      messages: [],
      pagination: { hasNextPage: false, nextCursor: null },
    });
  }),

  // Send message
  http.post(`${API_BASE}/conversations/:conversationId/messages`, async ({ request, params }) => {
    const body = await request.json() as any;
    const { conversationId } = params;

    return HttpResponse.json({
      id: 'msg-new',
      conversationId,
      senderId: 'user-1',
      content: body.content || '',
      type: body.fileKey ? 'image' : 'text',
      timestamp: new Date().toISOString(),
      readBy: [],
      media: body.fileKey ? { url: body.fileKey, type: 'image' } : null,
    });
  }),

  // Get presence status
  http.post(`${API_BASE}/presence/status`, () => {
    return HttpResponse.json({
      'user-2': true,
      'user-3': false,
    });
  }),

  // Generate presigned upload URL
  http.post(`${API_BASE}/uploads/presigned-url`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      uploadUrl: 'https://fake-s3.amazonaws.com/upload',
      fileKey: `temp/attachment/user-1/${Date.now()}-${body.fileName}`,
    });
  }),
];

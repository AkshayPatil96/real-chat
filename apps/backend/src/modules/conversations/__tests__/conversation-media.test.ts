import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app.js';
import Message from '../../messages/message.model.js';
import Conversation from '../conversation.model.js';
import User from '../../users/user.model.js';
import { generateAuthToken } from '../../../__tests__/helpers/auth.helper.js';

describe('GET /api/v1/conversations/:id/media', () => {
  let testUser: any;
  let otherUser: any;
  let conversation: any;
  let authToken: string;

  beforeEach(async () => {
    // Create test users
    testUser = await User.create({
      clerkId: 'test-clerk-id',
      username: 'testuser',
      email: 'test@example.com',
    });

    otherUser = await User.create({
      clerkId: 'other-clerk-id',
      username: 'otheruser',
      email: 'other@example.com',
    });

    // Create conversation
    conversation = await Conversation.create({
      participants: [testUser._id, otherUser._id],
      type: 'direct',
    });

    // Generate auth token
    authToken = generateAuthToken(testUser._id.toString());

    // Create test messages
    // Image messages
    await Message.create({
      conversationId: conversation._id,
      senderId: testUser._id,
      type: 'image',
      media: {
        url: 'attachments/image1.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        name: 'image1.jpg',
      },
      content: 'Image message',
    });

    await Message.create({
      conversationId: conversation._id,
      senderId: otherUser._id,
      type: 'image',
      media: {
        url: 'attachments/image2.png',
        mimeType: 'image/png',
        size: 2048,
        name: 'image2.png',
      },
      content: 'Another image',
    });

    // Video message
    await Message.create({
      conversationId: conversation._id,
      senderId: testUser._id,
      type: 'video',
      media: {
        url: 'attachments/video1.mp4',
        mimeType: 'video/mp4',
        size: 5120,
        name: 'video1.mp4',
      },
      content: 'Video message',
    });

    // File message
    await Message.create({
      conversationId: conversation._id,
      senderId: testUser._id,
      type: 'file',
      media: {
        url: 'attachments/document.pdf',
        mimeType: 'application/pdf',
        size: 3072,
        name: 'document.pdf',
      },
      content: 'Document',
    });

    // Text message with link
    await Message.create({
      conversationId: conversation._id,
      senderId: otherUser._id,
      type: 'text',
      content: 'Check out this link: https://example.com',
    });

    // Plain text message (should not appear in media)
    await Message.create({
      conversationId: conversation._id,
      senderId: testUser._id,
      type: 'text',
      content: 'Just a regular message',
    });

    // Add small delay to ensure createdAt timestamps are sequential
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  describe('Filter by type', () => {
    it('should return only images when type=image', async () => {
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation._id}/media`)
        .query({ type: 'image', limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.items.every((item: any) => item.type === 'image')).toBe(true);
      expect(response.body.data.items[0].fileKey).toBe('attachments/image2.png');
    });

    it('should return only files when type=file', async () => {
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation._id}/media`)
        .query({ type: 'file', limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].type).toBe('file');
      expect(response.body.data.items[0].fileKey).toBe('attachments/document.pdf');
    });

    it('should return text messages with links when type=link', async () => {
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation._id}/media`)
        .query({ type: 'link', limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].type).toBe('text');
      expect(response.body.data.items[0].content).toContain('https://example.com');
    });

    it('should return all media types when type=all', async () => {
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation._id}/media`)
        .query({ type: 'all', limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBeGreaterThanOrEqual(4); // images, video, file, link
      
      const types = response.body.data.items.map((item: any) => item.type);
      expect(types).toContain('image');
      expect(types).toContain('video');
      expect(types).toContain('file');
    });
  });

  describe('Pagination', () => {
    it('should support cursor-based pagination', async () => {
      // First request
      const firstResponse = await request(app)
        .get(`/api/v1/conversations/${conversation._id}/media`)
        .query({ type: 'all', limit: 2 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.data.items).toHaveLength(2);
      expect(firstResponse.body.data.nextCursor).toBeTruthy();

      // Second request with cursor
      const secondResponse = await request(app)
        .get(`/api/v1/conversations/${conversation._id}/media`)
        .query({ type: 'all', limit: 2, cursor: firstResponse.body.data.nextCursor })
        .set('Authorization', `Bearer ${authToken}`);

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.data.items.length).toBeGreaterThan(0);

      // Ensure no duplicates
      const firstIds = firstResponse.body.data.items.map((item: any) => item.messageId);
      const secondIds = secondResponse.body.data.items.map((item: any) => item.messageId);
      const intersection = firstIds.filter((id: string) => secondIds.includes(id));
      expect(intersection).toHaveLength(0);
    });

    it('should return nextCursor=null when no more items', async () => {
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation._id}/media`)
        .query({ type: 'all', limit: 100 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.nextCursor).toBeNull();
    });
  });

  describe('Response format', () => {
    it('should return correct shape for media items', async () => {
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation._id}/media`)
        .query({ type: 'image', limit: 1 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const item = response.body.data.items[0];
      
      expect(item).toHaveProperty('messageId');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('fileKey');
      expect(item).toHaveProperty('createdAt');
      expect(item).toHaveProperty('senderId');
      
      // Should NOT include full message body
      expect(item).not.toHaveProperty('deliveryState');
      expect(item).not.toHaveProperty('readBy');
    });

    it('should NOT return signed URLs (only fileKeys)', async () => {
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation._id}/media`)
        .query({ type: 'image', limit: 1 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const item = response.body.data.items[0];
      
      expect(item.fileKey).toBeTruthy();
      expect(item.fileKey).not.toMatch(/^https?:\/\//); // Should not be a URL
      expect(item).not.toHaveProperty('fileUrl'); // Should not have URL
    });
  });

  describe('Authorization', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation._id}/media`)
        .query({ type: 'all' });

      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not a participant', async () => {
      // Create a third user not in the conversation
      const thirdUser = await User.create({
        clerkId: 'third-clerk-id',
        username: 'thirduser',
        email: 'third@example.com',
      });

      const thirdUserToken = generateAuthToken(thirdUser._id.toString());

      const response = await request(app)
        .get(`/api/v1/conversations/${conversation._id}/media`)
        .query({ type: 'all' })
        .set('Authorization', `Bearer ${thirdUserToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Edge cases', () => {
    it('should return empty array when no media exists', async () => {
      // Create a new conversation with no media
      const emptyConv = await Conversation.create({
        participants: [testUser._id, otherUser._id],
        type: 'direct',
      });

      const response = await request(app)
        .get(`/api/v1/conversations/${emptyConv._id}/media`)
        .query({ type: 'all' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(0);
      expect(response.body.data.nextCursor).toBeNull();
    });

    it('should return 400 for invalid filter type', async () => {
      const response = await request(app)
        .get(`/api/v1/conversations/${conversation._id}/media`)
        .query({ type: 'invalid_type' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent conversation', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/v1/conversations/${fakeId}/media`)
        .query({ type: 'all' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});

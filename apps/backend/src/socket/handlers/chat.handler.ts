import { Server as SocketIOServer, Socket } from 'socket.io';
import MessageService from '../../modules/messages/message.service.js';
import logger from '../../utils/logger.js';

export function registerChatHandlers(io: SocketIOServer, socket: Socket) {
  const userId = (socket as any).userId;

  /**
   * Send message event
   * Persist first, then emit
   */
  socket.on('message:send', async (data: { conversationId: string; content: string }, callback) => {
    try {
      const { conversationId, content } = data;

      // PERSIST BEFORE EMIT
      const message = await MessageService.sendMessage(conversationId, userId, content);

      // Emit to all participants in the conversation
      io.to(`conversation:${conversationId}`).emit('message:new', {
        message,
      });

      logger.info(`User ${userId} sent message to conversation ${conversationId}`);

      // Acknowledge to sender
      if (callback) {
        callback({ success: true, message });
      }
    } catch (error: any) {
      logger.error(error, 'Error sending message');
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  /**
   * Mark message as delivered
   * Emitted by recipient when they receive the message
   */
  socket.on('message:delivered', async (data: { messageId: string; conversationId: string }) => {
    try {
      const { messageId, conversationId } = data;

      // Update delivery state to 'delivered'
      await MessageService.updateDeliveryState(messageId, 'delivered');

      // Notify all participants (especially sender) about delivery
      io.to(`conversation:${conversationId}`).emit('message:delivered', {
        messageId,
        conversationId,
        userId,
      });

      logger.info(`Message ${messageId} marked as delivered by user ${userId}`);
    } catch (error: any) {
      logger.error(error, 'Error marking message as delivered');
    }
  });

  /**
   * Mark message as read
   * Note: This socket handler is redundant as we use REST API for markAsRead
   * The REST API already emits the read receipt
   */
  socket.on('message:read', async (data: { messageId: string }) => {
    try {
      const { messageId } = data;

      await MessageService.markAsRead(messageId, userId);

      // Notify sender
      socket.broadcast.emit('message:status', {
        messageId,
        status: 'read',
        userId,
      });

      logger.info(`Message ${messageId} marked as read by user ${userId}`);
    } catch (error: any) {
      logger.error(error, 'Error marking message as read');
    }
  });

  /**
   * Join conversation room
   */
  socket.on('conversation:join', (data: { conversationId: string }) => {
    const { conversationId } = data;
    socket.join(`conversation:${conversationId}`);

    logger.info(`User ${userId} joined conversation ${conversationId}`);
  });

  /**
   * Leave conversation room
   */
  socket.on('conversation:leave', (data: { conversationId: string }) => {
    const { conversationId } = data;
    socket.leave(`conversation:${conversationId}`);

    logger.info(`User ${userId} left conversation ${conversationId}`);
  });
}

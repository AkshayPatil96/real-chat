// socket/handlers/room.handler.ts
import { Socket } from 'socket.io';
import logger from '../../utils/logger.js';

export function registerRoomHandlers(socket: Socket) {
  const userId = (socket as any).userId;

  socket.on('conversation:join', ({ conversationId }) => {
    socket.join(`conversation:${conversationId}`);
    logger.debug(`User ${userId} joined ${conversationId}`);
  });

  socket.on('conversation:leave', ({ conversationId }) => {
    socket.leave(`conversation:${conversationId}`);
    logger.debug(`User ${userId} left ${conversationId}`);
  });
}

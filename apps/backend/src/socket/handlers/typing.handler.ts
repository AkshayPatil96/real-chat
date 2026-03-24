// socket/handlers/typing.handler.ts
import { Server as SocketIOServer, Socket } from 'socket.io';

export function registerTypingHandlers(
  io: SocketIOServer,
  socket: Socket
) {
  const userId = (socket as any).userId;

  socket.on('typing:start', ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit('typing:update', {
      userId,
      conversationId,
      isTyping: true,
    });
  });

  socket.on('typing:stop', ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit('typing:update', {
      userId,
      conversationId,
      isTyping: false,
    });
  });

  /**
   * Best-effort cleanup
   */
  socket.on('disconnect', () => {
    socket.rooms.forEach((room) => {
      if (room.startsWith('conversation:')) {
        socket.to(room).emit('typing:update', {
          userId,
          conversationId: room.replace('conversation:', ''),
          isTyping: false,
        });
      }
    });
  });
}

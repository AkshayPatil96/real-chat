import { Server as SocketIOServer, Socket } from 'socket.io';
import { PresenceService } from '../services/PresenceService.js';
import logger from '../../utils/logger.js';
import { websocketConnections } from '../../utils/metrics.js';

export function registerPresenceHandlers(
  io: SocketIOServer,
  socket: Socket,
  presenceService: PresenceService
) {
  const userId = (socket as any).userId;

  /**
   * User connected - set online
   */
  const handleConnect = async () => {
    try {
      await presenceService.setOnline(userId);
      websocketConnections.inc();

      // Broadcast ONLINE only on first connection
      const isOnline = await presenceService.isOnline(userId);
      if (isOnline) {
        io.emit("user:online", { userId });
      }

      logger.info(`User ${userId} is now online`);
    } catch (error: any) {
      logger.error(error, 'Error setting user online');
    }
  };

  /**
   * User disconnected - set offline
   */
  const handleDisconnect = async () => {
    try {
      await presenceService.setOffline(userId);
      websocketConnections.dec();

      // Check AFTER decrement
      const stillOnline = await presenceService.isOnline(userId);

      // Broadcast OFFLINE only if truly offline
      if (!stillOnline)
        io.emit("user:offline", { userId });

      logger.info(`User ${userId} is now offline`);
    } catch (error: any) {
      logger.error(error, 'Error setting user offline');
    }
  };

  /**
   * Heartbeat to refresh presence
   */
  socket.on('presence:heartbeat', async () => {
    try {
      await presenceService.refreshPresence(userId);
    } catch (error: any) {
      logger.error(error, 'Error refreshing presence');
    }
  });

  // Register handlers
  handleConnect();
  socket.on('disconnect', handleDisconnect);
}

import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

/**
 * Track online/offline status of users in real-time
 * 
 * How it works:
 * 1. Listens to 'user:online' and 'user:offline' socket events
 * 2. Maintains a Map of userId -> boolean (online status)
 * 3. Provides helpers to check if specific user is online
 * 
 * FIXES:
 * - Online users stored as SET membership (not boolean flags)
 * - Offline users are removed instead of marked false
 * - Memory remains bounded
 * 
 * Usage:
 * const { isUserOnline, onlineUsers } = usePresence(socket);
 * const userIsOnline = isUserOnline('userId123');
 */
export function usePresence(socket: Socket | null) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socket) return;

    // Handler for user coming online
    const handleUserOnline = ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
    };
    
    // Handler for user going offline
    const handleUserOffline = ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    // Register event listeners
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    // Send heartbeat every 25 seconds to maintain online status
    /**
    * 💓 Heartbeat
    * Keeps Redis TTL alive.
    * Backend TTL is authoritative.
    */
    const heartbeat = setInterval(() => {
      if (socket.connected) {
        socket.emit('presence:heartbeat');
      }
    }, 25000);

    // Cleanup
    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
      clearInterval(heartbeat);
    };
  }, [socket]);

  // Helper function to check if a specific user is online
  const isUserOnline = useCallback((userId: string) => onlineUsers.has(userId), [onlineUsers]);

  const seedPresence = useCallback((status: Record<string, boolean>) => {
    setOnlineUsers(() => {
      const set = new Set<string>();
      Object.entries(status).forEach(([userId, online]) => {
        if (online) set.add(userId);
      });
      return set;
    });
  }, []);

  return {
    onlineUsers,
    isUserOnline,
    seedPresence,
  };
}

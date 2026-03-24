import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { io, Socket } from 'socket.io-client';

/**
 * Custom hook to manage Socket.IO connection with Clerk authentication
 * 
 * Features:
 * - Automatic connection with JWT token
 * - Auto-reconnection on token refresh
 * - Connection state management
 * - Cleanup on unmount
 * 
 * FIXES:
 * 1. Ensures only ONE socket exists per tab at any time
 * 2. Explicitly disconnects old socket before reconnecting
 * 3. Prevents duplicate presence increments on backend
 */
export function useSocket() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Do not connect until auth is ready
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let isMounted = true;

    const connectSocket = async () => {
      try {
        setIsConnecting(true);

        // 🔐 Always fetch a fresh Clerk token
        const token = await getToken();
        if (!token || !isMounted) return;

        /**
         * 🔴 CRITICAL FIX:
         * Disconnect any existing socket before creating a new one.
         *
         * Without this:
         * - Multiple sockets are created
         * - Backend presence count becomes incorrect
         */
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }

        // Create socket connection
        // Extract base URL from VITE_API_URL (remove /api/v1 suffix if present)
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';
        const baseUrl = apiUrl.replace(/\/api\/v1$/, '');
        
        const socket = io(baseUrl, {
          path: '/api/v1/socket.io',
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        // Connection event handlers
        socket.on('connect', () => {
          console.log('✅ Socket connected:', socket.id);
          setIsConnected(true);
          setIsConnecting(false);
        });

        socket.on('disconnect', (reason) => {
          if (!isMounted) return;
          console.log('❌ Socket disconnected:', reason);
          setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
          console.error('❌ Socket error:', error.message);
          setIsConnecting(false);
          setIsConnected(false);
        });

        socketRef.current = socket;
      } catch (error) {
        console.error('Socket initialization failed:', error);
        setIsConnecting(false);
      }
    };

    connectSocket();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (socketRef.current) {
        console.log('🧹 Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [getToken, isLoaded, isSignedIn]);

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
  };
}

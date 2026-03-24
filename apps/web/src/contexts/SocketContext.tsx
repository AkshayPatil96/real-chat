import { createContext, useContext, type ReactNode } from "react";
import type { Socket } from "socket.io-client";

import { useSocket } from "@/hooks/useSocket";
import { usePresence } from "@/hooks/usePresence";

/**
 * SocketContextValue
 *
 * Responsibilities:
 * - Expose socket instance
 * - Expose connection state
 * - Expose presence read helpers
 * - Expose seedPresence for initial snapshot (RTK Query → Redis)
 */
interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;

  // Presence helpers
  isUserOnline: (userId: string) => boolean;
  onlineUsers: Set<string>;

  /**
   * Seed initial presence snapshot.
   *
   * IMPORTANT:
   * - Called once after REST snapshot
   * - After this, socket events mutate presence
   */
  seedPresence: (snapshot: Record<string, boolean>) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

/**
 * SocketProvider
 *
 * Placement:
 * - AFTER ClerkProvider
 * - HIGH in component tree
 *
 * Why:
 * - One socket per tab
 * - Presence shared across app
 */
export function SocketProvider({ children }: SocketProviderProps) {
  /**
   * Socket lifecycle (auth + reconnect handled here)
   */
  const { socket, isConnected, isConnecting } = useSocket();

  /**
   * Presence state
   * - Redis snapshot seeds it
   * - Socket events mutate it
   */
  const { onlineUsers, isUserOnline, seedPresence } = usePresence(socket);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        isConnecting,
        isUserOnline,
        onlineUsers,
        seedPresence,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

/**
 * useSocketContext
 *
 * Safe accessor hook.
 * Throws if used outside SocketProvider.
 */
export function useSocketContext() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocketContext must be used within SocketProvider");
  }

  return context;
}

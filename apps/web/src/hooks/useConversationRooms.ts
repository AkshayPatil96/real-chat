import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

/**
 * useConversationRooms
 * 
 * PURPOSE:
 * Automatically join/leave Socket.IO rooms for ALL user's conversations.
 * 
 * WHY THIS IS NEEDED:
 * - Backend emits "message:new" to `conversation:${conversationId}` room
 * - Users must be IN the room to receive the event
 * - Without this, messages to inactive conversations are NOT received
 * - Result: unread counts and last message don't update in real-time
 * 
 * ARCHITECTURE:
 * - Join all conversation rooms on mount/update
 * - Leave old rooms when conversation list changes
 * - Efficient: only joins/leaves when conversation IDs change
 * 
 * SCALABILITY:
 * - Typical user: 5-20 conversations → negligible overhead
 * - Power user: 100+ conversations → still acceptable (just socket rooms)
 * - Alternative: backend could broadcast to all participants without rooms,
 *   but that's more complex backend logic
 * 
 * REAL-TIME FLOW:
 * 1. User connects → this hook joins all conversation rooms
 * 2. Someone sends message → backend emits to room
 * 3. User receives event → useMessageSync updates cache
 * 4. UI updates instantly without refetch
 * 
 * @param socket - Socket.IO client instance
 * @param conversationIds - Array of conversation IDs to join
 */
export function useConversationRooms(
  socket: Socket | null,
  conversationIds: string[]
) {
  // Track which rooms we're currently in to avoid duplicate joins
  const joinedRoomsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!socket || conversationIds.length === 0) return;

    const currentRooms = new Set(conversationIds);
    const previousRooms = joinedRoomsRef.current;

    // Find rooms to join (in current but not in previous)
    const toJoin = conversationIds.filter((id) => !previousRooms.has(id));

    // Find rooms to leave (in previous but not in current)
    const toLeave = Array.from(previousRooms).filter((id) => !currentRooms.has(id));

    // Join new rooms
    toJoin.forEach((conversationId) => {
      socket.emit('conversation:join', { conversationId });
      console.log(`🚪 Joined conversation room: ${conversationId}`);
    });

    // Leave old rooms
    toLeave.forEach((conversationId) => {
      socket.emit('conversation:leave', { conversationId });
      console.log(`🚪 Left conversation room: ${conversationId}`);
    });

    // Update tracking
    joinedRoomsRef.current = currentRooms;

    // Cleanup: leave all rooms on unmount
    return () => {
      Array.from(joinedRoomsRef.current).forEach((conversationId) => {
        socket.emit('conversation:leave', { conversationId });
        console.log(`🧹 Cleanup: left conversation room ${conversationId}`);
      });
      joinedRoomsRef.current.clear();
    };
  }, [socket, conversationIds]);
}

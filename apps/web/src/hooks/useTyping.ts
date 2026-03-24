import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

/**
 * How long after last keystroke we auto-stop typing
 * Must be < human pause, > network jitter
 */
const TYPING_TIMEOUT_MS = 3000;

interface TypingUpdatePayload {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

/**
 * useTyping
 *
 * Responsibilities:
 * - Join / leave conversation rooms
 * - Emit typing:start / typing:stop (debounced)
 * - Track who is typing per conversation
 * - Cleanup safely on unmount / disconnect
 *
 * IMPORTANT:
 * - Typing is ephemeral
 * - Best-effort only
 * - Never persisted
 */
export function useTyping(
  socket: Socket | null,
  conversationId?: string,
  currentUserId?: string
) {
  /**
   * Set of userIds currently typing in THIS conversation
   */
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  /**
   * Timeout used to auto-stop typing after inactivity
   */
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * NOTE: Room joining is now handled by useConversationRooms hook
   * This hook only manages typing state for the ACTIVE conversation
   */

  /**
   * ----------------------------
   * Listen for typing updates
   * ----------------------------
   */
  useEffect(() => {
    if (!socket) return;

    const handleTypingUpdate = (payload: TypingUpdatePayload) => {
      const { userId, conversationId: cid, isTyping } = payload;

      // Ignore events for other conversations
      if (cid !== conversationId) return;

      // Ignore self
      if (userId === currentUserId) return;

      setTypingUsers((prev) => {
        const next = new Set(prev);

        if (isTyping) {
          next.add(userId);
        } else {
          next.delete(userId);
        }

        return next;
      });
    };

    socket.on('typing:update', handleTypingUpdate);

    return () => {
      socket.off('typing:update', handleTypingUpdate);
    };
  }, [socket, conversationId, currentUserId]);

  /**
   * ----------------------------
   * Emit typing:start (debounced)
   * ----------------------------
   */
  const startTyping = () => {
    if (!socket || !conversationId) return;

    socket.emit('typing:start', { conversationId });

    // Reset auto-stop timer
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
    }

    stopTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, TYPING_TIMEOUT_MS);
  };

  /**
   * ----------------------------
   * Emit typing:stop
   * ----------------------------
   */
  const stopTyping = () => {
    if (!socket || !conversationId) return;

    socket.emit('typing:stop', { conversationId });

    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
  };

  /**
   * ----------------------------
   * Cleanup on unmount
   * ----------------------------
   */
  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, []);

  return {
    /**
     * Set of userIds currently typing
     * UI decides how to render this
     */
    typingUsers,

    /**
     * Call on input change / keypress
     */
    startTyping,

    /**
     * Call on blur / send message
     */
    stopTyping,
  };
}

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { Socket } from 'socket.io-client';
import type { AppDispatch } from '@/store/store';
import { messagesApi } from '@/store/api/messagesApi';
import { conversationsApi } from '@/store/api/conversationsApi';
import type { Message } from '@repo/api-core';

/**
 * Real-time message synchronization via Socket.IO
 * 
 * Architecture:
 * - REST API is source of truth (POST /messages)
 * - Socket.IO used ONLY for real-time delivery
 * - Updates RTK Query cache when message:new received
 * - No duplicate messages (sender already has via optimistic update)
 * 
 * Flow:
 * 1. User A sends message via REST
 * 2. Backend saves to MongoDB
 * 3. Backend emits socket event to room
 * 4. User B receives event → this hook updates cache
 * 5. UI automatically re-renders (RTK Query selector)
 * 
 * @param socket - Socket.IO client instance
 * @param activeConversationId - Currently active conversation
 * @param currentUserId - Current user's MongoDB ID
 */
export function useMessageSync(
  socket: Socket | null,
  activeConversationId: string | undefined,
  currentUserId: string
) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (!socket) return;

    /**
     * Handle incoming real-time message
     * 
     * IMPORTANT:
     * - Always update conversation list cache for unread counts and last message
     * - Only update message cache if it's the active conversation
     * - Skip cache update if sender is current user (already in cache via optimistic update)
     * - Increment unread count ONLY if:
     *   1. Message is not from current user
     *   2. Conversation is NOT currently active
     * - Move updated conversation to top of list for better UX
     */
    const handleNewMessage = (data: { message: Message }) => {
      const { message } = data;
      console.log('🔔 Received message:new event:', {
        messageId: message.id,
        conversationId: message.conversationId,
        activeConversationId,
      });

      // Extract senderId - can be string or populated object {id, username, avatar}
      const getSenderId = (senderId: string | { id: string }) => {
        return typeof senderId === 'string' ? senderId : senderId.id;
      };

      const messageSenderId = getSenderId(message.senderId as string | { id: string });
      console.log('👤 Message sender:', messageSenderId, '| Current user:', currentUserId);

      /**
       * Update conversation list cache immediately
       * 
       * Why local mutation instead of refetch:
       * - Instant UI update (no loading state)
       * - Reduces server load
       * - RTK Query cache is already correct source
       * - Socket events are idempotent (message already in DB)
       */
      dispatch(
        conversationsApi.util.updateQueryData(
          'listConversations',
          { page: 1, limit: 50 },
          (draft) => {
            const convIndex = draft.findIndex((c) => c.id === message.conversationId);
            if (convIndex === -1) return;

            const conv = draft[convIndex];

            // Update last message (always)
            conv.lastMessage = {
              messageId: message.id,
              content: message.content,
              senderId: messageSenderId,
              type: message.type || 'text',
              timestamp: message.createdAt,
            };

            /**
             * Increment unread count ONLY if:
             * - Message is from someone else
             * - This conversation is NOT currently active
             * 
             * Why check activeConversationId:
             * - If conversation is active, messages are marked read immediately
             * - Prevents "flash" of unread badge before mark-as-read API completes
             */
            const isFromOtherUser = messageSenderId !== currentUserId;
            const isActiveConversation = message.conversationId === activeConversationId;

            if (isFromOtherUser && !isActiveConversation) {
              conv.unreadCount = (conv.unreadCount || 0) + 1;
              console.log(`📬 Incremented unread count for conversation ${message.conversationId}`);
            } else if (isActiveConversation) {
              console.log(`👁️ Message for active conversation, no unread increment`);
            }

            /**
             * Move conversation to top of list
             * 
             * Why:
             * - Most recent conversations should appear first
             * - Standard chat UX pattern (WhatsApp, Slack, etc.)
             * - Helps users find active conversations quickly
             */
            if (convIndex > 0) {
              draft.splice(convIndex, 1); // Remove from current position
              draft.unshift(conv); // Add to top
              console.log(`⬆️ Moved conversation ${message.conversationId} to top`);
            }

            console.log(`✅ Updated conversation ${message.conversationId} in cache`);
          }
        )
      );

      // Skip own messages (already added via optimistic update)
      if (messageSenderId === currentUserId) {
        console.log('📭 Ignoring own message (already in cache)');
        return;
      }

      console.log('📨 Received real-time message:', message.id);

      // ✅ ALWAYS emit delivery receipt for messages from others, regardless of active conversation
      // This ensures delivery status is updated even when user is viewing a different conversation
      socket.emit('message:delivered', {
        messageId: message.id,
        conversationId: message.conversationId
      });
      console.log(`📬 Sent delivery receipt for message ${message.id}`);

      // Only update message cache if this is the active conversation
      if (message.conversationId !== activeConversationId) {
        console.log('📭 Message for different conversation, delivery sent but not adding to cache');
        return;
      }

      // Update RTK Query cache with new message
      dispatch(
        messagesApi.util.updateQueryData(
          'getMessages',
          { conversationId: activeConversationId, limit: 50 },
          (draft) => {
            // Check for duplicates before adding
            const exists = draft.messages.some((m) => m.id === message.id);
            if (!exists) {
              draft.messages.push(message); // Add to end (bottom)
              console.log('✅ Message added to cache');
            } else {
              console.log('⚠️ Duplicate message ignored');
            }
          }
        )
      );
    };

    /**
     * Handle read receipt
     * When someone else reads a message you sent, update delivery state to 'read'
     */
    const handleMessageRead = (data: { messageId: string; conversationId: string; userId: string }) => {
      const { messageId, conversationId, userId: readerId } = data;

      // Only update if someone else read our message
      if (readerId === currentUserId) {
        return;
      }

      console.log(`👁️ Message ${messageId} was read by another user`);

      // Only update cache if we're currently viewing this conversation
      if (conversationId !== activeConversationId) {
        console.log(`ℹ️ Read receipt for different conversation, will update on load`);
        return;
      }

      // Update delivery state in the active conversation cache
      dispatch(
        messagesApi.util.updateQueryData(
          'getMessages',
          { conversationId: activeConversationId, limit: 50 },
          (draft) => {
            const msg = draft.messages.find((m) => m.id === messageId);
            if (msg && getSenderId(msg.senderId as string | { id: string }) === currentUserId) {
              msg.deliveryState = 'read';
              console.log(`✅ Updated message ${messageId} to read state`);
            }
          }
        )
      );
    };

    /**
     * Handle delivery receipt
     * When someone receives a message you sent, update delivery state to 'delivered'
     * 
     * Data contains:
     * - messageId: The message that was delivered
     * - conversationId: The conversation
     * - userId: The person who RECEIVED the message (not the sender)
     */
    const handleMessageDelivered = (data: { messageId: string; conversationId: string; userId: string }) => {
      const { messageId, conversationId, userId: receiverId } = data;

      // Skip if this delivery receipt is from ourselves
      // (We sent the message and also received the broadcast)
      if (receiverId === currentUserId) {
        console.log(`⏭️ Skipping own delivery receipt for message ${messageId}`);
        return;
      }

      console.log(`📬 Delivery receipt: message ${messageId} delivered to user ${receiverId}`);

      // Only update cache if we're currently viewing this conversation
      // Otherwise, the delivery state will be fetched correctly when user opens it
      if (conversationId !== activeConversationId) {
        console.log(`ℹ️ Delivery receipt for different conversation, will update on load`);
        return;
      }

      // Update the cache for the active conversation
      dispatch(
        messagesApi.util.updateQueryData(
          'getMessages',
          { conversationId: activeConversationId, limit: 50 },
          (draft) => {
            const msg = draft.messages.find((m) => m.id === messageId);
            
            if (!msg) {
              console.log(`⚠️ Message ${messageId} not found in cache`);
              return;
            }

            const msgSenderId = getSenderId(msg.senderId as string | { id: string });

            // Only update if current user is the sender
            if (msgSenderId !== currentUserId) {
              console.log(`⏭️ Not sender, skipping update`);
              return;
            }

            // Only update to delivered if not already read
            if (msg.deliveryState === 'sent') {
              msg.deliveryState = 'delivered';
              console.log(`✅ Message ${messageId} → delivered ✓✓`);
            } else {
              console.log(`⏭️ Message ${messageId} already ${msg.deliveryState}`);
            }
          }
        )
      );
    };

    // Helper to extract senderId
    const getSenderId = (senderId: string | { id: string }) => {
      return typeof senderId === 'string' ? senderId : senderId.id;
    };

    // Register socket listeners
    socket.on('message:new', handleNewMessage);
    socket.on('message:read', handleMessageRead);
    socket.on('message:delivered', handleMessageDelivered);

    console.log(`🔌 Listening for messages globally`);

    // Cleanup on unmount or conversation change
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:read', handleMessageRead);
      socket.off('message:delivered', handleMessageDelivered);
      console.log('🔌 Stopped listening for messages');
    };
  }, [socket, activeConversationId, currentUserId, dispatch]);
}

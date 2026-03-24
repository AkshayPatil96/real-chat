/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useDispatch } from "react-redux";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useJumpToMessage } from "@/hooks/useJumpToMessage";

import {
  useListConversationsQuery,
  conversationsApi,
} from "@/store/api/conversationsApi";

import {
  useGetMessagesQuery,
  useSendMessageMutation,
  useMarkAsReadMutation,
  messagesApi,
} from "@/store/api/messagesApi";

import { useGetPresenceStatusQuery } from "@/store/api/presenceApi";
import { useSocketContext } from "@/contexts/SocketContext";
import { useTyping } from "@/hooks/useTyping";
import { useMessageSync } from "@/hooks/useMessageSync";
import { useConversationRooms } from "@/hooks/useConversationRooms";
import type { AppDispatch } from "@/store/store";
import type { MessageDTO } from "@repo/shared-types";

interface ChatContainerProps {
  currentUserId: string;
  currentUser: {
    name: string;
    email?: string;
    avatar?: string;
  };
}

export function ChatContainer({
  currentUserId,
  currentUser,
}: ChatContainerProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { conversationId: activeConversationId } = useParams<{
    conversationId?: string;
  }>();

  // Track messages that have been marked as read to prevent duplicate API calls
  const markedAsReadRef = useRef<Set<string>>(new Set());

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [jumpedMessages, setJumpedMessages] = useState<any[]>([]);
  const [isJumpMode, setIsJumpMode] = useState(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>("");

  const { isTokenReady } = useAuth();

  /**
   * Socket context
   * - isUserOnline → read-only presence check
   * - seedPresence → seed initial Redis snapshot
   */
  const { isUserOnline, socket, seedPresence } = useSocketContext();

  /**
   * Fetch conversations
   */
  const { data: conversationsData = [], isLoading: conversationsLoading } =
    useListConversationsQuery({ page: 1, limit: 50 }, { skip: !isTokenReady });

  /**
   * 🚪 Join all conversation rooms to receive real-time updates
   *
   * CRITICAL:
   * - Backend emits "message:new" to `conversation:${id}` rooms
   * - Without joining, we won't receive messages for inactive conversations
   * - This enables real-time unread counts and last message updates
   */
  const conversationIds = useMemo(
    () => conversationsData.map((conv: any) => conv.id),
    [conversationsData],
  );
  useConversationRooms(socket, conversationIds);

  /**
   * Typing state for active conversation
   */
  const { typingUsers, startTyping, stopTyping } = useTyping(
    socket,
    activeConversationId,
    currentUserId,
  );

  /**
   * Real-time message synchronization
   * Updates RTK Query cache when socket event received
   */
  useMessageSync(socket, activeConversationId, currentUserId);

  /**
   * Fetch messages for active conversation with cursor pagination
   */
  const {
    data: messagesData,
    isLoading: messagesLoading,
    isFetching,
  } = useGetMessagesQuery(
    { conversationId: activeConversationId!, limit: 50 },
    { skip: !activeConversationId },
  );

  /**
   * Load more messages handler (for infinite scroll)
   */
  const handleLoadMore = () => {
    if (!messagesData?.pagination?.nextCursor || isFetching) {
      return;
    }

    // Trigger fetch with cursor to load older messages
    dispatch(
      messagesApi.endpoints.getMessages.initiate(
        {
          conversationId: activeConversationId!,
          cursor: messagesData.pagination.nextCursor,
          limit: 50,
        },
        { subscribe: false, forceRefetch: true },
      ),
    );
  };

  const [sendMessage, { isLoading: sendingMessage }] = useSendMessageMutation();

  const [markAsRead] = useMarkAsReadMutation();

  /**
   * Jump to message functionality
   */
  const handleMessagesLoad = useCallback((messages: any[]) => {
    // Sort messages in descending order (newest first) to match normal pagination
    // The backend returns them in ascending order (oldest first)
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setJumpedMessages(sortedMessages);
    setIsJumpMode(true);
    // Keep search open - don't close it
  }, []);

  const { jumpToMessage, registerMessageRef } = useJumpToMessage({
    conversationId: activeConversationId,
    onMessagesLoad: handleMessagesLoad,
  });

  /**
   * Handle search result click
   */
  const handleSearchResultClick = useCallback(
    (messageId: string, query: string) => {
      setActiveSearchQuery(query);
      jumpToMessage(messageId);
      // Keep search open so user can navigate through multiple results
    },
    [jumpToMessage]
  );

  /**
   * Reset jump mode when conversation changes
   */
  useEffect(() => {
    setIsJumpMode(false);
    setJumpedMessages([]);
    setActiveSearchQuery("");
  }, [activeConversationId]);

  /**
   * Determine which messages to display: jumped messages or normal pagination
   */
  const displayMessages = isJumpMode ? jumpedMessages : (messagesData?.messages || []);

  /**
   * 🔑 Derive participant IDs for presence snapshot
   *
   * WHY:
   * - Presence is user-based, not conversation-based
   * - Exclude current user
   * - Memoized to avoid unnecessary refetch
   */
  const participantIds = useMemo(() => {
    return conversationsData
      .flatMap((conv: any) => conv.participants || [])
      .map((p: any) => p.id)
      .filter((id: string) => id !== currentUserId);
  }, [conversationsData, currentUserId]);

  /**
   * 🔵 Presence snapshot (Redis-backed, one-time)
   *
   * RTK Query is used ONLY to bootstrap presence.
   * Socket events handle live updates.
   */
  const { data: presenceSnapshot, isSuccess: presenceLoaded } =
    useGetPresenceStatusQuery(participantIds, {
      skip: participantIds.length === 0,
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    });

  /**
   * 🌱 Seed initial presence state
   *
   * IMPORTANT:
   * - This runs ONCE per conversation load
   * - After this, socket events mutate presence
   */
  useEffect(() => {
    if (!presenceLoaded || !presenceSnapshot) return;
    seedPresence(presenceSnapshot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenceLoaded, presenceSnapshot]);

  /**
   * Clear marked messages set when switching conversations
   */
  useEffect(() => {
    markedAsReadRef.current.clear();
  }, [activeConversationId]);

  /**
   * Mark messages as read when opening a conversation
   * Only marks messages that haven't been marked before to prevent duplicate API calls
   * Also clears the unread count in the conversation list cache
   */
  useEffect(() => {
    if (!activeConversationId || !messagesData?.messages) return;

    const unreadMessages = messagesData.messages.filter((msg: any) => {
      // senderId can be a string or populated object {id, username, avatar}
      const messageSenderId =
        typeof msg.senderId === "string" ? msg.senderId : msg.senderId?.id;
      return (
        messageSenderId !== currentUserId &&
        !msg.readBy?.includes(currentUserId) &&
        !markedAsReadRef.current.has(msg.id) // Skip already marked messages
      );
    });

    // If there are unread messages, clear the unread count in cache
    if (unreadMessages.length > 0) {
      dispatch(
        conversationsApi.util.updateQueryData(
          "listConversations",
          { page: 1, limit: 50 },
          (draft) => {
            const conv = draft.find((c) => c.id === activeConversationId);
            if (conv) {
              conv.unreadCount = 0;
            }
          },
        ),
      );
    }

    // Mark new unread messages
    unreadMessages.forEach((msg: any) => {
      markedAsReadRef.current.add(msg.id); // Track before API call
      markAsRead({
        conversationId: activeConversationId,
        messageId: msg.id,
      }).catch(() => {
        // Remove from tracked set on error
        markedAsReadRef.current.delete(msg.id);
      });
    });
  }, [activeConversationId, messagesData, currentUserId, markAsRead, dispatch]);

  /**
   * Send message handler
   * @param content - Message text content
   * @param fileKey - S3 file key (only fileKey, no URLs)
   */
  const handleSendMessage = async (content: string, fileKey?: string): Promise<void> => {
    if (!activeConversationId || (!content.trim() && !fileKey)) return;

    try {
      const payload: any = {
        conversationId: activeConversationId,
        content: content.trim(),
      };

      // Add fileKey if present (backend will move from temp/ to final location)
      if (fileKey) {
        payload.fileKey = fileKey;
      }

      await sendMessage(payload).unwrap();
    } catch (error: any) {
      toast.error("Failed to send message", {
        description: error?.data?.error?.message || "Please try again",
      });
      throw error; // Re-throw to let MessageInput handle it
    }
  };

  const conversations = conversationsData;

  const activeConversation = conversations.find(
    (c: any) => c.id === activeConversationId,
  );

  /**
   * Helper: get other participant in direct chat
   */
  const getOtherParticipant = (conv: any) => {
    if (conv.type === "direct" && conv.participants?.length > 0) {
      return (
        conv.participants.find((p: any) => p.id !== currentUserId) ||
        conv.participants[0]
      );
    }
    return null;
  };

  const onLogout = () => {
    navigate("/logout");
  };

  return (
    <div className="h-screen w-full relative">
      <AppShell
        conversations={conversations.map((conv: any) => {
          const otherParticipant = getOtherParticipant(conv);
          const participantId = otherParticipant?.id;
          const online = participantId ? isUserOnline(participantId) : false;
          const typing = participantId ? typingUsers.has(participantId) : false;

          return {
            id: conv.id,
            name: conv.name || otherParticipant?.username || "Unknown",
            avatar: otherParticipant?.avatar,
            lastMessage: conv.lastMessage?.content || undefined,
            lastMessageTime: conv.lastMessage?.timestamp
              ? new Date(conv.lastMessage.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : undefined,
            unreadCount: conv.unreadCount || 0,
            isOnline: online,
            isTyping: typing,
            type: conv.type,
          };
        })}
        messages={displayMessages as MessageDTO[]}
        currentUserId={currentUserId}
        currentUser={currentUser}
        onSendMessage={async (content, fileKey) => {
          stopTyping();
          await handleSendMessage(content, fileKey);
        }}
        onTyping={startTyping}
        onStopTyping={stopTyping}
        onSearchClick={() => setIsSearchOpen(true)}
        onRegisterMessageRef={registerMessageRef}
        isSearchOpen={isSearchOpen}
        onSearchClose={() => setIsSearchOpen(false)}
        onSearchResultClick={handleSearchResultClick}
        searchQuery={activeSearchQuery}
        onNewChat={() =>
          toast.info("Create conversation", {
            description: "Feature coming soon",
          })
        }
        onLogout={onLogout}
        loading={conversationsLoading}
        activeConversationId={activeConversationId}
        onConversationClick={(id) => navigate(`/chat/${id}`)}
        messagesLoading={messagesLoading}
        sendingMessage={sendingMessage}
        conversationName={
          activeConversation
            ? activeConversation.name ||
              getOtherParticipant(activeConversation)?.username ||
              "Unknown"
            : undefined
        }
        onLoadMore={isJumpMode ? undefined : handleLoadMore}
        hasMore={isJumpMode ? false : (messagesData?.pagination?.hasNextPage ?? false)}
        loadingMore={isFetching && !messagesLoading}
      />
    </div>
  );
}

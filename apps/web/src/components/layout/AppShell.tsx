"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ChatPanel } from "./ChatPanel";
import type { MessageDTO } from "@repo/shared-types";

interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  isTyping?: boolean;
  participantCount?: number;
  type?: "direct" | "group";
}

interface AppShellProps {
  conversations: Conversation[];
  messages: MessageDTO[];
  currentUserId: string;
  currentUser?: {
    name: string;
    avatar?: string;
    email?: string;
  };
  onSendMessage: (content: string, fileKey?: string) => Promise<void>;
  onConversationClick?: (conversationId: string) => void;
  onTyping?: (conversationId: string) => void;
  onStopTyping?: () => void;
  onNewChat?: () => void;
  onLogout?: () => void;
  loading?: boolean;
  messagesLoading?: boolean;
  sendingMessage?: boolean;
  activeConversationId?: string;
  conversationName?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onSearchClick?: () => void;
  onRegisterMessageRef?: (messageId: string, element: HTMLElement | null) => void;
  isSearchOpen?: boolean;
  onSearchClose?: () => void;
  onSearchResultClick?: (messageId: string, query: string) => void;
  searchQuery?: string;
}

export function AppShell({
  conversations,
  messages,
  currentUserId,
  currentUser,
  onSendMessage,
  onConversationClick,
  onTyping,
  onStopTyping,
  onNewChat,
  onLogout,
  loading,
  messagesLoading,
  sendingMessage,
  activeConversationId: propActiveConversationId,
  conversationName,
  onLoadMore,
  hasMore,
  loadingMore,
  onSearchClick,
  onRegisterMessageRef,
  isSearchOpen,
  onSearchClose,
  onSearchResultClick,
  searchQuery,
}: AppShellProps) {
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);

  const activeConversationId = propActiveConversationId;

  const handleConversationClick = (id: string) => {
    setIsMobileSidebarOpen(false);
    onConversationClick?.(id);
  };

  const handleBackToSidebar = () => {
    setIsMobileSidebarOpen(true);
    navigate("/"); // Navigate back to base route, clearing conversation from URL
  };

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId,
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <div
        className={`
          ${isMobileSidebarOpen ? "block" : "hidden"}
          lg:block
          w-full lg:w-96
          h-full
        `}
      >
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onConversationClick={handleConversationClick}
          loading={loading}
          currentUser={currentUser}
          onNewChat={onNewChat}
          onLogout={onLogout}
        />
      </div>

      <div
        className={`
          ${!isMobileSidebarOpen ? "block" : "hidden"}
          lg:block
          flex-1
          h-full
        `}
      >
        <ChatPanel
          conversationId={activeConversationId}
          conversationName={conversationName || activeConversation?.name}
          conversationAvatar={activeConversation?.avatar}
          isOnline={activeConversation?.isOnline}
          isTyping={activeConversation?.isTyping}
          participantCount={activeConversation?.participantCount}
          type={activeConversation?.type}
          messages={messages}
          currentUserId={currentUserId}
          onSendMessage={onSendMessage}
          onTyping={
            onTyping ? () => onTyping(activeConversationId!) : undefined
          }
          onStopTyping={onStopTyping}
          onBackClick={handleBackToSidebar}
          onSearchClick={onSearchClick}
          loading={messagesLoading}
          disabled={sendingMessage}
          onLoadMore={onLoadMore}
          hasMore={hasMore}
          loadingMore={loadingMore}
          typingUser={
            activeConversation?.isTyping ? activeConversation.name : undefined
          }
          onRegisterMessageRef={onRegisterMessageRef}
          isSearchOpen={isSearchOpen}
          onSearchClose={onSearchClose}
          onSearchResultClick={onSearchResultClick}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
}

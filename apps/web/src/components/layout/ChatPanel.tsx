/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { ChatHeader } from "../chat/ChatHeader";
import { MessageList } from "../chat/MessageList";
import { MessageInput } from "../chat/MessageInput";
import { MessageSearch } from "../chat/MessageSearch";
import { ImageViewerModal } from "../chat/ImageViewerModal";
import { ConversationMediaPanel } from "../chat/ConversationMediaPanel";
import { EmptyState } from "../common/EmptyState";
import { MessageSquare } from "lucide-react";
import type { MessageDTO } from "@repo/shared-types";

interface ChatPanelProps {
  conversationId?: string;
  conversationName?: string;
  conversationAvatar?: string;
  isOnline?: boolean;
  isTyping?: boolean;
  participantCount?: number;
  messages: MessageDTO[];
  currentUserId: string;
  onSendMessage: (content: string, fileKey?: string) => Promise<void>;
  onTyping?: () => void;
  onStopTyping?: () => void;
  onBackClick?: () => void;
  onSearchClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  typingUser?: string;
  type?: "direct" | "group";
  onRegisterMessageRef?: (
    messageId: string,
    element: HTMLElement | null,
  ) => void;
  isSearchOpen?: boolean;
  onSearchClose?: () => void;
  onSearchResultClick?: (messageId: string, query: string) => void;
  searchQuery?: string;
  isMediaOpen?: boolean;
  onMediaClick?: () => void;
  onMediaClose?: () => void;
}

export function ChatPanel({
  conversationId,
  conversationName,
  conversationAvatar,
  isOnline,
  isTyping,
  participantCount,
  messages,
  currentUserId,
  onSendMessage,
  onTyping,
  onStopTyping,
  onBackClick,
  onSearchClick,
  loading,
  disabled,
  onLoadMore,
  hasMore,
  loadingMore,
  typingUser,
  type,
  onRegisterMessageRef,
  isSearchOpen,
  onSearchClose,
  onSearchResultClick,
  searchQuery,
}: ChatPanelProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string>("");
  const [isMediaPanelOpen, setIsMediaPanelOpen] = useState(false);

  const handleImageClick = (messageId: string) => {
    setSelectedMessageId(messageId);
    setViewerOpen(true);
  };

  const handleMediaClick = () => {
    setIsMediaPanelOpen(!isMediaPanelOpen);
  };

  if (!conversationId) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-chat-background">
        <EmptyState
          icon={MessageSquare}
          title="Welcome to RealChat"
          description="Select a conversation from the sidebar to start chatting, or create a new one"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Chat Area - adjust width when search or media panel is open */}
      <div
        className={`flex flex-col bg-chat-background h-full overflow-hidden transition-all duration-300 ${
          isSearchOpen || isMediaPanelOpen ? "w-full md:w-1/2 lg:w-3/4" : "w-full"
        }`}
      >
        <ChatHeader
          name={conversationName || "Unknown"}
          avatar={conversationAvatar}
          isOnline={isOnline}
          isTyping={isTyping}
          participantCount={participantCount}
          onBackClick={onBackClick}
          onSearchClick={onSearchClick}
          onMediaClick={handleMediaClick}
        />

        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          loading={loading}
          isTyping={isTyping}
          typingUser={typingUser}
          onLoadMore={onLoadMore}
          hasMore={hasMore}
          loadingMore={loadingMore}
          type={type}
          onRegisterMessageRef={onRegisterMessageRef}
          searchQuery={searchQuery}
          onImageClick={handleImageClick}
        />

        <MessageInput
          onSendMessage={onSendMessage}
          onTyping={onTyping}
          onStopTyping={onStopTyping}
          disabled={disabled}
        />
      </div>

      {/* Search Panel - 25% when open */}
      {isSearchOpen &&
        conversationId &&
        onSearchResultClick &&
        onSearchClose && (
          <div className="w-full md:w-1/2 lg:w-1/4 h-full border-l">
            <MessageSearch
              conversationId={conversationId}
              onResultClick={onSearchResultClick}
              isOpen={isSearchOpen}
              onClose={onSearchClose}
            />
          </div>
        )}

      {/* Media Panel - 25% when open */}
      {isMediaPanelOpen && conversationId && (
        <div className="w-full md:w-1/2 lg:w-1/4 h-full border-l bg-card">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Media & Files</h3>
            </div>
            <ConversationMediaPanel
              conversationId={conversationId}
              onImageClick={handleImageClick}
            />
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {conversationId && (
        <ImageViewerModal
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          conversationId={conversationId}
          initialMessageId={selectedMessageId}
        />
      )}
    </div>
  );
}

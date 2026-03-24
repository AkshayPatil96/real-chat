import { useEffect, useRef, useCallback } from "react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { Loader } from "../common/Loader";
import { EmptyState } from "../common/EmptyState";
import { MessageSquare } from "lucide-react";
import { parseISO, format } from "date-fns";
import type { MessageDTO } from "@repo/shared-types";

interface MessageListProps {
  messages: MessageDTO[];
  currentUserId: string;
  loading?: boolean;
  isTyping?: boolean;
  typingUser?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  type?: "direct" | "group";
  onRegisterMessageRef?: (messageId: string, element: HTMLElement | null) => void;
  searchQuery?: string;
  onImageClick?: (messageId: string) => void;
}

/**
 * Check if a UTC date string is today in UTC
 */
function isUTCToday(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  );
}

/**
 * Check if a UTC date string is yesterday in UTC
 */
function isUTCYesterday(dateString: string): boolean {
  const date = new Date(dateString);
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return (
    date.getUTCFullYear() === yesterday.getUTCFullYear() &&
    date.getUTCMonth() === yesterday.getUTCMonth() &&
    date.getUTCDate() === yesterday.getUTCDate()
  );
}

/**
 * Format date for message separators (in UTC)
 * Returns "Today", "Yesterday", or formatted date
 */
function formatDateSeparator(dateString: string): string {
  if (isUTCToday(dateString)) {
    return "Today";
  } else if (isUTCYesterday(dateString)) {
    return "Yesterday";
  } else {
    // Format as "January 30, 2026" in UTC
    const date = parseISO(dateString);
    return format(date, "MMMM d, yyyy");
  }
}

/**
 * Check if two dates are on the same UTC day
 */
function shouldShowDateSeparator(
  currentDate: string,
  previousDate: string | null,
): boolean {
  if (!previousDate) return true;

  const current = new Date(currentDate);
  const previous = new Date(previousDate);

  return !(
    current.getUTCFullYear() === previous.getUTCFullYear() &&
    current.getUTCMonth() === previous.getUTCMonth() &&
    current.getUTCDate() === previous.getUTCDate()
  );
}

/**
 * Date Separator Component
 */
function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium px-3 py-1 rounded-full">
        {formatDateSeparator(date)}
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  currentUserId,
  loading,
  isTyping,
  typingUser,
  onLoadMore,
  hasMore,
  loadingMore,
  type,
  onRegisterMessageRef,
  searchQuery,
  onImageClick,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string | undefined>(undefined);
  const previousScrollHeight = useRef<number>(0);
  const isLoadingMore = useRef<boolean>(false);

  // Handle scroll to bottom for new messages
  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      const newestMessageId = messages[0]?.id;

      // If loading more, maintain scroll position
      if (isLoadingMore.current && previousScrollHeight.current > 0) {
        const newScrollHeight = scrollRef.current.scrollHeight;
        const scrollDiff = newScrollHeight - previousScrollHeight.current;
        scrollRef.current.scrollTop += scrollDiff;
        isLoadingMore.current = false;
        previousScrollHeight.current = 0;
      }
      // Otherwise, scroll to bottom for new messages
      else if (newestMessageId !== lastMessageRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        lastMessageRef.current = newestMessageId;
      }
    }
  }, [messages]);

  // Handle scroll event for infinite scroll (load more when near top)
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) {
      return;
    }

    const { scrollTop } = scrollRef.current;

    if (!onLoadMore) {
      return;
    }

    if (!hasMore) {
      return;
    }

    if (loadingMore) {
      return;
    }

    // If scrolled near top (within 150px), load more
    if (scrollTop < 150) {
      isLoadingMore.current = true;
      previousScrollHeight.current = scrollRef.current.scrollHeight;
      onLoadMore();
    }
  }, [onLoadMore, hasMore, loadingMore]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[70vh]">
        <Loader size="lg" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[70vh]">
        <EmptyState
          icon={MessageSquare}
          title="No messages yet"
          description="Send a message to start the conversation"
        />
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 px-4 py-4 overflow-y-auto"
      onScroll={handleScroll}
    >
      {loadingMore && (
        <div className="flex justify-center py-2">
          <Loader size="lg" />
        </div>
      )}

      {(() => {
        const reversedMessages = [...messages].reverse();

        return reversedMessages.map((message, index) => {
          const isSent = message.senderId.id === currentUserId;
          const showAvatar = !isSent && type === "group";
          const previousDate =
            index > 0 ? reversedMessages[index - 1].createdAt : null;
          const showDateSeparator = shouldShowDateSeparator(
            message.createdAt,
            previousDate,
          );

          return (
            <div
              key={message.id}
              ref={(el) => onRegisterMessageRef?.(message.id, el)}
            >
              {showDateSeparator && <DateSeparator date={message.createdAt} />}
              <MessageBubble
                {...message}
                isSent={isSent}
                isGrouped={type === "group"}
                senderName={message.senderId.username}
                showAvatar={showAvatar}
                avatar={message.senderId.avatar}
                searchQuery={searchQuery}
                onImageClick={onImageClick}
              />
            </div>
          );
        });
      })()}

      {isTyping && typingUser && <TypingIndicator userName={typingUser} />}
    </div>
  );
}

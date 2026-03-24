import { useCallback, useRef } from "react";
import { useLazyGetMessagesAroundQuery } from "@/store/api/messagesApi";
import type { Message } from "@repo/api-core";

interface UseJumpToMessageOptions {
  conversationId: string | undefined;
  onMessagesLoad?: (messages: Message[], centerMessageId: string) => void;
}

export function useJumpToMessage({
  conversationId,
  onMessagesLoad,
}: UseJumpToMessageOptions) {
  const [getMessagesAround, { isLoading }] = useLazyGetMessagesAroundQuery();
  const messageRefs = useRef<Map<string, HTMLElement>>(new Map());
  const highlightTimeoutRef = useRef<number | undefined>(undefined);

  /**
   * Register a message element for scrolling
   */
  const registerMessageRef = useCallback(
    (messageId: string, element: HTMLElement | null) => {
      if (element) {
        messageRefs.current.set(messageId, element);
      } else {
        messageRefs.current.delete(messageId);
      }
    },
    []
  );

  /**
   * Scroll to a specific message and highlight it
   */
  const scrollToMessage = useCallback((messageId: string) => {
    const element = messageRefs.current.get(messageId);
    if (!element) {
      console.warn(`Message element not found for ID: ${messageId}`);
      return;
    }

    // Scroll to the message
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    // Add highlight class
    element.classList.add("message-highlight");

    // Remove highlight after 2 seconds
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      element.classList.remove("message-highlight");
    }, 2000);
  }, []);

  /**
   * Jump to a specific message by fetching messages around it
   */
  const jumpToMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId) {
        console.error("No active conversation");
        return;
      }

      try {
        const result = await getMessagesAround({
          messageId,
          limit: 50,
        }).unwrap();

        // Notify parent component about loaded messages
        if (onMessagesLoad) {
          onMessagesLoad(result.messages, result.centerMessageId);
        }

        // Wait for DOM to update, then scroll
        setTimeout(() => {
          scrollToMessage(result.centerMessageId);
        }, 100);
      } catch (error) {
        console.error("Failed to jump to message:", error);
      }
    },
    [conversationId, getMessagesAround, onMessagesLoad, scrollToMessage]
  );

  return {
    jumpToMessage,
    scrollToMessage,
    registerMessageRef,
    isLoading,
  };
}

import { ConversationItem } from "./ConversationItem";
import { Loader } from "../common/Loader";
import { EmptyState } from "../common/EmptyState";
import { MessageSquare, UserPlus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  isTyping?: boolean;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onConversationClick: (id: string) => void;
  loading?: boolean;
  onAddContact?: () => void;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onConversationClick,
  loading,
  onAddContact,
}: ConversationListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="Start a new conversation to get chatting"
          className="h-auto"
        />
        {onAddContact && (
          <Button
            onClick={onAddContact}
            className="-mt-8"
            size="sm"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add New Contact
          </Button>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            {...conversation}
            isActive={conversation.id === activeConversationId}
            onClick={() => onConversationClick(conversation.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

import { UserAvatar } from "../common/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConversationItemProps {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  isActive?: boolean;
  isTyping?: boolean;
  onClick?: () => void;
}

export function ConversationItem({
  name,
  avatar,
  lastMessage,
  lastMessageTime,
  unreadCount,
  isOnline,
  isActive,
  isTyping,
  onClick,
}: ConversationItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-4 py-3 flex items-center gap-3",
        "hover:bg-sidebar-hover transition-colors",
        "border-l-4 border-b-0",
        isActive ? "bg-sidebar border-primary" : "border-transparent",
      )}
    >
      <UserAvatar
        src={avatar}
        name={name}
        size="md"
        online={isOnline}
      />

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sidebar-foreground truncate">
            {name}
          </h3>
          {lastMessageTime && (
            <span
              className={`text-xs ml-2 shrink-0 ${unreadCount && unreadCount > 0 ? "text-destructive font-semibold" : "text-muted-foregrounds"}`}
            >
              {lastMessageTime}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-sm truncate",
              unreadCount && unreadCount > 0
                ? "text-sidebar-foreground font-medium"
                : "text-muted-foreground",
            )}
          >
            {isTyping ? (
              <span className="text-primary italic">typing...</span>
            ) : (
              lastMessage || "No messages yet"
            )}
          </p>
          {unreadCount !== undefined && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="ml-2 shrink-0 min-w-20px h-5 px-1.5 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

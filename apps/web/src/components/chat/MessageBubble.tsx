import { cn } from "@/lib/utils";
import type { MessageDTO } from "@repo/shared-types";
import { Check, CheckCheck } from "lucide-react";
import { getPublicUrl } from "@/lib/mediaUtils";

interface MessageBubbleProps extends MessageDTO {
  isSent: boolean;
  senderName?: string;
  showAvatar?: boolean;
  isGrouped?: boolean;
  avatar?: string;
  searchQuery?: string;
  onImageClick?: (messageId: string) => void;
}

export function MessageBubble({
  id,
  content,
  attachment,
  type,
  createdAt,
  isSent,
  senderName,
  showAvatar = true,
  isGrouped = false,
  deliveryState: status,
  avatar,
  searchQuery,
  onImageClick,
}: MessageBubbleProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Highlight search query in message content
  const highlightText = (text: string, query?: string) => {
    if (!query || !query.trim()) {
      return text;
    }

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-300 dark:bg-yellow-700 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isSent ? "justify-end" : "justify-start",
        isGrouped ? "mt-1" : "mt-4",
      )}
    >
      {!isSent && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium shrink-0">
          {showAvatar && avatar ? (
            <img
              src={avatar}
              alt={senderName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : senderName ? (
            senderName.charAt(0).toUpperCase()
          ) : (
            "?"
          )}
        </div>
      )}

      <div
        className={cn(
          "flex flex-col",
          isSent ? "items-end" : "items-start",
          "max-w-[70%]",
        )}
      >
        {!isSent && senderName && isGrouped && (
          <span className="text-xs text-muted-foreground mb-1 px-3">
            {senderName}
          </span>
        )}

        <div
          className={cn(
            "px-4 py-2 rounded-2xl wrap-break-word border border-border",
            isSent
              ? "bg-message-sent text-message-sent-foreground rounded-br-md"
              : "bg-message-received text-message-received-foreground rounded-bl-md",
          )}
        >
          {attachment && type === "image" && attachment.fileUrl && (
            <img
              src={getPublicUrl(attachment.fileUrl) || attachment.fileUrl}
              alt={attachment.fileName}
              className="mt-2 max-h-60 rounded-md object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onImageClick?.(id)}
            />
          )}
          {content && (
            <p className="text-base whitespace-pre-wrap">{highlightText(content, searchQuery)}</p>
          )}
          <div className="flex items-center justify-end gap-1 mt-1">
            <span
              className={`text-xs ${isSent ? "text-[#5f460f]" : "text-muted-foreground"}`}
            >
              {formatTime(createdAt)}
            </span>
            {isSent && status && (
              <span
                className={`${isSent ? "text-[#5f460f]" : "text-muted-foreground"}`}
              >
                {status === "sending" && <Check className="w-3 h-3" />}
                {status === "sent" && <Check className="w-3 h-3" />}
                {status === "delivered" && <CheckCheck className="w-3 h-3" />}
                {status === "read" && (
                  <CheckCheck className="w-3 h-3 text-blue-500" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* {isSent && <div className="w-8" />} */}
    </div>
  );
}

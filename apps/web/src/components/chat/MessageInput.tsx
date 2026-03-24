import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Smile, Send, Loader2 } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { FileUploadDropdown } from "./FileUploadDropdown";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { toast } from "sonner";
import { MediaPreview } from "./MediaPreview";

interface MessageInputProps {
  onSendMessage: (content: string, fileKey?: string) => Promise<void>;
  onTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
  conversationId?: string;
}

export function MessageInput({
  onSendMessage,
  onTyping,
  onStopTyping,
  disabled,
  placeholder = "Type a message...",
  conversationId,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const {
    uploadState,
    startUpload,
    cancelUpload,
    getUploadResult,
    waitForUpload,
    reset: resetUpload,
  } = useMediaUpload();

  /**
   * Autofocus input when conversation changes
   */
  useEffect(() => {
    if (conversationId && textareaRef.current && !disabled) {
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [conversationId, disabled]);

  /**
   * Cleanup on conversation change
   */
  useEffect(() => {
    return () => {
      resetUpload();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]); // Only reset when conversation changes, not when resetUpload function changes

  /**
   * Handle send with WhatsApp-style upload flow
   * - If upload complete: send immediately
   * - If upload in progress: wait for completion then send
   * - If upload failed: block and show error
   */
  const handleSend = async () => {
    if (!message.trim() && !uploadState) return;
    if (disabled || isSending) return;

    try {
      setIsSending(true);
      onStopTyping?.();

      let fileKey: string | undefined;

      // Handle media upload state
      if (uploadState) {
        const { uploadStatus } = uploadState;

        if (uploadStatus === "FAILED") {
          toast.error("Upload failed. Please try again.");
          return;
        }

        if (uploadStatus === "CANCELED") {
          toast.error("Upload was canceled");
          return;
        }

        // If upload complete, get fileKey
        if (uploadStatus === "UPLOADED") {
          const result = getUploadResult();
          fileKey = result?.fileKey;
        }
        // If still uploading, wait for completion
        else if (
          uploadStatus === "UPLOADING" ||
          uploadStatus === "PREVIEW_READY"
        ) {
          toast.info("Waiting for upload to complete...", { duration: 2000 });
          const result = await waitForUpload();
          fileKey = result.fileKey;
        }
      }

      // Send message with optional fileKey
      await onSendMessage(message.trim(), fileKey);

      // Clear state after successful send
      setMessage("");
      resetUpload();

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    if (onTyping && e.target.value.trim()) {
      onTyping();
    }
  };

  const handleBlur = () => {
    // Stop typing when user leaves the input
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onStopTyping?.();
  };

  const handleEmojiClick = (emojiData: { emoji: string }) => {
    const emoji = emojiData.emoji;
    setMessage((prev) => prev + emoji);

    // Trigger typing event
    if (onTyping) {
      onTyping();
    }

    // Focus back on textarea
    textareaRef.current?.focus();
  };

  /**
   * Handle file selection - starts upload immediately
   */
  const handleFileSelect = async (file: File) => {
    try {
      await startUpload(file);
      toast.success("Upload started", { duration: 2000 });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      toast.error(errorMessage);
    }
  };

  /**
   * Handle remove/cancel upload
   */
  const handleRemoveFile = async () => {
    await cancelUpload();
    toast.info("Upload canceled", { duration: 2000 });
  };

  const isUploadInProgress = uploadState?.uploadStatus === "UPLOADING";
  const hasContent = message.trim().length > 0 || uploadState !== null;

  return (
    <div className="bg-card border-t border-border px-4 py-3">
      {/* Media Preview (shown above input) */}
      {uploadState && (
        <MediaPreview
          uploadState={uploadState}
          onRemove={handleRemoveFile}
        />
      )}

      <div className="flex items-end gap-2">
        {/* File Upload Dropdown */}
        <FileUploadDropdown
          onFileSelect={handleFileSelect}
          disabled={disabled || isSending || isUploadInProgress}
        />

        <Popover
          open={showEmojiPicker}
          onOpenChange={setShowEmojiPicker}
        >
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={disabled || isSending}
              type="button"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-full p-0 border-none shadow-lg"
            align="start"
            side="top"
          >
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              autoFocusSearch={false}
              theme={Theme.AUTO}
              lazyLoadEmojis={true}
              height={400}
              width="100%"
              searchPlaceHolder="Search emoji..."
              previewConfig={{
                showPreview: false,
              }}
            />
          </PopoverContent>
        </Popover>

        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled || isSending}
          rows={1}
          className="flex-1 resize-none min-h-10 max-h-30"
        />

        <Button
          onClick={handleSend}
          disabled={!hasContent || disabled || isSending}
          size="icon"
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}

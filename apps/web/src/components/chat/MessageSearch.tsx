import { useState, useCallback, useEffect, useMemo } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLazySearchMessagesQuery } from "@/store/api/messagesApi";
import type { MessageSearchResult } from "@repo/api-core";
import { cn } from "@/lib/utils";

interface MessageSearchProps {
  conversationId: string;
  onResultClick: (messageId: string, query: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function MessageSearch({
  conversationId,
  onResultClick,
  isOpen,
  onClose,
}: MessageSearchProps) {
  const [query, setQuery] = useState("");
  const [searchTrigger, { data: results, isLoading, isFetching }] =
    useLazySearchMessagesQuery();

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      return;
    }

    const timeoutId = setTimeout(() => {
      searchTrigger({ conversationId, query: query.trim(), limit: 20 });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, conversationId, searchTrigger]);

  const handleResultClick = useCallback(
    (messageId: string) => {
      onResultClick(messageId, query.trim());
      // Keep search open - user can navigate through results
    },
    [onResultClick, query],
  );

  const handleClose = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="flex-shrink-0 w-full h-full bg-background border-l shadow-lg">
      <Card className="h-full border-0 shadow-none rounded-none">
        <CardHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">Search Messages</CardTitle>
              <CardDescription className="text-xs truncate">
                Search in this conversation
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 shrink-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close search</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-3 h-[calc(100%-4.5rem)]">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10 h-9"
              autoFocus
            />
            {(isLoading || isFetching) && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          <ScrollArea className="h-[calc(100%-3rem)]">
            {!query.trim() || query.length < 2 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-xs px-4 text-center">
                <Search className="h-8 w-8 mb-2 opacity-50" />
                <p>Type at least 2 characters to search</p>
              </div>
            ) : results && results.length > 0 ? (
              <div className="space-y-1">
                {results.map((result: MessageSearchResult) => (
                  <SearchResultItem
                    key={result.messageId}
                    result={result}
                    onClick={() => handleResultClick(result.messageId)}
                    searchQuery={query}
                  />
                ))}
              </div>
            ) : !isLoading && !isFetching ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-xs px-4 text-center">
                <p>No messages found for "{query}"</p>
              </div>
            ) : null}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

interface SearchResultItemProps {
  result: MessageSearchResult;
  onClick: () => void;
  searchQuery: string;
}

function SearchResultItem({
  result,
  onClick,
  searchQuery,
}: SearchResultItemProps) {
  // Highlight search query in snippet
  const highlightedSnippet = useMemo(() => {
    const regex = new RegExp(`(${searchQuery})`, "gi");
    const parts = result.snippet.split(regex);

    return parts.map((part: string, index: number) =>
      regex.test(part) ? (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-900"
        >
          {part}
        </mark>
      ) : (
        part
      ),
    );
  }, [result.snippet, searchQuery]);

  const formattedDate = useMemo(() => {
    const date = new Date(result.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }, [result.createdAt]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-2 rounded-md transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus:outline-none focus:ring-1 focus:ring-ring",
      )}
    >
      <div className="space-y-1">
        <p className="text-xs line-clamp-3 leading-relaxed">
          {highlightedSnippet}
        </p>
        <span className="text-[10px] text-muted-foreground">
          {formattedDate}
        </span>
      </div>
    </button>
  );
}

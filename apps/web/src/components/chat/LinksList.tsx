import { useCallback, useRef, useEffect, useState } from 'react';
import { useGetConversationMediaQuery } from '@/store/api/mediaApi';
import { Loader2, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface LinksListProps {
  conversationId: string;
}

/**
 * List layout for links (text messages containing URLs)
 * Supports infinite scroll pagination
 */
export function LinksList({ conversationId }: LinksListProps) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allItems, setAllItems] = useState<any[]>([]);
  const observerTarget = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching } = useGetConversationMediaQuery({
    conversationId,
    type: 'link',
    cursor,
    limit: 20,
  });

  // Accumulate items
  useEffect(() => {
    if (data?.items) {
      setAllItems((prev) => {
        const existing = new Set(prev.map((item) => item.messageId));
        const newItems = data.items.filter((item) => !existing.has(item.messageId));
        return [...prev, ...newItems];
      });
    }
  }, [data?.items]);

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && data?.nextCursor && !isFetching) {
        setCursor(data.nextCursor);
      }
    },
    [data?.nextCursor, isFetching]
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 1.0,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  // Extract URLs from content
  const extractUrls = (content: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    return content.match(urlRegex) || [];
  };

  if (isLoading && allItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <LinkIcon className="h-12 w-12 mb-2" />
        <p>No links found</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-3">
        {allItems.map((item) => {
          const urls = extractUrls(item.content || '');
          const date = format(new Date(item.createdAt), 'MMM d, yyyy');
          const preview = item.content?.substring(0, 100) || '';

          return (
            <div
              key={item.messageId}
              className="p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <LinkIcon className="h-5 w-5 text-blue-500" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">{date}</p>
                  <p className="text-sm mb-2 line-clamp-2">{preview}</p>
                  
                  <div className="space-y-1">
                    {urls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-500 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="truncate">{url}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={observerTarget} className="h-4 mt-4" />

      {isFetching && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

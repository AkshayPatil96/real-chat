import { useCallback, useRef, useEffect, useState } from 'react';
import { useGetConversationMediaQuery } from '@/store/api/mediaApi';
import { getPublicUrl, getFileName } from '@/lib/mediaUtils';
import { Loader2, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';

interface DocumentsListProps {
  conversationId: string;
}

/**
 * List layout for document files (PDF, DOC, XLS, etc.)
 * Supports infinite scroll pagination
 */
export function DocumentsList({ conversationId }: DocumentsListProps) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allItems, setAllItems] = useState<any[]>([]);
  const observerTarget = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching } = useGetConversationMediaQuery({
    conversationId,
    type: 'file',
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
        <FileText className="h-12 w-12 mb-2" />
        <p>No documents found</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-2">
        {allItems.map((item) => {
          const url = getPublicUrl(item.fileKey);
          const fileName = getFileName(item.fileKey || '');
          const date = format(new Date(item.createdAt), 'MMM d, yyyy');

          return (
            <div
              key={item.messageId}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer"
              onClick={() => url && window.open(url, '_blank')}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{fileName}</p>
                <p className="text-sm text-muted-foreground">{date}</p>
              </div>

              <Download className="h-5 w-5 text-muted-foreground flex-shrink-0" />
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

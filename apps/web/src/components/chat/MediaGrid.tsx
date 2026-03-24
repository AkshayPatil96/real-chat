import { useCallback, useRef, useEffect, useState } from 'react';
import { useGetConversationMediaQuery, type MediaItem } from '@/store/api/mediaApi';
import { getPublicUrl } from '@/lib/mediaUtils';
import { Loader2, Image as ImageIcon } from 'lucide-react';

interface MediaGridProps {
  conversationId: string;
  onImageClick?: (messageId: string) => void;
}

/**
 * Grid layout for images and videos
 * Supports infinite scroll pagination
 */
export function MediaGrid({ conversationId, onImageClick }: MediaGridProps) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const allItemsRef = useRef<MediaItem[]>([]);
  const [, forceUpdate] = useState({});
  const observerTarget = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching } = useGetConversationMediaQuery({
    conversationId,
    type: 'all', // Get both images and videos
    cursor,
    limit: 20,
  });

  // Accumulate items in ref (no cascading renders)
  if (data?.items) {
    const existing = new Set(allItemsRef.current.map((item) => item.messageId));
    const newItems = data.items.filter((item) => !existing.has(item.messageId));
    if (newItems.length > 0) {
      allItemsRef.current = [...allItemsRef.current, ...newItems];
    }
  }

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && data?.nextCursor && !isFetching) {
        setCursor(data.nextCursor);
      }
    },
    [data, isFetching]
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

  const allItems = allItemsRef.current;

  if (isLoading && allItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filter to only media types (image/video)
  const mediaItems = allItems.filter(
    (item) => item.type === 'image' || item.type === 'video'
  );

  if (mediaItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-2" />
        <p>No media found</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {mediaItems.map((item) => {
          const url = getPublicUrl(item.fileKey);
          
          return (
            <div
              key={item.messageId}
              className="aspect-square relative cursor-pointer group overflow-hidden rounded-md bg-muted"
              onClick={() => onImageClick?.(item.messageId)}
            >
              {item.type === 'image' && url && (
                <img
                  src={url}
                  alt="Media"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              )}
              {item.type === 'video' && url && (
                <div className="relative w-full h-full">
                  <video
                    src={url}
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                      <div className="w-0 h-0 border-l-12 border-l-black border-y-8 border-y-transparent ml-1" />
                    </div>
                  </div>
                </div>
              )}
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

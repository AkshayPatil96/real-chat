import { useEffect, useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useLazyGetConversationMediaQuery, type MediaItem } from '@/store/api/mediaApi';
import { getPublicUrl } from '@/lib/mediaUtils';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useEmblaCarousel from 'embla-carousel-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  initialMessageId: string;
}

/**
 * Fullscreen image viewer with swipe navigation
 * Uses Embla Carousel for smooth swipe experience
 * Fetches media independently from chat pagination
 * 
 * Features:
 * - Swipe left/right to navigate
 * - Infinite scroll loading
 * - Keyboard navigation (arrow keys, escape)
 * - Mobile-friendly
 */
export function ImageViewerModal({
  isOpen,
  onClose,
  conversationId,
  initialMessageId,
}: ImageViewerModalProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    skipSnaps: false,
    dragFree: false,
  });

  const [images, setImages] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const initialLoadRef = useRef(false);
  const hasFoundInitial = useRef(false);

  const [fetchMedia, { data, isLoading, isFetching }] = useLazyGetConversationMediaQuery();

  // Reset state when modal opens with new initialMessageId
  useEffect(() => {
    if (isOpen) {
      setImages([]);
      setCurrentIndex(0);
      setCursor(undefined);
      setHasMore(true);
      initialLoadRef.current = false;
      hasFoundInitial.current = false;
    }
  }, [isOpen, initialMessageId]);

  // Initial load: Fetch first batch and find initialMessageId
  useEffect(() => {
    if (isOpen && !initialLoadRef.current) {
      initialLoadRef.current = true;
      fetchMedia({
        conversationId,
        type: 'image',
        limit: 20,
      });
    }
  }, [isOpen, conversationId, fetchMedia]);

  // Process fetched data
  useEffect(() => {
    if (data?.items) {
      const imageItems = data.items.filter((item) => item.type === 'image');
      
      setImages(prevImages => {
        const existing = new Set(prevImages.map((item) => item.messageId));
        const newItems = imageItems.filter((item) => !existing.has(item.messageId));
        
        if (newItems.length > 0) {
          const updatedImages = [...prevImages, ...newItems];
          
          // Find initial image index on first load
          if (!hasFoundInitial.current && !cursor) {
            const index = updatedImages.findIndex((item) => item.messageId === initialMessageId);
            if (index !== -1) {
              hasFoundInitial.current = true;
              setCurrentIndex(index);
              // Wait for Embla to initialize, then scroll to index
              setTimeout(() => {
                emblaApi?.scrollTo(index, true);
              }, 100);
            }
          }
          
          return updatedImages;
        }
        
        return prevImages;
      });
      
      if (data.nextCursor && data.nextCursor !== cursor) {
        setCursor(data.nextCursor);
        setHasMore(true);
      } else if (!data.nextCursor) {
        setHasMore(false);
      }
    }
  }, [data, cursor, initialMessageId, emblaApi]);

  // Update current index on slide change
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap();
      setCurrentIndex(index);

      // Load more when approaching the end
      if (index >= images.length - 3 && hasMore && !isFetching) {
        fetchMedia({
          conversationId,
          type: 'image',
          cursor,
          limit: 20,
        });
      }
    };

    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, hasMore, isFetching, conversationId, cursor, fetchMedia]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        emblaApi?.scrollPrev();
      } else if (e.key === 'ArrowRight') {
        emblaApi?.scrollNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, emblaApi, onClose]);

  // Navigation handlers
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Reset state on close
  const handleClose = () => {
    setImages([]);
    setCurrentIndex(0);
    setCursor(undefined);
    setHasMore(true);
    initialLoadRef.current = false;
    hasFoundInitial.current = false;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="!max-w-none !w-screen !h-screen !p-0 !bg-black/95 !border-0 !rounded-none !top-0 !left-0 !translate-x-0 !translate-y-0 !m-0"
        showCloseButton={false}
      >
        <VisuallyHidden>
          <DialogTitle>Image Viewer</DialogTitle>
          <DialogDescription>
            Viewing image {currentIndex + 1} of {images.length}. Use arrow keys or swipe to navigate.
          </DialogDescription>
        </VisuallyHidden>
        {/* Close button */}
        {/* <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
          onClick={handleClose}
        >
          <X className="h-6 w-6" />
        </Button> */}

        {/* Image counter */}
        <div className="absolute top-4 left-4 z-50 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Loading indicator */}
        {isLoading && images.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
          </div>
        )}

        {/* Embla Carousel */}
        {images.length > 0 && (
          <div className="relative h-full">
            {/* Previous button */}
            {currentIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
                onClick={scrollPrev}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}

            {/* Next button */}
            {currentIndex < images.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
                onClick={scrollNext}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}

            {/* Carousel viewport */}
            <div className="overflow-hidden h-full" ref={emblaRef}>
              <div className="flex h-full">
                {images.map((item) => {
                  const url = getPublicUrl(item.fileKey);
                  
                  return (
                    <div
                      key={item.messageId}
                      className="flex-[0_0_100%] min-w-0 flex items-center justify-center"
                    >
                      {url && (
                        <img
                          src={url}
                          alt="Full size"
                          className="max-w-full max-h-full object-contain"
                          loading="lazy"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Loading more indicator */}
            {isFetching && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading more...</span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

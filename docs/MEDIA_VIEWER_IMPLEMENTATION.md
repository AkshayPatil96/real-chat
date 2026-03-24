# WhatsApp-Style Media Viewer Implementation

## Overview

This implementation adds WhatsApp-style media browsing capabilities to Real-Chat, including:
- Separate media/docs/links tabs with independent pagination
- Fullscreen image viewer with swipe navigation
- Production-ready architecture that scales independently from chat messages

## Architecture Principles

### Key Decisions

1. **Independent Data Source**: Media viewer uses a separate API endpoint (`GET /conversations/:id/media`) instead of reusing chat message pagination
2. **Store Keys, Not URLs**: Database stores only `fileKey`, URLs are generated on-demand via CloudFront
3. **Separation of Concerns**: Media data is fetched and managed independently from chat messages
4. **Mobile-First**: Uses Embla Carousel for native-like swipe behavior

### Why Not Reuse Chat Pagination?

- Chat pagination is optimized for chronological message loading (newest → oldest)
- Media viewer needs to access images outside the current chat window
- Prevents tight coupling between UI components
- Better performance: only fetches media metadata, not full message bodies

## Backend Implementation

### 1. Database Changes

**New MongoDB Index** (in `message.model.ts`):
```typescript
MessageSchema.index({ conversationId: 1, type: 1, createdAt: -1 });
```

This index optimizes media queries by conversation and type.

### 2. New API Endpoint

**Route**: `GET /api/v1/conversations/:conversationId/media`

**Query Parameters**:
- `type`: `'image' | 'video' | 'file' | 'link' | 'all'`
- `cursor`: Base64-encoded pagination cursor (optional)
- `limit`: Number of items (default: 20, max: 100)

**Response**:
```json
{
  "data": {
    "items": [
      {
        "messageId": "65f...",
        "type": "image",
        "fileKey": "attachments/image123.jpg",
        "createdAt": "2026-02-02T...",
        "senderId": "65e..."
      }
    ],
    "nextCursor": "eyJj..." | null
  }
}
```

**Security**:
- Returns only `fileKey`, never direct S3 URLs
- Minimal data (no full message bodies, no `readBy`, etc.)
- Authorization: User must be a conversation participant

### 3. Implementation Files

#### Backend Files
- `apps/backend/src/modules/messages/message.interface.ts` - Added `MediaFilterType`, `MediaItem`, `MediaListResult` types
- `apps/backend/src/modules/messages/message.repository.ts` - Added `findMediaByConversation()` method
- `apps/backend/src/modules/messages/message.service.ts` - Added `getMediaByConversation()` method
- `apps/backend/src/modules/conversations/conversation.controller.ts` - Added `getConversationMedia()` handler
- `apps/backend/src/modules/conversations/conversation.routes.ts` - Added `GET /:id/media` route
- `apps/backend/src/modules/messages/message.model.ts` - Added media index

## Frontend Implementation

### 1. RTK Query API

**File**: `apps/web/src/store/api/mediaApi.ts`

```typescript
const { data, isLoading } = useGetConversationMediaQuery({
  conversationId: 'conv-id',
  type: 'image',
  cursor: undefined,
  limit: 20,
});
```

**Cache Strategy**:
- Tagged by `conversationId` and `type` for granular invalidation
- 60-second cache lifetime (configurable in `api.ts`)

### 2. Media Panel Component

**File**: `apps/web/src/components/chat/ConversationMediaPanel.tsx`

Tabbed interface with three views:
- **Media Tab**: Grid of images/videos (`MediaGrid.tsx`)
- **Docs Tab**: List of files (`DocumentsList.tsx`)
- **Links Tab**: List of text messages with URLs (`LinksList.tsx`)

Each tab:
- Uses same backend endpoint with different `type` parameter
- Has independent infinite scroll
- Manages its own pagination cursor

### 3. Image Viewer Modal

**File**: `apps/web/src/components/chat/ImageViewerModal.tsx`

**Features**:
- Fullscreen viewing with Embla Carousel
- Swipe left/right navigation
- Keyboard shortcuts (Arrow keys, Escape)
- Lazy loading as user swipes
- Pagination triggered when approaching the end

**How It Works**:
1. Receives `conversationId` and `initialMessageId`
2. Fetches first batch of images via media API
3. Finds `initialMessageId` in results and sets as start index
4. Loads more images as user swipes (trigger at `currentIndex >= length - 3`)
5. Independent from chat message list

**Dependencies**:
- `embla-carousel-react@8.6.0` (installed)

### 4. Utility Functions

**File**: `apps/web/src/lib/mediaUtils.ts`

- `getPublicUrl(fileKey)` - Converts fileKey → CloudFront URL
- `getFileName(fileKey)` - Extracts filename from key
- `isImageFile(fileKey)` - Checks if file is an image
- `isVideoFile(fileKey)` - Checks if file is a video
- `getFileIcon(fileKey)` - Returns appropriate icon name

**Environment Variable**:
```env
VITE_CLOUDFRONT_URL=https://dgybp60vsropa.cloudfront.net
```

### 5. Integration with Chat

**Modified Files**:
- `apps/web/src/components/chat/MessageBubble.tsx`
  - Added `onImageClick` prop
  - Uses `getPublicUrl()` for image URLs
  - Makes images clickable with hover effect

- `apps/web/src/components/chat/MessageList.tsx`
  - Added `onImageClick` prop
  - Passes handler to `MessageBubble`

**Usage Example**:
```tsx
const [viewerOpen, setViewerOpen] = useState(false);
const [selectedMessageId, setSelectedMessageId] = useState<string>('');

<MessageList
  messages={messages}
  currentUserId={userId}
  onImageClick={(messageId) => {
    setSelectedMessageId(messageId);
    setViewerOpen(true);
  }}
/>

<ImageViewerModal
  isOpen={viewerOpen}
  onClose={() => setViewerOpen(false)}
  conversationId={conversationId}
  initialMessageId={selectedMessageId}
/>
```

## Testing

### Backend Tests

**File**: `apps/backend/src/modules/conversations/__tests__/conversation-media.test.ts`

**Coverage**:
- ✅ Filter by type (image, video, file, link, all)
- ✅ Cursor-based pagination
- ✅ No duplicates across pages
- ✅ Response format (only returns minimal data)
- ✅ Authorization (401 without token, 403 for non-participants)
- ✅ Edge cases (empty results, invalid type, non-existent conversation)

**Run Tests**:
```bash
cd apps/backend
pnpm test conversation-media.test.ts
```

### Frontend Tests

**File**: `apps/web/src/components/chat/__tests__/MediaGrid.test.tsx`

**Coverage**:
- ✅ Loading state
- ✅ Empty state (no media found)
- ✅ Renders media grid
- ✅ Click handler integration
- ✅ Filters media types correctly

**Run Tests**:
```bash
cd apps/web
pnpm test MediaGrid.test.tsx
```

## Performance Considerations

### Database
- Compound index on `{ conversationId, type, createdAt }` ensures O(log n) queries
- No full table scans
- Lean queries (`.lean()`) for better memory usage

### Frontend
- Infinite scroll prevents loading all media at once
- `IntersectionObserver` for scroll detection (no scroll event listeners)
- Lazy image loading (`loading="lazy"`)
- Embla carousel virtualizes slides (only renders visible + adjacent)

### Network
- CloudFront CDN caching reduces S3 requests
- RTK Query caches responses for 60 seconds
- Cursor pagination prevents over-fetching

## Deployment Checklist

Before deploying to production:

1. **Environment Variables**:
   ```env
   # Backend
   AWS_CLOUDFRONT_URL=https://your-cloudfront-domain.cloudfront.net
   
   # Frontend
   VITE_CLOUDFRONT_URL=https://your-cloudfront-domain.cloudfront.net
   ```

2. **Database**:
   - Ensure MongoDB index is created:
     ```bash
     db.messages.createIndex({ conversationId: 1, type: 1, createdAt: -1 })
     ```

3. **CloudFront**:
   - Verify CloudFront distribution is configured with OAI (Origin Access Identity)
   - S3 bucket should remain private
   - Test media access via CloudFront URLs

4. **API Documentation**:
   - Swagger docs automatically include new `/media` endpoint
   - Access at: `http://localhost:8001/api-docs`

## Usage Guide

### Opening Media Panel

```tsx
import { ConversationMediaPanel } from '@/components/chat/ConversationMediaPanel';

function ChatView() {
  return (
    <div className="flex">
      <div className="flex-1">
        {/* Chat messages */}
      </div>
      
      <div className="w-80 border-l">
        <ConversationMediaPanel
          conversationId={conversationId}
          onImageClick={(messageId) => {
            // Open image viewer
          }}
        />
      </div>
    </div>
  );
}
```

### Opening Image Viewer from Chat

```tsx
import { ImageViewerModal } from '@/components/chat/ImageViewerModal';

<MessageList
  messages={messages}
  currentUserId={userId}
  onImageClick={handleImageClick}
/>

<ImageViewerModal
  isOpen={viewerOpen}
  onClose={() => setViewerOpen(false)}
  conversationId={conversationId}
  initialMessageId={selectedMessageId}
/>
```

## Future Enhancements

### Not Implemented (Per Requirements)
- ❌ Pinch-to-zoom
- ❌ Media downloads
- ❌ Signed CloudFront URLs
- ❌ Video streaming optimizations
- ❌ Media reactions

### Potential Improvements
1. **Signed CloudFront URLs**: For additional security in production
2. **Image Thumbnails**: Store/generate thumbnails for faster grid loading
3. **Video Previews**: Generate video thumbnails on upload
4. **Batch Operations**: Delete/download multiple files
5. **Search**: Search within media captions
6. **Filters**: Filter by date range, sender

## Troubleshooting

### Images Not Loading

**Issue**: Images show broken in MediaGrid or ImageViewer

**Solution**:
1. Check CloudFront URL environment variable:
   ```bash
   echo $VITE_CLOUDFRONT_URL  # Frontend
   echo $AWS_CLOUDFRONT_URL   # Backend
   ```
2. Verify fileKey format in database (should be `attachments/...`, not full URL)
3. Test CloudFront URL directly in browser

### Pagination Not Working

**Issue**: Infinite scroll doesn't load more items

**Solution**:
1. Check browser console for API errors
2. Verify `nextCursor` is returned in API response
3. Check `IntersectionObserver` browser support (all modern browsers)
4. Ensure observer target element is rendered (`observerTarget` ref)

### Viewer Opens to Wrong Image

**Issue**: ImageViewer starts at wrong slide

**Solution**:
1. Ensure `initialMessageId` is correct
2. Check that message exists in first batch of results
3. Verify Embla `scrollTo()` is called after initialization (100ms delay)

## API Examples

### Fetch Images
```bash
curl -X GET \
  'http://localhost:8001/api/v1/conversations/65f.../media?type=image&limit=20' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Fetch Next Page
```bash
curl -X GET \
  'http://localhost:8001/api/v1/conversations/65f.../media?type=image&limit=20&cursor=eyJj...' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Fetch All Media Types
```bash
curl -X GET \
  'http://localhost:8001/api/v1/conversations/65f.../media?type=all&limit=20' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

## File Structure

```
apps/
├── backend/
│   └── src/
│       └── modules/
│           ├── conversations/
│           │   ├── conversation.controller.ts     # Added getConversationMedia()
│           │   ├── conversation.routes.ts         # Added GET /:id/media
│           │   └── __tests__/
│           │       └── conversation-media.test.ts # NEW: Integration tests
│           └── messages/
│               ├── message.interface.ts           # Added media types
│               ├── message.repository.ts          # Added findMediaByConversation()
│               ├── message.service.ts             # Added getMediaByConversation()
│               └── message.model.ts               # Added media index
│
└── web/
    └── src/
        ├── components/
        │   └── chat/
        │       ├── ConversationMediaPanel.tsx     # NEW: Main panel
        │       ├── MediaGrid.tsx                  # NEW: Image/video grid
        │       ├── DocumentsList.tsx              # NEW: Files list
        │       ├── LinksList.tsx                  # NEW: Links list
        │       ├── ImageViewerModal.tsx           # NEW: Fullscreen viewer
        │       ├── MessageBubble.tsx              # Modified: Added onImageClick
        │       ├── MessageList.tsx                # Modified: Pass onImageClick
        │       └── __tests__/
        │           └── MediaGrid.test.tsx         # NEW: Frontend tests
        ├── lib/
        │   └── mediaUtils.ts                      # NEW: URL utilities
        └── store/
            └── api/
                ├── mediaApi.ts                    # NEW: RTK Query API
                ├── api.ts                         # Modified: Added 'Media' tag
                └── index.ts                       # Modified: Export mediaApi
```

## Summary

This implementation provides a production-ready, scalable media viewing experience that:
- ✅ Uses separate, optimized API endpoint for media
- ✅ Stores only fileKeys in database (architecture-agnostic)
- ✅ Generates CloudFront URLs on-demand
- ✅ Supports independent pagination from chat
- ✅ Provides smooth mobile-friendly swipe navigation
- ✅ Includes comprehensive tests
- ✅ Follows security best practices (no direct S3 URLs)
- ✅ Scales to large conversation histories

The architecture ensures that the media viewer can access any image in the conversation's history, regardless of chat pagination state, while maintaining excellent performance and security.

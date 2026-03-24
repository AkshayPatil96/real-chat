# @repo/api-core

**Platform-agnostic HTTP API client for RealChat**

## Purpose

`api-core` is a shared, zero-dependency API package that defines:
- HTTP client with auth token injection
- Type-safe endpoint definitions
- Request/response types
- Normalized error handling

It is consumed by:
- `apps/web` (Next.js + RTK Query)
- `apps/mobile` (Expo + RTK Query)

## Why Redux/React-Free?

This package is **pure TypeScript** with no framework dependencies:
- ✅ Works in Node.js, Web, and React Native
- ✅ Can be wrapped by any data-fetching library (RTK Query, React Query, SWR)
- ✅ Enables code reuse across platforms
- ✅ Simplifies testing (no mocking React/Redux)

## Installation

```bash
# In web or mobile app
pnpm add @repo/api-core
```

## Usage

### Basic Setup

```typescript
import { createApiClient } from '@repo/api-core';

const api = createApiClient({
  baseUrl: 'http://localhost:3001',
  getAuthToken: async () => {
    // Return Clerk JWT token
    return await clerk.session?.getToken();
  },
  timeout: 30000, // optional, default 30s
});

// Use endpoints
const user = await api.users.getCurrentUser();
const conversations = await api.conversations.listConversations({ page: 1, limit: 20 });
const messages = await api.messages.getMessages('conversationId');
```

### Auth Token Injection

The `getAuthToken` callback is invoked before each request. This allows:
- Platform-specific token retrieval (Clerk on web, AsyncStorage on mobile)
- Automatic token refresh
- Dynamic auth without hardcoded values

**Web Example (Clerk):**
```typescript
import { useAuth } from '@clerk/nextjs';

const { getToken } = useAuth();

const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  getAuthToken: () => getToken(),
});
```

**Mobile Example:**
```typescript
import { useAuth } from '@clerk/clerk-expo';

const { getToken } = useAuth();

const api = createApiClient({
  baseUrl: Config.API_URL,
  getAuthToken: () => getToken(),
});
```

### Error Handling

All errors are normalized to `ApiError`:

```typescript
import { ApiError, isApiError } from '@repo/api-core';

try {
  await api.users.getCurrentUser();
} catch (error) {
  if (isApiError(error)) {
    console.error(`API Error ${error.statusCode}: ${error.message}`);
    // error.code - optional error code
    // error.details - optional error details
  }
}
```

### Using with RTK Query

Wrap endpoints with RTK Query for caching, optimistic updates, and React integration:

```typescript
import { createApi } from '@reduxjs/toolkit/query/react';
import { createApiClient } from '@repo/api-core';

const apiClient = createApiClient({ /* config */ });

export const api = createApi({
  reducerPath: 'api',
  baseQuery: async (args) => {
    try {
      const result = await args();
      return { data: result };
    } catch (error) {
      return { error };
    }
  },
  endpoints: (builder) => ({
    getCurrentUser: builder.query({
      query: () => apiClient.users.getCurrentUser,
    }),
    // ... more endpoints
  }),
});
```

## Architecture

### HTTP Client

- **Fetch-based**: Uses native `fetch` API (works in Node 18+, Web, React Native)
- **Timeout support**: Uses `AbortController` for request cancellation
- **Automatic auth**: Injects `Authorization: Bearer <token>` header
- **Error normalization**: Converts all errors to `ApiError` with consistent shape

### Endpoint Organization

Endpoints are grouped by domain:
- `users`: User profile, blocking, account management
- `conversations`: List, create, get, delete conversations
- `messages`: Send, receive, mark as read, delete messages

Each endpoint:
- Is a pure function accepting the HTTP client
- Matches backend API contracts exactly
- Returns typed responses
- Can be easily wrapped by RTK Query or React Query

### Type Safety

All types are derived from backend contracts:
- Request types (e.g., `SendMessageRequest`)
- Response types (e.g., `ListMessagesResponse`)
- Domain models (e.g., `User`, `Conversation`, `Message`)

## Scalability

This architecture supports:
- **Multi-platform**: Web, mobile, and future platforms
- **Multi-framework**: Can integrate with any data-fetching library
- **Independent testing**: No React/Redux required for unit tests
- **API versioning**: Easy to add `/v2` endpoints without breaking changes
- **Feature flags**: Can conditionally enable endpoints based on environment

## API Contracts

Endpoints match the backend contracts exactly:
- [REST API Contracts](../../backend/docs/api-contracts.md)
- [Socket.IO Events](../../backend/docs/socket-events.md)

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Clean
pnpm clean
```

## Contributing

When adding new endpoints:
1. Define types in `src/types/`
2. Create endpoint functions in `src/endpoints/`
3. Export from `src/index.ts`
4. Update this README with usage examples

---

**Maintained by:** Platform Engineering Team  
**Last Updated:** January 17, 2026

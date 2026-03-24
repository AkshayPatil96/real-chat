# Backend Hardening & Cursor Pagination — TODO

## Priority 1 — Backend Essentials (Must-have)

### ✅ Task 1: Cursor-based Pagination for Messages & Conversations

**What to change:**
- Replace offset/skip-based pagination with cursor-based pagination
- Implement using `createdAt + _id` as stable cursor
- Use `limit + 1` strategy to determine `hasNextPage`
- Direction: newest → oldest (reverse chronological)
- Return opaque cursor to client (base64 encoded)

**Why it matters:**
- Skip-based pagination is inefficient for large datasets (O(n) skip cost)
- Cursor-based pagination is O(1) and prevents duplicates/gaps during realtime updates
- Essential for chat applications where messages are frequently added
- More scalable and performant for production workloads

**Files involved:**
- `src/modules/messages/message.service.ts` - Add cursor pagination logic
- `src/modules/messages/message.controller.ts` - Update endpoint to accept cursor params
- `src/modules/messages/message.routes.ts` - Update route definitions
- `src/modules/conversations/conversation.service.ts` - Add cursor pagination logic
- `src/modules/conversations/conversation.controller.ts` - Update endpoint to accept cursor params
- `src/modules/conversations/conversation.routes.ts` - Update route definitions
- `src/utils/pagination.ts` - Create reusable pagination utility (NEW FILE)
- `src/types/pagination.types.ts` - Create pagination type definitions (NEW FILE)

**Acceptance criteria:**
- ✅ Pagination utility created with cursor encode/decode functions
- ✅ Messages endpoint supports `?cursor=...&limit=...`
- ✅ Conversations endpoint supports `?cursor=...&limit=...`
- ✅ Indexes support pagination queries efficiently
- ✅ No duplicate or missing records during pagination
- ⬜ Tests verify pagination correctness (TODO: Add tests)

**Status:** ✅ Complete

---

### ⬜ Task 2: Zod Validation for All REST APIs

**What to change:**
- Install `zod` dependency
- Create validation schemas for all request DTOs
- Add validation middleware that uses Zod schemas
- Validate params, query strings, and request bodies
- Return 400 with clear error messages for invalid input

**Why it matters:**
- Runtime type safety prevents invalid data from entering the system
- Better error messages for clients (field-level validation)
- Prevents TypeScript-only type checking from being bypassed at runtime
- Industry standard for API validation in TypeScript projects
- Catches malformed input before it reaches business logic

**Files involved:**
- `package.json` - Add `zod` dependency
- `src/middlewares/validation.middleware.ts` - Create validation middleware (NEW FILE)
- `src/modules/messages/message.validation.ts` - Message validation schemas (NEW FILE)
- `src/modules/messages/message.controller.ts` - Apply validation
- `src/modules/conversations/conversation.validation.ts` - Conversation validation schemas (NEW FILE)
- `src/modules/conversations/conversation.controller.ts` - Apply validation
- `src/modules/users/user.validation.ts` - User validation schemas (NEW FILE)
- `src/modules/users/user.controller.ts` - Apply validation
- `src/modules/chat-requests/chat-request.validation.ts` - Chat request validation schemas (NEW FILE)
- `src/modules/chat-requests/chat-request.controller.ts` - Apply validation

**Acceptance criteria:**
- ✅ All endpoints validate input with Zod schemas
- ✅ Invalid requests return 400 with structured error messages
- ✅ Validation schemas are DRY and reusable
- ✅ Query params (cursor, limit, page) are validated
- ⬜ Tests verify validation behavior (TODO: Add validation tests)

**Status:** ✅ Complete

---

### ⬜ Task 3: MongoDB Transactions for Multi-Collection Writes

**What to change:**
- Wrap multi-collection operations in MongoDB transactions
- Use sessions for atomic operations
- Handle transaction rollback on errors
- Focus on critical paths:
  1. **Send message** → update conversation.lastMessage + conversation.updatedAt
  2. **Accept chat request** → create conversation + update request status
  3. **Delete conversation** → soft delete conversation + related messages

**Why it matters:**
- Prevents partial writes that leave data in inconsistent state
- Essential for data integrity (e.g., message exists but conversation not updated)
- Allows safe rollback on errors
- Required for production-grade applications
- MongoDB transactions are ACID-compliant

**Files involved:**
- `src/modules/messages/message.service.ts` - Add transaction for sendMessage
- `src/modules/conversations/conversation.service.ts` - Add transaction for delete
- `src/modules/chat-requests/chat-request.service.ts` - Add transaction for acceptRequest
- `src/config/database.ts` - Ensure replica set is configured (transaction requirement)
- `src/utils/transaction.helper.ts` - Create transaction utility wrapper (NEW FILE)

**Acceptance criteria:**
- ⬜ Send message + update conversation happens atomically
- ⬜ Accept request + create conversation happens atomically
- ⬜ Delete conversation + soft delete messages happens atomically
- ⬜ Failed transactions rollback completely
- ⬜ Tests verify transaction behavior (rollback on error)

**Status:** ⬜ Not Started

---

### ⬜ Task 4: Granular Rate Limiting

**What to change:**
- Install `express-rate-limit` if not present
- Create different rate limit tiers:
  - **Auth endpoints** (login, register): 5 requests / 15 minutes
  - **Message send**: 30 requests / minute
  - **General API**: 100 requests / 15 minutes
  - **Uploads**: 10 requests / hour
- Use Redis store for distributed rate limiting
- Return 429 with `Retry-After` header

**Why it matters:**
- Prevents abuse and DoS attacks
- Protects against spam in chat (message flooding)
- Different endpoints have different risk profiles
- Essential for production APIs exposed to public
- Prevents resource exhaustion

**Files involved:**
- `package.json` - Add `express-rate-limit` and `rate-limit-redis` dependencies
- `src/middlewares/rate-limit.middleware.ts` - Create rate limit configurations (NEW FILE)
- `src/modules/messages/message.routes.ts` - Apply message-specific rate limit
- `src/modules/users/user.routes.ts` - Apply auth rate limit
- `src/modules/uploads/upload.routes.ts` - Apply upload rate limit
- `src/app.ts` - Apply global rate limit

**Acceptance criteria:**
- ⬜ Different endpoints have appropriate rate limits
- ⬜ Rate limit state stored in Redis (shared across instances)
- ⬜ 429 responses include clear error messages
- ⬜ Tests verify rate limiting behavior

**Status:** ⬜ Not Started

---

### ⬜ Task 5: Request Size Limits & Input Sanitization

**What to change:**
- Configure `express.json()` and `express.urlencoded()` with size limits
- Add `helmet` for security headers
- Add `express-mongo-sanitize` to prevent NoSQL injection
- Add `xss-clean` to prevent XSS attacks
- Limit request body to 10MB (or 100MB for uploads)
- Sanitize user input in message content, usernames, etc.

**Why it matters:**
- Prevents memory exhaustion from large payloads
- Blocks NoSQL injection attacks ($where, $ne, etc.)
- Prevents XSS attacks via user-generated content
- Security best practice for any public API
- Protects against common OWASP vulnerabilities

**Files involved:**
- `package.json` - Add `helmet`, `express-mongo-sanitize`, `xss-clean`
- `src/app.ts` - Configure middleware with size limits
- `src/middlewares/sanitization.middleware.ts` - Custom sanitization logic (NEW FILE)
- `src/modules/messages/message.service.ts` - Sanitize message content

**Acceptance criteria:**
- ⬜ Request body size limited to prevent abuse
- ⬜ NoSQL injection attempts are blocked
- ⬜ XSS payloads are sanitized
- ⬜ Security headers applied via Helmet
- ⬜ Tests verify sanitization behavior

**Status:** ⬜ Not Started

---

### ⬜ Task 6: Backend Tests (Unit + Integration)

**What to change:**
- Add unit tests for new pagination utility
- Add unit tests for transaction behavior (with mocks)
- Add integration tests for cursor pagination endpoints
- Add integration tests for validation failures
- Add tests for rate limiting behavior
- Ensure existing tests still pass

**Why it matters:**
- Verifies correctness of cursor pagination logic
- Ensures transactions rollback properly on errors
- Catches regressions when adding new features
- Documents expected behavior for future developers
- Essential for confidence in production deployments

**Files involved:**
- `src/utils/__tests__/pagination.test.ts` - Pagination utility tests (NEW FILE)
- `src/modules/messages/__tests__/message.service.test.ts` - Add transaction tests
- `src/modules/messages/__tests__/message.integration.test.ts` - Integration tests (NEW FILE)
- `src/modules/conversations/__tests__/conversation.integration.test.ts` - Integration tests (NEW FILE)
- `src/middlewares/__tests__/validation.middleware.test.ts` - Validation tests (NEW FILE)
- `src/middlewares/__tests__/rate-limit.middleware.test.ts` - Rate limit tests (NEW FILE)

**Acceptance criteria:**
- ⬜ Pagination utility has unit tests (edge cases covered)
- ⬜ Integration tests verify cursor pagination works end-to-end
- ⬜ Transaction rollback behavior is tested
- ⬜ Validation middleware is tested
- ⬜ All tests pass consistently

**Status:** ⬜ Not Started

---

## Progress Summary

- **Total Tasks:** 6
- **Completed:** 2 (Cursor Pagination, Zod Validation)
- **In Progress:** 0
- **Not Started:** 4

---

## Non-Goals (DO NOT IMPLEMENT)

❌ Redis caching for messages or unread counts  
❌ Unread count redesign or optimization  
❌ Socket.IO pagination or streaming  
❌ Frontend scroll logic or infinite scroll  
❌ AI features or message processing  
❌ Media upload enhancements  
❌ Dependency injection containers  
❌ GraphQL or API redesigns  
❌ Authentication system changes  

---

## Notes

- Focus on correctness over coverage
- Keep changes minimal and testable
- Don't refactor working socket/presence logic
- MongoDB is source of truth (no Redis caching)
- All changes must pass TypeScript compilation
- Existing behavior must continue working

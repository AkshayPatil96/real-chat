# RealChat API Contracts

**Version:** v1  
**Base URL:** `http://localhost:3001` (Development) | `https://api.realchat.com` (Production)  
**Authentication:** Clerk JWT Bearer Token

---

## Table of Contents

1. [Authentication](#authentication)
2. [Error Responses](#error-responses)
3. [Users API](#users-api)
4. [Chat Requests API](#chat-requests-api)
5. [Conversations API](#conversations-api)
6. [Messages API](#messages-api)

---

## Authentication

All API endpoints require authentication via Clerk JWT token.

### Required Headers

```http
Authorization: Bearer <CLERK_JWT_TOKEN>
Content-Type: application/json
```

### How to Obtain Token

1. Authenticate user via Clerk on the frontend (Web/Mobile)
2. Retrieve the JWT session token from Clerk
3. Include it in the `Authorization` header for all API requests

### Authentication Errors

| Status Code | Description |
|-------------|-------------|
| `401` | Missing or invalid token |
| `403` | Token valid but insufficient permissions |

---

## Error Responses

All errors follow this consistent format:

```json
{
  "status": "error",
  "error": {
    "message": "Human-readable error message",
    "stack": "Stack trace (development only)"
  }
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Missing/invalid auth token |
| `403` | Forbidden - Valid token but no permission |
| `404` | Not Found - Resource doesn't exist |
| `500` | Internal Server Error |

---

## Users API

### GET /api/users/me

Get the authenticated user's profile.

**Authentication:** Required

**Request:**
```http
GET /api/users/me
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "clerkId": "user_2abc123def",
    "username": "johndoe",
    "email": "john@example.com",
    "avatar": "https://example.com/avatar.jpg",
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-16T14:20:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid/missing token

---

### POST /api/users/block/:targetUserId

Block another user. Blocked users cannot send messages or see your presence.

**Authentication:** Required

**Request:**
```http
POST /api/users/block/507f1f77bcf86cd799439012
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "message": "User blocked successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid user ID or attempting to block yourself
- `404 Not Found` - Target user doesn't exist

**Side Effects:**
- User is added to your blocked list
- Existing conversations remain but messages cannot be exchanged
- Presence updates are no longer shared

---

### DELETE /api/users/block/:targetUserId

Unblock a previously blocked user.

**Authentication:** Required

**Request:**
```http
DELETE /api/users/block/507f1f77bcf86cd799439012
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "message": "User unblocked successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid user ID
- `404 Not Found` - User not in blocked list

**Idempotency:** Safe to call multiple times; no error if user wasn't blocked

---

### DELETE /api/users/me

Soft delete the authenticated user's account.

**Authentication:** Required

**Request:**
```http
DELETE /api/users/me
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "message": "Account deleted successfully"
}
```

**Side Effects:**
- Account is soft-deleted (not permanently removed)
- User cannot login until account is restored
- All conversations and messages are preserved but inaccessible
- Presence status set to offline

**Notes:**
- This is NOT a permanent deletion
- Contact support to restore account or permanently delete data

---

## Chat Requests API

### POST /api/chat-requests

Send a chat request to another user by their email address.

**Authentication:** Required

**Request:**
```http
POST /api/chat-requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "receiverEmail": "jane@example.com"
}
```

**Request Body Schema:**
```json
{
  "receiverEmail": "string (required) - Valid email address"
}
```

**Success Response (201):**
```json
{
  "request": {
    "id": "507f1f77bcf86cd799439011",
    "senderId": "user_id_1",
    "receiverId": "user_id_2",
    "senderUsername": "johndoe",
    "senderAvatar": "https://example.com/avatar.jpg",
    "senderEmail": "john@example.com",
    "receiverUsername": "janedoe",
    "receiverAvatar": "https://example.com/jane.jpg",
    "receiverEmail": "jane@example.com",
    "status": "PENDING",
    "respondedAt": null,
    "createdAt": "2026-01-17T10:00:00.000Z",
    "updatedAt": "2026-01-17T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Cannot send request to yourself
- `403 Forbidden` - User is blocked or blocking you
- `404 Not Found` - User with that email doesn't exist
- `409 Conflict` - Request already exists or cooldown active

**Conflict Scenarios:**
```json
{
  "status": "error",
  "error": {
    "message": "Request already pending"
  }
}
```

```json
{
  "status": "error",
  "error": {
    "message": "Cannot resend request. Please wait 5 more day(s)"
  }
}
```

**Business Rules:**
- Cannot send request to yourself
- Blocked users cannot send/receive requests
- Only one active (PENDING/ACCEPTED) request allowed per pair
- After decline, 7-day cooldown before resending
- If receiver already sent you a request, returns conflict

---

### GET /api/chat-requests/incoming

List all incoming chat requests (requests received by authenticated user).

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `20` | Items per page (max: 100) |

**Request:**
```http
GET /api/chat-requests/incoming?page=1&limit=20
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "requests": [
    {
      "id": "507f1f77bcf86cd799439011",
      "senderId": "user_id_1",
      "receiverId": "user_id_2",
      "senderUsername": "johndoe",
      "senderAvatar": "https://example.com/avatar.jpg",
      "senderEmail": "john@example.com",
      "status": "PENDING",
      "respondedAt": null,
      "createdAt": "2026-01-17T10:00:00.000Z",
      "updatedAt": "2026-01-17T10:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20
}
```

**Field Descriptions:**
- `status`: Always `"PENDING"` for incoming requests list
- Sorted by `createdAt` (newest first)
- Only includes pending requests (accepted/declined requests don't appear)

**Pagination:**
- Returns empty array when no more requests
- Sender details populated for easy display

---

### GET /api/chat-requests/outgoing

List all outgoing chat requests (requests sent by authenticated user).

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `20` | Items per page (max: 100) |

**Request:**
```http
GET /api/chat-requests/outgoing?page=1&limit=20
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "requests": [
    {
      "id": "507f1f77bcf86cd799439011",
      "senderId": "user_id_1",
      "receiverId": "user_id_2",
      "receiverUsername": "janedoe",
      "receiverAvatar": "https://example.com/jane.jpg",
      "receiverEmail": "jane@example.com",
      "status": "PENDING",
      "respondedAt": null,
      "createdAt": "2026-01-17T10:00:00.000Z",
      "updatedAt": "2026-01-17T10:00:00.000Z"
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "senderId": "user_id_1",
      "receiverId": "user_id_3",
      "receiverUsername": "bobsmith",
      "receiverAvatar": "https://example.com/bob.jpg",
      "receiverEmail": "bob@example.com",
      "status": "ACCEPTED",
      "respondedAt": "2026-01-17T11:30:00.000Z",
      "createdAt": "2026-01-16T15:00:00.000Z",
      "updatedAt": "2026-01-17T11:30:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20
}
```

**Field Descriptions:**
- `status`: Can be `"PENDING"`, `"ACCEPTED"`, `"DECLINED"`, or `"BLOCKED"`
- Sorted by `createdAt` (newest first)
- Includes all statuses to show request history
- Receiver details populated

---

### POST /api/chat-requests/:requestId/accept

Accept a chat request. Creates a 1-to-1 conversation and allows messaging.

**Authentication:** Required

**Request:**
```http
POST /api/chat-requests/507f1f77bcf86cd799439011/accept
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "request": {
    "id": "507f1f77bcf86cd799439011",
    "senderId": "user_id_1",
    "receiverId": "user_id_2",
    "senderUsername": "johndoe",
    "senderAvatar": "https://example.com/avatar.jpg",
    "senderEmail": "john@example.com",
    "receiverUsername": "janedoe",
    "receiverAvatar": "https://example.com/jane.jpg",
    "receiverEmail": "jane@example.com",
    "status": "ACCEPTED",
    "respondedAt": "2026-01-17T12:00:00.000Z",
    "createdAt": "2026-01-17T10:00:00.000Z",
    "updatedAt": "2026-01-17T12:00:00.000Z"
  },
  "conversationId": "507f1f77bcf86cd799439020"
}
```

**Error Responses:**
- `400 Bad Request` - Request is not pending
- `403 Forbidden` - Only receiver can accept
- `404 Not Found` - Request doesn't exist

**Side Effects:**
- Request status updated to `ACCEPTED`
- `respondedAt` timestamp set
- New conversation created (or existing one returned)
- Both users can now message each other

**Authorization:**
- Only the receiver of the request can accept it
- Sender receives 403 if they try to accept

**Idempotency:**
- If conversation already exists, returns existing conversation
- Cannot accept already accepted/declined/blocked requests (400 error)

---

### POST /api/chat-requests/:requestId/decline

Decline a chat request. Request remains in system with DECLINED status.

**Authentication:** Required

**Request:**
```http
POST /api/chat-requests/507f1f77bcf86cd799439011/decline
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "request": {
    "id": "507f1f77bcf86cd799439011",
    "senderId": "user_id_1",
    "receiverId": "user_id_2",
    "senderUsername": "johndoe",
    "senderEmail": "john@example.com",
    "status": "DECLINED",
    "respondedAt": "2026-01-17T12:00:00.000Z",
    "createdAt": "2026-01-17T10:00:00.000Z",
    "updatedAt": "2026-01-17T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Request is not pending
- `403 Forbidden` - Only receiver can decline
- `404 Not Found` - Request doesn't exist

**Side Effects:**
- Request status updated to `DECLINED`
- `respondedAt` timestamp set
- Request NOT deleted from database
- Sender cannot resend for 7 days (cooldown enforced)

**Authorization:**
- Only the receiver of the request can decline it

**Cooldown:**
- After decline, sender must wait 7 days before sending another request to same user
- Prevents spam and harassment

---

### POST /api/chat-requests/:requestId/block

Block the sender of a chat request. Permanently prevents future requests.

**Authentication:** Required

**Request:**
```http
POST /api/chat-requests/507f1f77bcf86cd799439011/block
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "request": {
    "id": "507f1f77bcf86cd799439011",
    "senderId": "user_id_1",
    "receiverId": "user_id_2",
    "senderUsername": "johndoe",
    "senderEmail": "john@example.com",
    "status": "BLOCKED",
    "respondedAt": "2026-01-17T12:00:00.000Z",
    "createdAt": "2026-01-17T10:00:00.000Z",
    "updatedAt": "2026-01-17T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `403 Forbidden` - Only receiver can block sender
- `404 Not Found` - Request doesn't exist

**Side Effects:**
- Request status updated to `BLOCKED`
- `respondedAt` timestamp set
- Sender added to receiver's blocked users list
- Sender can NEVER send requests to receiver again
- If conversation exists, messaging becomes impossible

**Authorization:**
- Only the receiver of the request can block the sender

**Permanence:**
- Block is permanent until explicitly unblocked via `/api/users/block/:targetUserId`
- All future request attempts will return 403 Forbidden
- This is a stronger action than declining

---

## Conversations API

### GET /api/conversations

List all conversations for the authenticated user.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `20` | Items per page (max: 100) |

**Request:**
```http
GET /api/conversations?page=1&limit=20
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "conversations": [
    {
      "id": "507f1f77bcf86cd799439011",
      "participants": ["user_id_1", "user_id_2"],
      "type": "direct",
      "name": null,
      "lastMessage": {
        "content": "Hey, how are you?",
        "senderId": "user_id_1",
        "timestamp": "2026-01-16T15:30:00.000Z"
      },
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-16T15:30:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20
}
```

**Field Descriptions:**
- `type`: Either `"direct"` (1-on-1) or `"group"` (future feature)
- `name`: Only present for group conversations
- `lastMessage`: Null if no messages exchanged yet
- `participants`: Array of user IDs in the conversation

**Pagination:**
- Returns empty array when no more conversations
- Conversations ordered by `updatedAt` (most recent first)

---

### POST /api/conversations

Create a new direct conversation or retrieve existing one.

**Authentication:** Required

**Request:**
```http
POST /api/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "otherUserId": "507f1f77bcf86cd799439012"
}
```

**Request Body Schema:**
```json
{
  "otherUserId": "string (required) - MongoDB ObjectId"
}
```

**Success Response (201):**
```json
{
  "conversation": {
    "id": "507f1f77bcf86cd799439011",
    "participants": ["user_id_1", "user_id_2"],
    "type": "direct",
    "name": null,
    "lastMessage": null,
    "createdAt": "2026-01-17T10:00:00.000Z",
    "updatedAt": "2026-01-17T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid user ID format
- `404 Not Found` - Target user doesn't exist

**Idempotency:**
- If conversation already exists between you and the other user, returns existing conversation
- Safe to call multiple times

---

### GET /api/conversations/:id

Get a specific conversation by ID.

**Authentication:** Required

**Request:**
```http
GET /api/conversations/507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "conversation": {
    "id": "507f1f77bcf86cd799439011",
    "participants": ["user_id_1", "user_id_2"],
    "type": "direct",
    "name": null,
    "lastMessage": {
      "content": "See you tomorrow!",
      "senderId": "user_id_2",
      "timestamp": "2026-01-16T18:45:00.000Z"
    },
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-16T18:45:00.000Z"
  }
}
```

**Error Responses:**
- `404 Not Found` - Conversation doesn't exist or user not a participant
- `401 Unauthorized` - Missing/invalid token

**Authorization:**
- Only participants can view a conversation
- Non-participants receive `404` (not `403` to prevent enumeration)

---

### DELETE /api/conversations/:id

Delete a conversation. Removes it from your view only (soft delete).

**Authentication:** Required

**Request:**
```http
DELETE /api/conversations/507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "message": "Conversation deleted successfully"
}
```

**Error Responses:**
- `404 Not Found` - Conversation doesn't exist or not a participant
- `401 Unauthorized` - Missing/invalid token

**Side Effects:**
- Conversation hidden from your conversation list
- Messages remain in database
- Other participants can still access the conversation
- You can still receive messages (via Socket.IO) until you leave the conversation

**Notes:**
- This is a soft delete (conversation not permanently removed)
- Does NOT remove the conversation for other participants

---

## Messages API

### GET /api/conversations/:conversationId/messages

Retrieve paginated messages from a conversation.

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-indexed) |
| `limit` | integer | `50` | Messages per page (max: 100) |

**Request:**
```http
GET /api/conversations/507f1f77bcf86cd799439011/messages?page=1&limit=50
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "messages": [
    {
      "id": "507f1f77bcf86cd799439021",
      "conversationId": "507f1f77bcf86cd799439011",
      "senderId": "user_id_1",
      "content": "Hello! How are you doing?",
      "deliveryState": "read",
      "readBy": ["user_id_1", "user_id_2"],
      "createdAt": "2026-01-16T14:20:00.000Z",
      "updatedAt": "2026-01-16T14:25:00.000Z"
    }
  ],
  "page": 1,
  "limit": 50
}
```

**Field Descriptions:**
- `deliveryState`: Enum - `"sent"` | `"delivered"` | `"read"`
- `readBy`: Array of user IDs who have read the message
- Messages ordered by `createdAt` (newest first for pagination, reverse on client)

**Pagination:**
- Returns empty array when no more messages
- Load older messages by incrementing `page`

**Error Responses:**
- `404 Not Found` - Conversation doesn't exist or user not a participant

---

### POST /api/conversations/:conversationId/messages

Send a new message to a conversation.

**Authentication:** Required

**Request:**
```http
POST /api/conversations/507f1f77bcf86cd799439011/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hey! How's it going?"
}
```

**Request Body Schema:**
```json
{
  "content": "string (required, min: 1, max: 10000)"
}
```

**Success Response (201):**
```json
{
  "message": {
    "id": "507f1f77bcf86cd799439021",
    "conversationId": "507f1f77bcf86cd799439011",
    "senderId": "user_id_1",
    "content": "Hey! How's it going?",
    "deliveryState": "sent",
    "readBy": ["user_id_1"],
    "createdAt": "2026-01-17T10:30:00.000Z",
    "updatedAt": "2026-01-17T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Empty content or exceeds max length
- `404 Not Found` - Conversation doesn't exist or user not a participant
- `403 Forbidden` - User is blocked by recipient

**Side Effects:**
- Message persisted to database
- Real-time notification sent via Socket.IO to all conversation participants
- Conversation's `lastMessage` and `updatedAt` updated
- `deliveryState` initially set to `"sent"`

**Notes:**
- Message delivery via Socket.IO happens AFTER database persistence
- Client should optimistically show message immediately, then confirm via Socket.IO

---

### GET /api/conversations/:conversationId/unread-count

Get the count of unread messages in a conversation.

**Authentication:** Required

**Request:**
```http
GET /api/conversations/507f1f77bcf86cd799439011/unread-count
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "count": 5
}
```

**Error Responses:**
- `404 Not Found` - Conversation doesn't exist or user not a participant

**Notes:**
- Count represents messages not in your `readBy` array
- Useful for showing badge counts in UI

---

### PATCH /api/messages/:messageId/read

Mark a message as read by the authenticated user.

**Authentication:** Required

**Request:**
```http
PATCH /api/messages/507f1f77bcf86cd799439021/read
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "message": "Message marked as read"
}
```

**Error Responses:**
- `404 Not Found` - Message doesn't exist or user not in conversation
- `400 Bad Request` - Invalid message ID format

**Side Effects:**
- User ID added to message's `readBy` array
- `deliveryState` updated to `"read"` if all participants have read it
- Read receipt sent via Socket.IO to message sender

**Idempotency:**
- Safe to call multiple times
- No error if already marked as read

---

### DELETE /api/messages/:messageId

Delete a message (soft delete for sender only).

**Authentication:** Required

**Request:**
```http
DELETE /api/messages/507f1f77bcf86cd799439021
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "message": "Message deleted successfully"
}
```

**Error Responses:**
- `404 Not Found` - Message doesn't exist
- `403 Forbidden` - User is not the message sender

**Side Effects:**
- Message soft-deleted (marked as deleted, not removed from DB)
- Message hidden from sender's view
- Other participants can still see the message
- Deletion notification NOT sent via Socket.IO (future feature)

**Authorization:**
- Only the message sender can delete their own messages
- Cannot delete messages sent by other users

**Notes:**
- This is NOT a "delete for everyone" feature
- Message remains visible to other conversation participants

---

## Additional Notes

### Rate Limiting

Currently not enforced on REST endpoints. Future implementation will include:
- 100 requests/minute per user for read operations
- 30 requests/minute for write operations

### Pagination Best Practices

- Always specify `limit` to control payload size
- Page numbers start at `1` (not `0`)
- Empty arrays indicate end of results

### Versioning

- All endpoints are currently v1 (implicit)
- Future breaking changes will require `/api/v2/...`

### CORS

- Development: `*` (all origins allowed)
- Production: Whitelist specific frontend domains

### Data Consistency

- REST API returns immediately after database write
- Real-time updates via Socket.IO may arrive with slight delay
- Use Socket.IO acknowledgements for critical operations

---

**Last Updated:** January 17, 2026  
**Maintained By:** Backend Engineering Team

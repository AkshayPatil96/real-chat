# RealChat Socket.IO Event Contracts

**Version:** v1  
**Socket Server:** `ws://localhost:3001` (Development) | `wss://api.realchat.com` (Production)  
**Authentication:** Clerk JWT Bearer Token (during connection handshake)

---

## Table of Contents

1. [Connection & Authentication](#connection--authentication)
2. [Conversation Events](#conversation-events)
3. [Message Events](#message-events)
4. [Typing Indicators](#typing-indicators)
5. [Presence Events](#presence-events)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)

---

## Connection & Authentication

### Initial Connection

**Direction:** Client → Server

Clients must authenticate during the Socket.IO connection handshake by providing a Clerk JWT token.

**Connection Options:**

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: '<CLERK_JWT_TOKEN>'
  }
});
```

**Alternative (using headers):**

```typescript
const socket = io('http://localhost:3001', {
  extraHeaders: {
    Authorization: 'Bearer <CLERK_JWT_TOKEN>'
  }
});
```

### Connection Success

**Event:** `connect`  
**Direction:** Server → Client

```typescript
socket.on('connect', () => {
  console.log('Connected to RealChat server');
  console.log('Socket ID:', socket.id);
});
```

### Connection Failure

**Event:** `connect_error`  
**Direction:** Server → Client

```typescript
socket.on('connect_error', (error) => {
  // error.message: "Authentication error: No token provided"
  // or "Authentication error" for invalid token
});
```

**Common Errors:**
- `"Authentication error: No token provided"` - Missing JWT token
- `"Authentication error"` - Invalid or expired JWT token

**Action:** Refresh token from Clerk and reconnect

### Disconnect

**Event:** `disconnect`  
**Direction:** Server → Client

```typescript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // reason can be: "io server disconnect", "transport close", etc.
});
```

**Side Effects on Disconnect:**
- User's presence set to offline after 30s grace period
- User leaves all conversation rooms
- Connection metrics decremented

---

## Conversation Events

### Join Conversation Room

**Event:** `conversation:join`  
**Direction:** Client → Server  
**Auth:** Required

Join a conversation room to receive real-time messages and events for that conversation.

**Payload:**

```typescript
{
  conversationId: string; // MongoDB ObjectId
}
```

**Example:**

```typescript
socket.emit('conversation:join', {
  conversationId: '507f1f77bcf86cd799439011'
});
```

**When to Emit:**
- When user opens/views a conversation
- After fetching conversation list
- On app resume (rejoin all active conversations)

**Side Effects:**
- Client added to Socket.IO room: `conversation:{conversationId}`
- Will now receive `message:new` events for this conversation

**No Acknowledgement:** This is a fire-and-forget event

**Error Scenarios:**
- Invalid conversation ID: Silently ignored (logged server-side)
- User not a participant: Silently ignored (security)

---

### Leave Conversation Room

**Event:** `conversation:leave`  
**Direction:** Client → Server  
**Auth:** Required

Leave a conversation room to stop receiving real-time events.

**Payload:**

```typescript
{
  conversationId: string;
}
```

**Example:**

```typescript
socket.emit('conversation:leave', {
  conversationId: '507f1f77bcf86cd799439011'
});
```

**When to Emit:**
- When user closes/navigates away from conversation
- On app background (optional optimization)

**Side Effects:**
- Client removed from Socket.IO room
- Will no longer receive `message:new` events for this conversation

**No Acknowledgement:** Fire-and-forget

---

## Message Events

### Send Message

**Event:** `message:send`  
**Direction:** Client → Server  
**Auth:** Required  
**Acknowledgement:** Yes

Send a new message to a conversation. Message is persisted to the database before being broadcast.

**Payload:**

```typescript
{
  conversationId: string;
  content: string; // min: 1, max: 10000 characters
}
```

**Acknowledgement Callback:**

```typescript
{
  success: boolean;
  message?: {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    deliveryState: "sent" | "delivered" | "read";
    readBy: string[];
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
}
```

**Example:**

```typescript
socket.emit('message:send', {
  conversationId: '507f1f77bcf86cd799439011',
  content: 'Hello, how are you?'
}, (response) => {
  if (response.success) {
    console.log('Message sent:', response.message);
  } else {
    console.error('Error:', response.error);
  }
});
```

**Error Scenarios:**

| Error Message | Cause |
|---------------|-------|
| `"Conversation not found"` | Invalid conversation ID or not a participant |
| `"Content is required"` | Empty message content |
| `"Content exceeds maximum length"` | Message > 10,000 characters |
| `"User is blocked"` | Sender is blocked by recipient |

**Side Effects:**
1. Message persisted to database
2. `message:new` event broadcast to all conversation participants
3. Conversation's `lastMessage` and `updatedAt` updated

**Important:**
- Always use acknowledgement callback to handle errors
- Do NOT rely solely on `message:new` event for confirmation
- Client should show optimistic UI update, then confirm via callback

---

### Receive New Message

**Event:** `message:new`  
**Direction:** Server → Client  
**Auth:** Required (implicit - must be in conversation room)

Broadcast when any participant sends a message to a conversation you're in.

**Payload:**

```typescript
{
  message: {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    deliveryState: "sent" | "delivered" | "read";
    readBy: string[];
    createdAt: string;
    updatedAt: string;
  }
}
```

**Example:**

```typescript
socket.on('message:new', (data) => {
  console.log('New message:', data.message);
  
  // Update UI with new message
  appendMessageToConversation(data.message);
  
  // If conversation is active, mark as read
  if (isConversationVisible(data.message.conversationId)) {
    socket.emit('message:read', { messageId: data.message.id });
  }
});
```

**When Received:**
- After another user sends a message
- After you send a message (echo for multi-device sync)
- Only received if you've joined the conversation room

**Notes:**
- You will receive your own messages (for multi-device consistency)
- Check `senderId` to determine if message is from current user
- `deliveryState` is initially `"sent"`

---

### Mark Message as Delivered

**Event:** `message:delivered`  
**Direction:** Client → Server  
**Auth:** Required

Indicate that a message has been delivered to the client.

**Payload:**

```typescript
{
  messageId: string;
}
```

**Example:**

```typescript
socket.on('message:new', (data) => {
  // Message received and rendered
  socket.emit('message:delivered', {
    messageId: data.message.id
  });
});
```

**Side Effects:**
- Message's `deliveryState` updated to `"delivered"`
- `message:status` event sent to message sender

**No Acknowledgement:** Fire-and-forget

**When to Emit:**
- Immediately after receiving `message:new`
- After message is successfully rendered in UI

---

### Mark Message as Read

**Event:** `message:read`  
**Direction:** Client → Server  
**Auth:** Required

Indicate that a message has been read by the user.

**Payload:**

```typescript
{
  messageId: string;
}
```

**Example:**

```typescript
// When conversation becomes visible
socket.emit('message:read', {
  messageId: '507f1f77bcf86cd799439021'
});
```

**Side Effects:**
- User ID added to message's `readBy` array
- Message's `deliveryState` updated to `"read"` (if all participants read)
- `message:status` event sent to message sender

**No Acknowledgement:** Fire-and-forget

**When to Emit:**
- When conversation is visible and message is displayed
- When user scrolls message into view
- When app returns to foreground with conversation visible

**Idempotency:** Safe to call multiple times for same message

---

### Message Status Update

**Event:** `message:status`  
**Direction:** Server → Client  
**Auth:** Required

Notifies message sender when recipient marks message as delivered or read.

**Payload:**

```typescript
{
  messageId: string;
  status: "delivered" | "read";
  userId: string; // User who updated the status
}
```

**Example:**

```typescript
socket.on('message:status', (data) => {
  console.log(`Message ${data.messageId} ${data.status} by ${data.userId}`);
  
  // Update message delivery indicators in UI
  updateMessageStatus(data.messageId, data.status);
});
```

**When Received:**
- After recipient emits `message:delivered`
- After recipient emits `message:read`

**Notes:**
- Only sent to message sender
- Multiple status updates possible (one per recipient in group chats)

---

## Typing Indicators

### Start Typing

**Event:** `typing:start`  
**Direction:** Client → Server  
**Auth:** Required

Indicate that the user started typing in a conversation.

**Payload:**

```typescript
{
  conversationId: string;
}
```

**Example:**

```typescript
// On input focus or first keystroke
socket.emit('typing:start', {
  conversationId: '507f1f77bcf86cd799439011'
});
```

**Side Effects:**
- `typing:user` event broadcast to other conversation participants

**No Acknowledgement:** Fire-and-forget

**When to Emit:**
- When user starts typing (first character)
- When message input receives focus

**Throttling:**
- Client should throttle to max 1 event per second

---

### Stop Typing

**Event:** `typing:stop`  
**Direction:** Client → Server  
**Auth:** Required

Indicate that the user stopped typing.

**Payload:**

```typescript
{
  conversationId: string;
}
```

**Example:**

```typescript
// After inactivity or on blur
socket.emit('typing:stop', {
  conversationId: '507f1f77bcf86cd799439011'
});
```

**Side Effects:**
- `typing:user` event broadcast to other participants

**No Acknowledgement:** Fire-and-forget

**When to Emit:**
- After 3 seconds of inactivity
- When message is sent
- When input loses focus
- When user navigates away

---

### Typing Indicator Update

**Event:** `typing:user`  
**Direction:** Server → Client  
**Auth:** Required

Broadcast to conversation participants when someone starts/stops typing.

**Payload:**

```typescript
{
  userId: string;
  conversationId: string;
  isTyping: boolean;
}
```

**Example:**

```typescript
socket.on('typing:user', (data) => {
  if (data.isTyping) {
    showTypingIndicator(data.userId, data.conversationId);
  } else {
    hideTypingIndicator(data.userId, data.conversationId);
  }
});
```

**Notes:**
- Only sent to OTHER participants (not sender)
- Must be in conversation room to receive
- Client should auto-hide indicator after 5s if no `typing:stop`

---

## Presence Events

### User Online

**Event:** `user:online`  
**Direction:** Server → Client  
**Auth:** Required

Broadcast when a user connects and comes online.

**Payload:**

```typescript
{
  userId: string;
}
```

**Example:**

```typescript
socket.on('user:online', (data) => {
  console.log(`User ${data.userId} is online`);
  updateUserPresence(data.userId, 'online');
});
```

**When Received:**
- When a user successfully connects
- Broadcast to ALL connected clients

**Notes:**
- Sent immediately after successful authentication
- Used to update presence indicators in contact lists

---

### User Offline

**Event:** `user:offline`  
**Direction:** Server → Client  
**Auth:** Required

Broadcast when a user disconnects or their session times out.

**Payload:**

```typescript
{
  userId: string;
}
```

**Example:**

```typescript
socket.on('user:offline', (data) => {
  console.log(`User ${data.userId} is offline`);
  updateUserPresence(data.userId, 'offline');
});
```

**When Received:**
- When user disconnects
- After 30-second grace period (handles brief disconnections)

**Notes:**
- Brief disconnections (< 30s) won't trigger offline status
- Broadcast to ALL connected clients

---

### Presence Heartbeat

**Event:** `presence:heartbeat`  
**Direction:** Client → Server  
**Auth:** Required

Client should periodically emit to refresh online status.

**Payload:** None (empty event)

**Example:**

```typescript
// Send heartbeat every 25 seconds
setInterval(() => {
  socket.emit('presence:heartbeat');
}, 25000);
```

**Side Effects:**
- Resets server-side presence timeout
- Prevents automatic offline status

**No Acknowledgement:** Fire-and-forget

**Recommended Interval:** 25-30 seconds

**Purpose:**
- Maintains online status during long idle periods
- Prevents premature timeout

---

## Error Handling

### General Error Principles

1. **Authentication Errors:** Result in connection failure
2. **Validation Errors:** Returned in acknowledgement callbacks
3. **Server Errors:** Logged server-side; generic error to client

### Handling Acknowledgement Errors

Always check the `success` field in acknowledgement callbacks:

```typescript
socket.emit('message:send', payload, (response) => {
  if (!response.success) {
    // Handle error
    showErrorToast(response.error);
    
    // Retry logic (if appropriate)
    if (response.error === 'Network error') {
      retryWithBackoff();
    }
  }
});
```

### Reconnection Strategy

```typescript
const socket = io('http://localhost:3001', {
  auth: { token: getClerkToken() },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server disconnected client (auth issue?)
    refreshTokenAndReconnect();
  }
  // Socket.IO will auto-reconnect for other reasons
});

socket.on('connect', () => {
  // Re-join all active conversations
  activeConversations.forEach(convId => {
    socket.emit('conversation:join', { conversationId: convId });
  });
});
```

---

## Rate Limiting

### Current Limits (per user)

| Event | Limit | Window |
|-------|-------|--------|
| `message:send` | 10 messages | 10 seconds |
| `typing:start` / `typing:stop` | 30 events | 30 seconds |
| `presence:heartbeat` | 3 events | 60 seconds |
| Other events | No limit | - |

### Rate Limit Exceeded

**Behavior:**
- Events silently dropped (not processed)
- No error sent to client
- Logged server-side for abuse monitoring

**Client Handling:**
- Implement client-side throttling to avoid hitting limits
- Use debouncing for typing indicators
- Queue messages during rate limit (if needed)

### Example: Client-Side Throttling

```typescript
import { throttle } from 'lodash';

const sendTypingStart = throttle(() => {
  socket.emit('typing:start', { conversationId });
}, 1000, { leading: true, trailing: false });
```

---

## Best Practices

### 1. Join Conversations on View

```typescript
// When user opens a conversation
onConversationOpen(conversationId) {
  socket.emit('conversation:join', { conversationId });
}

// When user closes/navigates away
onConversationClose(conversationId) {
  socket.emit('conversation:leave', { conversationId });
}
```

### 2. Handle Multi-Device Sync

```typescript
socket.on('message:new', (data) => {
  // Check if message is from current user on another device
  if (data.message.senderId === currentUserId) {
    // Sync with other devices
    updateUIWithSentMessage(data.message);
  } else {
    // Message from another user
    showNotification(data.message);
  }
});
```

### 3. Optimistic UI Updates

```typescript
function sendMessage(content) {
  // 1. Show message optimistically
  const tempMessage = createOptimisticMessage(content);
  appendToUI(tempMessage);
  
  // 2. Send via Socket.IO
  socket.emit('message:send', {
    conversationId,
    content
  }, (response) => {
    if (response.success) {
      // 3. Replace temp message with real one
      replaceOptimisticMessage(tempMessage.id, response.message);
    } else {
      // 4. Show error, remove optimistic message
      removeOptimisticMessage(tempMessage.id);
      showError(response.error);
    }
  });
}
```

### 4. Automatic Read Receipts

```typescript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const messageId = entry.target.dataset.messageId;
      socket.emit('message:read', { messageId });
    }
  });
}, { threshold: 0.5 });

// Observe message elements
messageElements.forEach(el => observer.observe(el));
```

### 5. Graceful Degradation

```typescript
// If Socket.IO unavailable, fall back to polling
if (!socket.connected) {
  // Use REST API with polling
  startPolling();
}

socket.on('connect', () => {
  stopPolling();
});
```

---

## Event Flow Examples

### Sending a Message (Full Flow)

```
1. Client A: socket.emit('message:send', { conversationId, content })
2. Server: Persists message to MongoDB
3. Server → Client A: Acknowledgement callback { success: true, message }
4. Server → All in room: socket.emit('message:new', { message })
5. Client B: Receives message:new
6. Client B: socket.emit('message:delivered', { messageId })
7. Server → Client A: socket.emit('message:status', { messageId, status: 'delivered' })
8. Client B: User views message
9. Client B: socket.emit('message:read', { messageId })
10. Server → Client A: socket.emit('message:status', { messageId, status: 'read' })
```

### Typing Indicator Flow

```
1. Client A: User types first character
2. Client A: socket.emit('typing:start', { conversationId })
3. Server → Client B: socket.emit('typing:user', { userId: A, isTyping: true })
4. Client B: Shows "User A is typing..."
5. Client A: User stops typing (3s timeout)
6. Client A: socket.emit('typing:stop', { conversationId })
7. Server → Client B: socket.emit('typing:user', { userId: A, isTyping: false })
8. Client B: Hides typing indicator
```

---

## Versioning

- Current version: **v1** (implicit)
- Event names are stable and will not change
- New optional fields may be added to payloads
- Breaking changes will require new event names or versioned namespace

---

**Last Updated:** January 17, 2026  
**Maintained By:** Backend Engineering Team

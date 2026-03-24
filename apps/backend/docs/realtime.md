# Real-time Communication Documentation

## Socket.IO Overview

Real-Chat uses **Socket.IO** for bidirectional real-time communication between clients and server.

## Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ WebSocket/HTTP Long Polling
       │
┌──────▼──────┐
│  Socket.IO  │
│   Server    │
└──────┬──────┘
       │
       ├──────► Chat Handler
       ├──────► Presence Handler
       └──────► Typing Handler
```

## Connection Flow

### 1. Client Connection

```typescript
// Client-side
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: clerkJwtToken  // Clerk JWT
  }
});
```

### 2. Server Authentication

```typescript
// Server-side
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    // Verify with Clerk
    const verified = await verifyToken(token, {
      secretKey: config.clerk.secretKey
    });
    
    // Attach userId to socket
    socket.userId = verified.sub;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});
```

### 3. Connection Established

```typescript
io.on('connection', (socket) => {
  const userId = socket.userId;
  
  // Register event handlers
  registerChatHandlers(io, socket);
  registerPresenceHandlers(io, socket, presenceService);
  registerTypingHandlers(io, socket);
  
  socket.on('disconnect', () => {
    // Cleanup
  });
});
```

## Event Handlers

### Chat Handler

**Location**: `src/socket/handlers/chat.handler.ts`

#### Events

**1. message:send** (Client → Server)
```typescript
// Client
socket.emit('message:send', {
  conversationId: '507f1f77bcf86cd799439011',
  content: 'Hello!'
}, (response) => {
  console.log(response.success);
});

// Server
socket.on('message:send', async (data, callback) => {
  const { conversationId, content } = data;
  
  // PERSIST BEFORE EMIT
  const message = await MessageService.sendMessage(
    conversationId,
    userId,
    content
  );
  
  // Emit to conversation room
  io.to(`conversation:${conversationId}`).emit('message:new', {
    message
  });
  
  // Acknowledge
  callback({ success: true, message });
});
```

**2. message:new** (Server → Client)
```typescript
// Client
socket.on('message:new', (data) => {
  const { message } = data;
  // Update UI with new message
});
```

**3. message:delivered** (Client → Server)
```typescript
// Client
socket.emit('message:delivered', {
  messageId: '507f1f77bcf86cd799439011'
});

// Server
socket.on('message:delivered', async (data) => {
  await MessageService.markAsRead(data.messageId, userId);
  
  // Notify sender
  socket.broadcast.emit('message:status', {
    messageId: data.messageId,
    status: 'delivered',
    userId
  });
});
```

**4. message:read** (Client → Server)
```typescript
// Client
socket.emit('message:read', {
  messageId: '507f1f77bcf86cd799439011'
});

// Server
socket.on('message:read', async (data) => {
  await MessageService.markAsRead(data.messageId, userId);
  
  socket.broadcast.emit('message:status', {
    messageId: data.messageId,
    status: 'read',
    userId
  });
});
```

**5. conversation:join** (Client → Server)
```typescript
// Client
socket.emit('conversation:join', {
  conversationId: '507f1f77bcf86cd799439011'
});

// Server
socket.on('conversation:join', (data) => {
  socket.join(`conversation:${data.conversationId}`);
});
```

**6. conversation:leave** (Client → Server)
```typescript
// Client
socket.emit('conversation:leave', {
  conversationId: '507f1f77bcf86cd799439011'
});

// Server
socket.on('conversation:leave', (data) => {
  socket.leave(`conversation:${data.conversationId}`);
});
```

### Presence Handler

**Location**: `src/socket/handlers/presence.handler.ts`

#### Redis-Backed Presence

```typescript
class PresenceService {
  private redis: RedisClientType;
  private TTL = 300; // 5 minutes
  
  async setOnline(userId: string) {
    await this.redis.set(
      `presence:${userId}`,
      'online',
      { EX: this.TTL }
    );
  }
  
  async setOffline(userId: string) {
    await this.redis.del(`presence:${userId}`);
  }
  
  async isOnline(userId: string): boolean {
    const status = await this.redis.get(`presence:${userId}`);
    return status === 'online';
  }
}
```

#### Events

**1. user:online** (Server → Client)
```typescript
// Server (on connection)
await presenceService.setOnline(userId);
io.emit('user:online', { userId });

// Client
socket.on('user:online', (data) => {
  // Update UI: show user as online
});
```

**2. user:offline** (Server → Client)
```typescript
// Server (on disconnect)
await presenceService.setOffline(userId);
io.emit('user:offline', { userId });

// Client
socket.on('user:offline', (data) => {
  // Update UI: show user as offline
});
```

**3. presence:heartbeat** (Client → Server)
```typescript
// Client (every 2 minutes)
setInterval(() => {
  socket.emit('presence:heartbeat');
}, 120000);

// Server
socket.on('presence:heartbeat', async () => {
  await presenceService.refreshPresence(userId);
});
```

### Typing Handler

**Location**: `src/socket/handlers/typing.handler.ts`

#### Events

**1. typing:start** (Client → Server)
```typescript
// Client
socket.emit('typing:start', {
  conversationId: '507f1f77bcf86cd799439011'
});

// Server
socket.on('typing:start', (data) => {
  socket.to(`conversation:${data.conversationId}`).emit('typing:user', {
    userId,
    conversationId: data.conversationId,
    isTyping: true
  });
});
```

**2. typing:stop** (Client → Server)
```typescript
// Client
socket.emit('typing:stop', {
  conversationId: '507f1f77bcf86cd799439011'
});

// Server
socket.on('typing:stop', (data) => {
  socket.to(`conversation:${data.conversationId}`).emit('typing:user', {
    userId,
    conversationId: data.conversationId,
    isTyping: false
  });
});
```

**3. typing:user** (Server → Client)
```typescript
// Client
socket.on('typing:user', (data) => {
  const { userId, isTyping } = data;
  // Update UI: show/hide typing indicator
});
```

## Room Management

### Conversation Rooms

Each conversation has a dedicated Socket.IO room:

```typescript
// Room naming convention
const roomName = `conversation:${conversationId}`;

// Join room
socket.join(roomName);

// Emit to room (all participants)
io.to(roomName).emit('message:new', data);

// Emit to room except sender
socket.to(roomName).emit('typing:user', data);

// Leave room
socket.leave(roomName);
```

## Rate Limiting

**Location**: `src/socket/middleware/rateLimit.ts`

### Redis-Backed Rate Limiting

```typescript
const RATE_LIMIT_WINDOW = 60;        // 1 minute
const MAX_EVENTS_PER_WINDOW = 100;   // 100 events

io.use(async (socket, next) => {
  const userId = socket.userId;
  const key = `ratelimit:socket:${userId}`;
  
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, RATE_LIMIT_WINDOW);
  }
  
  if (current > MAX_EVENTS_PER_WINDOW) {
    return next(new Error('Rate limit exceeded'));
  }
  
  next();
});
```

## Persist-Before-Emit Pattern

**Critical Pattern**: Always persist data to database before emitting Socket.IO events.

### Why?

1. **Data Integrity**: Database is source of truth
2. **Reliability**: Events may fail, but data is saved
3. **Consistency**: All clients see same data
4. **Recovery**: Can rebuild state from database

### Implementation

```typescript
async sendMessage(conversationId, senderId, content) {
  // 1. PERSIST to database first
  const message = await messageRepository.create(
    conversationId,
    senderId,
    content
  );
  
  // 2. Update related data
  await conversationRepository.updateLastMessage(
    conversationId,
    content,
    senderId
  );
  
  // 3. EMIT to Socket.IO (after successful persistence)
  io.to(`conversation:${conversationId}`).emit('message:new', {
    message
  });
  
  // 4. Return persisted data
  return message;
}
```

## Error Handling

### Socket.IO Error Handling

```typescript
socket.on('message:send', async (data, callback) => {
  try {
    const message = await MessageService.sendMessage(...);
    callback({ success: true, message });
  } catch (error) {
    logger.error(error, 'Error sending message');
    callback({ 
      success: false, 
      error: error.message 
    });
  }
});
```

### Client-Side Error Handling

```typescript
socket.emit('message:send', data, (response) => {
  if (response.success) {
    // Success
  } else {
    // Handle error
    console.error(response.error);
  }
});
```

## Reconnection Handling

### Client-Side Reconnection

```typescript
socket.on('connect', () => {
  console.log('Connected');
  
  // Rejoin all conversation rooms
  activeConversations.forEach(conversationId => {
    socket.emit('conversation:join', { conversationId });
  });
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});
```

### Server-Side Reconnection

```typescript
io.on('connection', (socket) => {
  // Set online status
  await presenceService.setOnline(socket.userId);
  
  socket.on('disconnect', async () => {
    // Set offline status
    await presenceService.setOffline(socket.userId);
  });
});
```

## Scaling Socket.IO

### Redis Adapter

For multi-instance deployments:

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: config.redisUrl });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

**Benefits**:
- Horizontal scaling
- Load balancing
- Shared state across instances

## Performance Optimization

### 1. Binary Data

Use binary data for efficiency:
```typescript
socket.emit('message:new', Buffer.from(JSON.stringify(data)));
```

### 2. Compression

Enable per-message compression:
```typescript
socket.compress(true).emit('message:new', largeData);
```

### 3. Namespaces

Separate concerns with namespaces:
```typescript
const chatNamespace = io.of('/chat');
const notificationsNamespace = io.of('/notifications');
```

## Monitoring

### Metrics

```typescript
import { websocketConnections } from './utils/metrics.js';

io.on('connection', (socket) => {
  websocketConnections.inc();
  
  socket.on('disconnect', () => {
    websocketConnections.dec();
  });
});
```

### Logging

```typescript
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.userId}`);
  
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.userId}`);
  });
});
```

## Testing Socket.IO

### Client-Side Testing

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: testToken }
});

socket.on('connect', () => {
  socket.emit('message:send', testData, (response) => {
    expect(response.success).toBe(true);
  });
});
```

### Server-Side Testing

```typescript
import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();
const io = new Server(httpServer);

// Test event handlers
io.on('connection', (socket) => {
  socket.on('test:event', (data, callback) => {
    callback({ success: true });
  });
});
```

## Best Practices

1. **Always authenticate** connections
2. **Validate all events** before processing
3. **Use rooms** for targeted broadcasting
4. **Implement rate limiting** to prevent abuse
5. **Persist before emit** for data integrity
6. **Handle reconnections** gracefully
7. **Log all events** for debugging
8. **Monitor connections** and performance
9. **Use acknowledgments** for critical events
10. **Implement heartbeats** for presence

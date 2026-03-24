# Architecture Documentation

## Overview

Real-Chat backend follows a **modular monolith** architecture with clear separation of concerns, adhering to SOLID principles.

## System Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       ├─────── HTTP/REST ────────┐
       │                          │
       └─────── WebSocket ────────┤
                                  │
                         ┌────────▼────────┐
                         │  Load Balancer  │
                         └────────┬────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
            ┌───────▼────────┐         ┌───────▼────────┐
            │  Express.js    │         │   Socket.IO    │
            │  (REST API)    │         │  (Real-time)   │
            └───────┬────────┘         └───────┬────────┘
                    │                           │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    Business Logic Layer   │
                    │  (Services + Repositories)│
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
            ┌───────▼────────┐         ┌───────▼────────┐
            │    MongoDB     │         │     Redis      │
            │  (Persistence) │         │    (Cache)     │
            └────────────────┘         └────────────────┘
```

## Modular Structure

### Module Pattern

Each module follows a consistent 9-file pattern:

```
modules/<feature>/
├── <feature>.model.ts       # Mongoose schema + indexes
├── <feature>.interface.ts   # TypeScript interfaces (contracts)
├── <feature>.dto.ts         # Data Transfer Objects + Mappers
├── <feature>.repository.ts  # Data access layer
├── <feature>.service.ts     # Business logic layer
├── <feature>.controller.ts  # HTTP request handlers
├── <feature>.validator.ts   # Input validation rules
├── <feature>.routes.ts      # Route definitions
└── index.ts                 # Module exports
```

### Modules

#### 1. Users Module
**Responsibility**: User management, blocking, account operations

**Key Features**:
- User profile management
- User blocking/unblocking
- Soft delete support
- Clerk integration

**Database Schema**:
```typescript
{
  clerkId: string (unique, indexed)
  username: string (indexed)
  email: string (indexed)
  avatar?: string
  blockedUsers: ObjectId[]
  deletedAt?: Date
}
```

#### 2. Conversations Module
**Responsibility**: Conversation management

**Key Features**:
- Direct and group conversations
- Participant management
- Last message tracking
- Soft delete support

**Database Schema**:
```typescript
{
  participants: ObjectId[] (indexed)
  type: 'direct' | 'group'
  name?: string
  lastMessage?: {
    content: string
    senderId: ObjectId
    timestamp: Date
  }
  deletedAt?: Date
}
```

#### 3. Messages Module
**Responsibility**: Message management and delivery

**Key Features**:
- Message sending (persist-before-emit)
- Pagination support
- Unread count tracking
- Delivery states (sent/delivered/read)
- Soft delete support

**Database Schema**:
```typescript
{
  conversationId: ObjectId (indexed)
  senderId: ObjectId (indexed)
  content: string
  deliveryState: 'sent' | 'delivered' | 'read'
  readBy: ObjectId[]
  deletedAt?: Date
}
```

## Layered Architecture

### 1. Presentation Layer (Routes + Controllers)
- **Routes**: Define endpoints, apply middleware
- **Controllers**: Handle HTTP requests/responses
- **Responsibility**: HTTP protocol handling

### 2. Business Logic Layer (Services)
- **Services**: Implement business rules
- **Responsibility**: Domain logic, validation, orchestration
- **Pattern**: Dependency Injection

### 3. Data Access Layer (Repositories)
- **Repositories**: Database operations
- **Responsibility**: Data persistence
- **Pattern**: Repository pattern

### 4. Data Layer (Models)
- **Models**: Mongoose schemas
- **Responsibility**: Data structure, indexes

## SOLID Principles

### Single Responsibility Principle (SRP) ✅
Each file has one clear purpose:
- Model: Schema definition
- Repository: Data access
- Service: Business logic
- Controller: HTTP handling
- Validator: Input validation

### Open/Closed Principle (OCP) ✅
Services are open for extension via interfaces:
```typescript
interface IUserService {
  getUserById(id: string): Promise<IUser>;
  // ... other methods
}

class UserService implements IUserService {
  // Implementation
}
```

### Liskov Substitution Principle (LSP) ✅
All implementations follow their contracts:
```typescript
class UserRepository implements IUserRepository {
  // Must implement all interface methods
}
```

### Interface Segregation Principle (ISP) ✅
Small, focused interfaces:
```typescript
interface IUserRepository {
  findById(id: string): Promise<IUser | null>;
  // ... only user-related methods
}
```

### Dependency Inversion Principle (DIP) ✅
Depend on abstractions, not concretions:
```typescript
class UserService {
  constructor(
    private userRepository: IUserRepository = UserRepository
  ) {}
}
```

## Design Patterns

### 1. Repository Pattern
Abstracts data access logic:
```typescript
class UserRepository implements IUserRepository {
  async findById(id: string): Promise<IUser | null> {
    return User.findOne({ _id: id, deletedAt: null });
  }
}
```

### 2. Dependency Injection
Services receive dependencies via constructor:
```typescript
class UserService {
  constructor(private userRepository: IUserRepository) {}
}
```

### 3. DTO Pattern
Separate internal models from API responses:
```typescript
class UserMapper {
  static toDTO(user: IUser): UserDTO {
    return {
      id: user._id.toString(),
      username: user.username,
      // ... only public fields
    };
  }
}
```

### 4. Soft Delete Pattern
Mark records as deleted instead of removing:
```typescript
async softDelete(id: string): Promise<void> {
  await User.findByIdAndUpdate(id, { deletedAt: new Date() });
}
```

### 5. Persist-Before-Emit Pattern
Save to database before emitting Socket.IO events:
```typescript
async sendMessage(conversationId, senderId, content) {
  // 1. Persist to database
  const message = await messageRepository.create(...);
  
  // 2. Emit to Socket.IO
  io.to(conversationId).emit('message:new', message);
  
  return message;
}
```

## Database Design

### Indexing Strategy

**Users Collection**:
- `clerkId` (unique)
- `username`
- `email`
- `deletedAt`
- Compound: `{ _id: 1, blockedUsers: 1 }`

**Conversations Collection**:
- `participants`
- `lastMessage.timestamp` (descending)
- `deletedAt`
- Compound: `{ participants: 1, deletedAt: 1 }`

**Messages Collection**:
- `conversationId`
- `senderId`
- `deletedAt`
- Compound: `{ conversationId: 1, createdAt: -1 }`
- Compound: `{ conversationId: 1, readBy: 1, deletedAt: 1 }`

### Query Optimization

1. **Pagination**: Skip + Limit pattern
2. **Soft Deletes**: Always filter `deletedAt: null`
3. **Population**: Selective field population
4. **Indexes**: Cover frequent queries

## Socket.IO Architecture

### Connection Flow
```
1. Client connects with JWT token
2. Server verifies token with Clerk
3. Attach userId to socket
4. Initialize presence (set online)
5. Register event handlers
6. On disconnect: Set offline
```

### Room Management
- Each conversation = Socket.IO room
- Users join rooms for conversations
- Broadcast to room for new messages

### Presence Tracking
- Redis-backed with TTL (5 minutes)
- Heartbeat to refresh presence
- Automatic offline on disconnect

## Cross-Module Communication

Modules communicate via exported services:

```typescript
// messages/message.service.ts
import ConversationService from '../conversations/conversation.service.js';

class MessageService {
  async sendMessage(conversationId, senderId, content) {
    // Verify conversation exists
    await ConversationService.getConversationById(conversationId, senderId);
    // ... send message
  }
}
```

## Error Handling

### Custom Error Class
```typescript
class AppError extends Error {
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}
```

### Global Error Handler
Catches all errors and formats responses:
```typescript
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message,
    statusCode,
  });
});
```

## Performance Considerations

1. **Database Indexes**: Optimized for common queries
2. **Redis Caching**: Presence data cached
3. **Pagination**: Limit result sets
4. **Connection Pooling**: MongoDB connection pool
5. **Async/Await**: Non-blocking I/O

## Scalability

### Horizontal Scaling
- Stateless REST API (scales easily)
- Socket.IO with Redis adapter (multi-instance)
- MongoDB replica set
- Redis cluster

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Add indexes as needed

## Testing Strategy

1. **Unit Tests**: Services, repositories
2. **Integration Tests**: API endpoints
3. **E2E Tests**: Full user flows
4. **Load Tests**: Performance benchmarks

# Real-Chat Backend

Production-grade real-time chat system built with Node.js, Express, MongoDB, Redis, and Socket.IO.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (LTS)
- MongoDB 6.0+
- Redis 7.0+
- pnpm 9.0+

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run in development
pnpm dev

# Build for production
pnpm build

# Run in production
pnpm start
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/realchat
REDIS_URL=redis://localhost:6379

# Authentication (Clerk)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# AWS S3 (File Upload)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your-bucket-name

# CORS
CORS_ORIGIN=http://localhost:3000

# Observability (Optional)
SENTRY_DSN=https://...
```

**Important**: For webhook setup, see [Webhook Setup Guide](./src/jobs/WEBHOOK_SETUP.md)

## 📚 Documentation

**Complete documentation is organized in the [`docs/`](./docs/README.md) directory.**

### Quick Links

#### Core Documentation
- **[📖 Documentation Index](./docs/README.md)** - Complete documentation guide
- **[🏗️ Architecture](./docs/architecture.md)** - System design and modular structure
- **[🔐 Security](./docs/security.md)** - Authentication, authorization, and best practices
- **[⚡ Real-time](./docs/realtime.md)** - Socket.IO implementation and events

#### API Reference
- **[REST API Contracts](./docs/api/api-contracts.md)** - Complete endpoint documentation
- **[Socket.IO Events](./docs/api/socket-events.md)** - Real-time event specifications
- **[Swagger UI](http://localhost:3001/api-docs)** - Interactive API explorer (when running)

#### Guides
- **[🚀 Setup Guide](./docs/guides/SETUP_GUIDE.md)** - Jest, AWS S3, Docker, CI/CD setup
- **[📊 Logging & Monitoring](./docs/logging-and-monitoring.md)** - Observability stack

#### Production Hardening
- **[✅ Completion Report](./docs/production-hardening/PRODUCTION_HARDENING_REPORT.md)** - Production readiness summary
- **[📋 Feature Inventory](./docs/production-hardening/BACKEND_FEATURES.md)** - Complete feature checklist
- **[🎯 Production Tasks](./docs/production-hardening/BACKEND_TODO.md)** - Hardening task details

#### Future Development
- **[🔮 Future Improvements](./docs/future-improvements.md)** - Roadmap and enhancements

---

## 🔌 API Documentation

Interactive API documentation available at:
- **Development**: http://localhost:3001/api-docs
- **Production**: https://api.realchat.com/api-docs

## 🏗️ Architecture

### Modular Structure
```
src/
├── modules/              # Feature modules
│   ├── users/           # User management
│   ├── conversations/   # Conversation management
│   └── messages/        # Message management
├── socket/              # Socket.IO handlers
├── middlewares/         # Express middlewares
├── utils/               # Utilities
└── config/              # Configuration
```

### Tech Stack
- **Runtime**: Node.js 18 (LTS)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Cache**: Redis
- **Real-time**: Socket.IO
- **Auth**: Clerk
- **Validation**: express-validator
- **Logging**: Pino
- **Monitoring**: Sentry, Prometheus
- **Language**: TypeScript (strict mode)

## 🔐 Authentication

Uses **Clerk** for authentication:
- REST APIs: JWT Bearer tokens
- Socket.IO: JWT in handshake

```typescript
// REST API
headers: {
  'Authorization': 'Bearer <clerk_jwt_token>'
}

// Socket.IO
socket.auth = { token: '<clerk_jwt_token>' }
```

## 📡 REST API Endpoints

### Users
- `GET /api/v1/users/me` - Get current user
- `POST /api/v1/users/block/:userId` - Block user
- `DELETE /api/v1/users/block/:userId` - Unblock user
- `DELETE /api/v1/users/me` - Delete account

### Conversations
- `GET /api/v1/conversations` - List conversations (paginated)
- `POST /api/v1/conversations` - Create conversation
- `GET /api/v1/conversations/:id` - Get conversation
- `DELETE /api/v1/conversations/:id` - Delete conversation

### Messages
- `GET /api/v1/conversations/:id/messages` - Get messages (paginated)
- `POST /api/v1/conversations/:id/messages` - Send message
- `GET /api/v1/conversations/:id/unread-count` - Get unread count
- `PATCH /api/v1/messages/:id/read` - Mark as read
- `DELETE /api/v1/messages/:id` - Delete message

### Uploads (AWS S3)
- `POST /api/v1/uploads/presigned-url` - Get presigned URL for direct S3 upload
- `POST /api/v1/uploads/direct` - Upload file directly through server
- `DELETE /api/v1/uploads/:fileKey` - Delete uploaded file
- `GET /api/v1/uploads/download/:fileKey` - Get presigned download URL

## ⚡ Socket.IO Events

### Client → Server
- `message:send` - Send message
- `message:delivered` - Mark delivered
- `message:read` - Mark read
- `typing:start` - Start typing
- `typing:stop` - Stop typing
- `conversation:join` - Join conversation room
- `conversation:leave` - Leave conversation room
- `presence:heartbeat` - Refresh presence

### Server → Client
- `message:new` - New message received
- `message:status` - Message status update
- `typing:user` - User typing status
- `user:online` - User came online
- `user:offline` - User went offline

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run linter
pnpm lint
```

## 📊 Monitoring

- **Health Check**: `GET /health`
- **Metrics**: `GET /metrics` (Prometheus format)
- **Logs**: `./logs/` directory (daily rotation)

## 🚢 Deployment

### Docker
```bash
docker build -t realchat-backend .
docker run -p 3000:3000 realchat-backend
```

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure MongoDB replica set
- [ ] Set up Redis cluster
- [ ] Configure Sentry DSN
- [ ] Set up log aggregation
- [ ] Configure CORS origins
- [ ] Enable rate limiting
- [ ] Set up SSL/TLS
- [ ] Configure load balancer
- [ ] Set up monitoring alerts

## 🤝 Contributing

1. Follow modular structure
2. Use TypeScript strict mode
3. Follow SOLID principles
4. Add validation for all inputs
5. Write comprehensive tests
6. Update documentation

## 📝 License

MIT

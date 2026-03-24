# Security Documentation

## Authentication

### Clerk Integration

Real-Chat uses **Clerk** for authentication, providing enterprise-grade security:

**Features**:
- JWT-based authentication
- Multi-factor authentication (MFA)
- Social login support
- Session management
- User management

### REST API Authentication

**Flow**:
1. Client authenticates with Clerk (frontend)
2. Client receives JWT token
3. Client includes token in Authorization header
4. Backend verifies token with Clerk

**Implementation**:
```typescript
// Middleware
export const protect = requireAuth();

// Usage
router.get('/me', protect, UserController.getMe);
```

**Token Format**:
```
Authorization: Bearer <clerk_jwt_token>
```

### Socket.IO Authentication

**Flow**:
1. Client connects with JWT in handshake
2. Server verifies token with Clerk
3. Attach userId to socket
4. Reject connection if invalid

**Implementation**:
```typescript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const verified = await verifyToken(token, {
    secretKey: config.clerk.secretKey
  });
  socket.userId = verified.sub;
  next();
});
```

## Authorization

### Resource-Based Access Control

**Principles**:
1. Users can only access their own resources
2. Conversation participants can access conversation data
3. Message senders can delete their messages
4. Blocking prevents conversation creation

**Implementation Examples**:

**Conversation Access**:
```typescript
async getConversationById(conversationId, userId) {
  const conversation = await repository.findById(conversationId);
  
  // Verify user is participant
  const isParticipant = conversation.participants.includes(userId);
  if (!isParticipant) {
    throw new AppError('Not authorized', 403);
  }
  
  return conversation;
}
```

**Message Deletion**:
```typescript
async deleteMessage(messageId, userId) {
  const message = await repository.findById(messageId);
  
  // Only sender can delete
  if (message.senderId !== userId) {
    throw new AppError('Not authorized', 403);
  }
  
  await repository.softDelete(messageId);
}
```

## Input Validation & Sanitization

### express-validator

All user inputs are validated and sanitized:

**Examples**:

**MongoID Validation**:
```typescript
param('userId').isMongoId().withMessage('Invalid user ID')
```

**Content Validation**:
```typescript
body('content')
  .trim()                                    // Remove whitespace
  .notEmpty().withMessage('Required')        // Check not empty
  .isLength({ max: 5000 })                   // Limit length
  .withMessage('Content too long')
```

**Email Validation**:
```typescript
body('email')
  .isEmail().withMessage('Invalid email')
  .normalizeEmail()                          // Sanitize
```

### Validation Middleware

```typescript
export const validateSendMessage = [
  param('conversationId').isMongoId(),
  body('content').trim().notEmpty().isLength({ max: 5000 }),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }
    next();
  },
];
```

## Data Protection

### Sensitive Data Handling

**Redaction in Logs**:
```typescript
const logger = pino({
  redact: {
    paths: ['req.headers.authorization', 'password', 'token'],
    remove: true
  }
});
```

**DTOs for API Responses**:
```typescript
class UserMapper {
  static toDTO(user: IUser): UserDTO {
    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      // Exclude: blockedUsers, deletedAt, internal fields
    };
  }
}
```

### Soft Deletes

Never permanently delete user data:
```typescript
async softDelete(userId: string) {
  await User.findByIdAndUpdate(userId, { 
    deletedAt: new Date() 
  });
}

// Always filter deleted records
User.find({ deletedAt: null });
```

## Security Headers

### Helmet Middleware

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**Headers Set**:
- `X-DNS-Prefetch-Control`
- `X-Frame-Options`
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-XSS-Protection`

## CORS Configuration

```typescript
app.use(cors({
  origin: config.corsOrigin,        // Whitelist origins
  credentials: true,                // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Rate Limiting

### Socket.IO Rate Limiting

Redis-backed rate limiting:
```typescript
const RATE_LIMIT_WINDOW = 60;        // 1 minute
const MAX_EVENTS_PER_WINDOW = 100;   // 100 events/min

async function rateLimit(userId) {
  const key = `ratelimit:socket:${userId}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, RATE_LIMIT_WINDOW);
  }
  
  if (current > MAX_EVENTS_PER_WINDOW) {
    throw new Error('Rate limit exceeded');
  }
}
```

### REST API Rate Limiting

**Recommendation**: Use `express-rate-limit`

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  message: 'Too many requests'
});

app.use('/api/', limiter);
```

## Database Security

### MongoDB Best Practices

1. **Connection String Security**:
   - Use environment variables
   - Never commit credentials
   - Use connection string encryption

2. **Authentication**:
   - Enable MongoDB authentication
   - Use strong passwords
   - Principle of least privilege

3. **Network Security**:
   - Bind to localhost in development
   - Use VPC in production
   - Enable TLS/SSL

4. **Injection Prevention**:
   - Mongoose sanitizes queries
   - Never use `eval()` or `Function()`
   - Validate all inputs

### Redis Security

1. **Authentication**:
   - Require password (`requirepass`)
   - Use ACLs for fine-grained access

2. **Network**:
   - Bind to localhost
   - Use TLS in production
   - Firewall rules

3. **Data Encryption**:
   - Encrypt sensitive data before storing
   - Use Redis encryption at rest

## Error Handling

### Secure Error Messages

**Production**:
```typescript
if (config.nodeEnv === 'production') {
  res.status(500).json({
    message: 'Internal server error'
  });
} else {
  res.status(500).json({
    message: err.message,
    stack: err.stack
  });
}
```

**Never Expose**:
- Stack traces in production
- Database errors
- Internal paths
- Sensitive configuration

## Logging Security

### Pino Configuration

```typescript
const logger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'secret'
    ],
    remove: true
  }
});
```

### Log Rotation

Daily log rotation prevents disk space issues:
```typescript
const transport = pino.transport({
  target: './utils/daily-transport.js',
  options: { 
    destination: './logs/app-%DATE%.log',
    datePattern: 'YYYY-MM-DD'
  }
});
```

## Monitoring & Alerting

### Sentry Integration

Captures errors and performance issues:
```typescript
Sentry.init({
  dsn: config.sentryDsn,
  environment: config.nodeEnv,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Scrub sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.authorization;
    }
    return event;
  }
});
```

## Security Checklist

### Development
- [ ] Use HTTPS in development
- [ ] Never commit secrets
- [ ] Use environment variables
- [ ] Enable CORS properly
- [ ] Validate all inputs
- [ ] Sanitize user content

### Production
- [ ] Enable Helmet middleware
- [ ] Configure CORS whitelist
- [ ] Enable rate limiting
- [ ] Set up Sentry monitoring
- [ ] Enable log aggregation
- [ ] Use TLS/SSL everywhere
- [ ] Enable MongoDB authentication
- [ ] Use Redis password
- [ ] Set secure session cookies
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Enable firewall rules
- [ ] Use VPC/private networks
- [ ] Implement backup strategy

## Compliance

### GDPR Considerations

1. **Right to Access**: Users can retrieve their data
2. **Right to Deletion**: Soft delete with purge option
3. **Data Minimization**: Only collect necessary data
4. **Consent**: Clear privacy policy
5. **Data Portability**: Export user data

### Data Retention

- **Messages**: Soft delete, purge after 30 days
- **Users**: Soft delete, purge after 90 days
- **Logs**: Rotate daily, keep for 30 days
- **Metrics**: Aggregate, keep for 1 year

## Incident Response

### Security Incident Procedure

1. **Detection**: Monitor logs and alerts
2. **Containment**: Isolate affected systems
3. **Investigation**: Analyze logs and traces
4. **Remediation**: Fix vulnerabilities
5. **Recovery**: Restore services
6. **Post-Mortem**: Document and improve

### Contact

Security issues: security@realchat.com

# Logging & Monitoring Documentation

## Logging Stack

### Pino Logger

**Why Pino?**
- Extremely fast (benchmarked fastest Node.js logger)
- Low overhead
- JSON structured logging
- Built-in serializers
- Transport support

### Configuration

**Location**: `src/utils/logger.ts`

```typescript
import pino from 'pino';

const logger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  
  // Redact sensitive data
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'secret'
    ],
    remove: true
  },
  
  // Pretty print in development
  transport: config.nodeEnv !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined
});
```

### Log Levels

```typescript
logger.trace('Trace message');  // Level 10
logger.debug('Debug message');  // Level 20
logger.info('Info message');    // Level 30
logger.warn('Warn message');    // Level 40
logger.error('Error message');  // Level 50
logger.fatal('Fatal message');  // Level 60
```

### Structured Logging

```typescript
// With context
logger.info({ userId, action: 'login' }, 'User logged in');

// With error
logger.error({ err, userId }, 'Failed to send message');

// Output (JSON)
{
  "level": 30,
  "time": 1642512000000,
  "userId": "123",
  "action": "login",
  "msg": "User logged in"
}
```

## Log Rotation

### Daily Transport

**Location**: `src/utils/daily-transport.js`

```javascript
const fs = require('fs');
const path = require('path');

module.exports = async function (opts) {
  const logsDir = path.join(process.cwd(), 'logs');
  
  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Get current date for filename
  const getLogFileName = () => {
    const date = new Date().toISOString().split('T')[0];
    return path.join(logsDir, `app-${date}.log`);
  };
  
  let currentFile = getLogFileName();
  let stream = fs.createWriteStream(currentFile, { flags: 'a' });
  
  // Check for date change every minute
  setInterval(() => {
    const newFile = getLogFileName();
    if (newFile !== currentFile) {
      stream.end();
      currentFile = newFile;
      stream = fs.createWriteStream(currentFile, { flags: 'a' });
    }
  }, 60000);
  
  return {
    write(data) {
      stream.write(data);
    }
  };
};
```

### Log Files

```
logs/
├── app-2024-01-15.log
├── app-2024-01-16.log
└── app-2024-01-17.log
```

## Error Tracking

### Sentry Integration

**Configuration**: `src/config/sentry.ts`

```typescript
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initSentry(): void {
  if (!config.sentryDsn) return;
  
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    
    // Performance monitoring
    tracesSampleRate: 1.0,
    
    // Profiling
    profilesSampleRate: 1.0,
    integrations: [nodeProfilingIntegration()],
    
    // Scrub sensitive data
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.authorization;
      }
      return event;
    }
  });
}
```

### Error Capture

```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error({ err: error }, 'Operation failed');
  Sentry.captureException(error);
  throw error;
}
```

### Custom Context

```typescript
Sentry.setUser({ id: userId, username });
Sentry.setTag('feature', 'messaging');
Sentry.setContext('conversation', { id: conversationId });
```

## Metrics

### Prometheus Integration

**Configuration**: `src/utils/metrics.ts`

```typescript
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

// HTTP Request Duration
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

// HTTP Request Total
export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// WebSocket Connections
export const websocketConnections = new Gauge({
  name: 'websocket_connections',
  help: 'Number of active WebSocket connections'
});

// Message Counter
export const messagesSent = new Counter({
  name: 'messages_sent_total',
  help: 'Total number of messages sent'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(websocketConnections);
register.registerMetric(messagesSent);
```

### Metrics Middleware

```typescript
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path, status_code: res.statusCode },
      duration
    );
    
    httpRequestTotal.inc({
      method: req.method,
      route: req.route?.path,
      status_code: res.statusCode
    });
  });
  
  next();
});
```

### Metrics Endpoint

```
GET /metrics

# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1",method="GET",route="/api/users/me",status_code="200"} 45
http_request_duration_seconds_bucket{le="0.5",method="GET",route="/api/users/me",status_code="200"} 50
http_request_duration_seconds_sum{method="GET",route="/api/users/me",status_code="200"} 12.5
http_request_duration_seconds_count{method="GET",route="/api/users/me",status_code="200"} 50

# HELP websocket_connections Number of active WebSocket connections
# TYPE websocket_connections gauge
websocket_connections 42
```

## Health Checks

### Endpoint

```
GET /health

{
  "status": "ok",
  "uptime": 3600.5
}
```

### Advanced Health Check

```typescript
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      mongodb: 'unknown',
      redis: 'unknown'
    }
  };
  
  // Check MongoDB
  try {
    await mongoose.connection.db.admin().ping();
    health.checks.mongodb = 'ok';
  } catch (err) {
    health.checks.mongodb = 'error';
    health.status = 'degraded';
  }
  
  // Check Redis
  try {
    await redisClient.ping();
    health.checks.redis = 'ok';
  } catch (err) {
    health.checks.redis = 'error';
    health.status = 'degraded';
  }
  
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

## Monitoring Dashboard

### Grafana Setup

**Prometheus Data Source**:
```yaml
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    access: proxy
```

**Example Dashboard Panels**:

1. **HTTP Request Rate**
   ```promql
   rate(http_requests_total[5m])
   ```

2. **HTTP Request Duration (p95)**
   ```promql
   histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
   ```

3. **Active WebSocket Connections**
   ```promql
   websocket_connections
   ```

4. **Messages Sent Rate**
   ```promql
   rate(messages_sent_total[5m])
   ```

## Alerting

### Prometheus Alerts

```yaml
groups:
  - name: realchat
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      # High response time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        annotations:
          summary: "High response time detected"
          
      # MongoDB down
      - alert: MongoDBDown
        expr: up{job="mongodb"} == 0
        for: 1m
        annotations:
          summary: "MongoDB is down"
          
      # Redis down
      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        annotations:
          summary: "Redis is down"
```

### Sentry Alerts

Configure in Sentry UI:
- Error rate threshold
- New issue alerts
- Performance degradation
- Custom metric alerts

## Log Aggregation

### ELK Stack (Recommended)

**Elasticsearch**: Store logs
**Logstash**: Process logs
**Kibana**: Visualize logs

**Logstash Configuration**:
```conf
input {
  file {
    path => "/var/log/realchat/app-*.log"
    codec => json
  }
}

filter {
  # Parse Pino JSON logs
  json {
    source => "message"
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "realchat-%{+YYYY.MM.dd}"
  }
}
```

## Tracing

### OpenTelemetry (Future)

```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new MongoDBInstrumentation()
  ]
});
```

## Best Practices

### 1. Structured Logging
Always use structured logs with context:
```typescript
logger.info({ userId, action }, 'User action');
```

### 2. Log Levels
- **trace**: Very detailed debugging
- **debug**: Debugging information
- **info**: General information
- **warn**: Warning messages
- **error**: Error messages
- **fatal**: Fatal errors

### 3. Sensitive Data
Never log:
- Passwords
- Tokens
- API keys
- Credit card numbers
- Personal identifiable information (PII)

### 4. Performance
- Use async logging
- Avoid logging in hot paths
- Use log levels appropriately

### 5. Correlation IDs
Add request IDs for tracing:
```typescript
app.use((req, res, next) => {
  req.id = generateId();
  logger.info({ requestId: req.id }, 'Request started');
  next();
});
```

## Monitoring Checklist

### Development
- [ ] Configure Pino logger
- [ ] Set up daily log rotation
- [ ] Enable debug logging
- [ ] Test error tracking

### Production
- [ ] Set log level to 'info'
- [ ] Configure Sentry DSN
- [ ] Set up Prometheus scraping
- [ ] Configure Grafana dashboards
- [ ] Set up alerting rules
- [ ] Configure log aggregation (ELK)
- [ ] Set up uptime monitoring
- [ ] Configure backup alerts
- [ ] Test alert notifications
- [ ] Document runbooks

## Troubleshooting

### High Memory Usage
```bash
# Check Node.js memory
node --max-old-space-size=4096 dist/server.js

# Monitor with metrics
GET /metrics | grep nodejs_heap
```

### Slow Queries
```typescript
// Enable MongoDB slow query logging
mongoose.set('debug', true);

// Log slow queries
logger.warn({ query, duration }, 'Slow query detected');
```

### Connection Leaks
```typescript
// Monitor active connections
logger.info({
  mongodb: mongoose.connection.readyState,
  redis: redisClient.status
}, 'Connection status');
```

## Resources

- **Pino**: https://getpino.io
- **Sentry**: https://docs.sentry.io
- **Prometheus**: https://prometheus.io
- **Grafana**: https://grafana.com
- **ELK Stack**: https://www.elastic.co

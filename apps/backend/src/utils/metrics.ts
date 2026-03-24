import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Collect default metrics (CPU, Memory, Event Loop)
client.collectDefaultMetrics({ register, prefix: 'backend_' });

// 1. HTTP Request Latency & Count
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 1.5, 2, 5],
  registers: [register],
});

// 2. WebSocket Connections
export const websocketConnections = new client.Gauge({
  name: 'chat_websocket_connections',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

// 3. Redis Latency
export const redisCommandDurationSeconds = new client.Histogram({
  name: 'redis_command_duration_seconds',
  help: 'Duration of Redis commands in seconds',
  labelNames: ['command'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  registers: [register],
});

// 4. Mongo Query Duration
export const mongoQueryDurationSeconds = new client.Histogram({
  name: 'mongo_query_duration_seconds',
  help: 'Duration of MongoDB queries in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

// 5. App Errors
export const appErrorTotal = new client.Counter({
  name: 'app_error_total',
  help: 'Total number of application errors',
  labelNames: ['type', 'status_code'],
  registers: [register],
});

export default register;

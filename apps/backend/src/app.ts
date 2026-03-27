import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import * as Sentry from '@sentry/node';
import config from './config/env.js';
import logger from './utils/logger.js';
import { initSentry } from './config/sentry.js';
import AppError from './utils/AppError.js';
import register, { httpRequestDurationMicroseconds, appErrorTotal } from './utils/metrics.js';
import { globalLimiter } from './middlewares/rate-limit.middleware.js';

// Initialize Sentry
initSentry();

// Initialize Express App
const app: Application = express();

// Sentry Request Handler (must be the first middleware)
// In open telemetry / Sentry 8+, profiling integration handles much of this.
// Use Sentry.setupExpressErrorHandler(app) which we do later.

import { clerkMiddleware } from '@clerk/express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { testWebhookRoutes, webhookRoutes } from './modules/webhooks/index.js';

// IMPORTANT: Webhook routes MUST come before express.json() middleware
// to preserve raw body for signature verification
app.use(
  "/api/webhooks",
  express.raw({ type: "application/json" }),
  webhookRoutes
);

// // Test webhook endpoint (development only)
// if (process.env.NODE_ENV === 'development') {
//   app.use(
//     "/api/webhooks",
//     express.raw({ type: "application/json" }),
//     testWebhookRoutes
//   );
//   console.log('🧪 Test webhook endpoints enabled');
// }

// Clerk Middleware (populates req.auth)
app.use(clerkMiddleware());

// Swagger API Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Metrics Middleware (HTTP Duration)
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDurationMicroseconds.labels(req.method, req.route ? req.route.path : req.path, String(res.statusCode)).observe(duration);
  });
  next();
});

// Production Hardening: Security headers with Helmet
app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger UI
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for Swagger UI
      imgSrc: ["'self'", "data:", "https:"], // Allow external images
    },
  },
  // HTTP Strict Transport Security (force HTTPS)
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  // Prevent clickjacking
  frameguard: {
    action: 'deny',
  },
  // Disable X-Powered-By header
  hidePoweredBy: true,
  // Enable XSS filter
  xssFilter: true,
  // Prevent MIME type sniffing
  noSniff: true,
}));

// CORS configuration
const allowedOrigins = config.cors.origin.split(",");
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// Production Hardening: Global rate limiting (100 req/15min per IP)
app.use(globalLimiter);

// HTTP Request Logger
if (config.env === 'development') {
  app.use(morgan('dev'));
}

// ===========================================
// Webhook Routes (Before Body Parser)
// ===========================================

// import { handleClerkWebhook } from './jobs/clerk.webhook.js';

// Clerk Webhook (needs raw body for signature verification)
// app.post('/webhook/clerk', express.raw({ type: 'application/json' }), handleClerkWebhook);

// ===========================================
// Body Parser (After Webhooks)
// ===========================================

// Production Hardening: Request size limits (prevents memory exhaustion)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Production Hardening: NoSQL injection protection
// Sanitizes $ and . characters from req.body, req.params, req.query
app.use(mongoSanitize());

// Production Hardening: HTTP Parameter Pollution protection
// Prevents duplicate query parameters (e.g., ?id=1&id=2)
app.use(hpp());

// ===========================================
// Routes
// ===========================================

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Real-Chat API Docs',
}));

// Metrics Endpoint
app.get('/metrics', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
});

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// API Routes
// Production Hardening: API Versioning (v1)
// Allows backward compatibility and non-breaking changes in future versions
import userRoutes from './modules/users/index.js';
import conversationRoutes from './modules/conversations/index.js';
import messageRoutes from './modules/messages/index.js';
import chatRequestRoutes from './modules/chat-requests/index.js';
import presenceRoutes from './modules/presence/index.js';
import uploadRoutes from './modules/uploads/index.js';

app.use('/api/v1/users', userRoutes);
app.use('/api/v1/conversations', conversationRoutes);
app.use('/api/v1', messageRoutes); // Message routes already include /conversations prefix
app.use('/api/v1/chat-requests', chatRequestRoutes);
app.use('/api/v1/presence', presenceRoutes);
app.use('/api/v1/uploads', uploadRoutes);

// ===========================================
// Error Handling
// ===========================================

// Favicon Handler (prevents 404 warnings)
app.get('/favicon.ico', (req: Request, res: Response) => {
  res.status(204).end();
});

// 404 Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Sentry Error Handler
Sentry.setupExpressErrorHandler(app);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Increment Error Metric
  appErrorTotal.labels(String(err.status), String(err.statusCode)).inc();

  // Log error
  if (err.statusCode >= 500) {
    logger.error(err, 'Unhandled Error');
  } else {
    logger.warn({ message: err.message, statusCode: err.statusCode }, 'Operational Error');
  }

  res.status(err.statusCode).json({
    status: err.status,
    error: {
      message: err.message || 'Internal Server Error',
      ...(config.env === 'development' && { stack: err.stack }),
    },
  });
});

export default app;

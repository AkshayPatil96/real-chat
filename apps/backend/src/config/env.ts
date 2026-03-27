import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface Config {
  env: string;
  port: number;
  db: {
    uri: string;
  };
  redis: {
    url: string;
  };
  cors: {
    origin: string;
  };
  sentry: {
    dsn: string;
  };
  clerk: {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
  };
  aws: {
    region: string;
    accessKeyId: string | undefined;
    secretAccessKey: string | undefined;
    s3Bucket: string;
    cloudFrontUrl: string | undefined;
  };
}

/**
 * Centralized configuration module.
 * Validates essential environment variables.
 */
const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  db: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/chat-app',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
  },
  clerk: {
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
    secretKey: process.env.CLERK_SECRET_KEY || '',
    webhookSecret: process.env.CLERK_WEBHOOK_SECRET || '',
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3Bucket: process.env.AWS_S3_BUCKET || '',
    cloudFrontUrl: process.env.AWS_CLOUDFRONT_URL,
  },
};

/**
 * Production Hardening: Environment variable validation
 * Throws clear errors on startup if critical env vars are missing
 */
function validateEnvVars(): void {
  const required: { key: string; value: string | undefined; description: string }[] = [
    { key: 'MONGO_URI', value: process.env.MONGO_URI, description: 'MongoDB connection string' },
    { key: 'CLERK_SECRET_KEY', value: process.env.CLERK_SECRET_KEY, description: 'Clerk authentication secret' },
  ];

  const recommended: { key: string; value: string | undefined; description: string }[] = [
    { key: 'REDIS_URL', value: process.env.REDIS_URL, description: 'Redis connection string for presence' },
    { key: 'CLERK_WEBHOOK_SECRET', value: process.env.CLERK_WEBHOOK_SECRET, description: 'Clerk webhook verification' },
    { key: 'CORS_ORIGIN', value: process.env.CORS_ORIGIN, description: 'CORS whitelist (avoid *)' },
  ];

  // Check required vars
  const missing = required.filter(({ value }) => !value);
  if (missing.length > 0) {
    const missingList = missing.map(({ key, description }) => `  - ${key}: ${description}`).join('\n');
    throw new Error(
      `Missing required environment variables:\n${missingList}\n\nPlease check your .env file or environment configuration.`
    );
  }

  // Warn about recommended vars (only in production)
  if (config.env === 'production') {
    const missingRecommended = recommended.filter(({ value }) => !value);
    if (missingRecommended.length > 0) {
      const warningList = missingRecommended.map(({ key, description }) => `  - ${key}: ${description}`).join('\n');
      console.warn(`\n⚠️  Missing recommended environment variables:\n${warningList}\n`);
    }
  }

  // Validate port is a valid number
  if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}. Must be a number between 1 and 65535.`);
  }
}

// Run validation on module load
validateEnvVars();

export default config;
export { config };

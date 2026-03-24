import { S3Client } from '@aws-sdk/client-s3';
import { config } from '../config/env.js';

/**
 * AWS S3 Client Configuration
 * 
 * Production Hardening Notes:
 * - Credentials loaded from environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * - Region configurable via AWS_REGION env var
 * - Uses AWS SDK v3 for better tree-shaking and performance
 */
export const s3Client = new S3Client({
  region: config.aws.region,
  credentials: config.aws.accessKeyId && config.aws.secretAccessKey
    ? {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      }
    : undefined, // Use default credential provider chain if not provided
});

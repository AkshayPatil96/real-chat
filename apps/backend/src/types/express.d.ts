import { AuthObject } from '@clerk/express';
import { RateLimitInfo } from 'express-rate-limit';

declare global {
  namespace Express {
    interface Request {
      auth: AuthObject;
      userId?: string; // MongoDB user ID (NOT Clerk ID)
      rateLimit?: RateLimitInfo; // Production Hardening: Rate limit metadata
    }
  }
}

export {};
/**
 * Zod Validation Middleware
 * 
 * Provides runtime type safety for API requests
 * - Validates params, query strings, and request bodies
 * - Returns 400 with structured error messages
 * - Prevents invalid data from reaching business logic
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, z, ZodIssue } from 'zod';
import AppError from '../utils/AppError.js';

/**
 * Validation target (where to validate)
 */
type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Format Zod errors into readable error messages
 * 
 * @param error - Zod validation error
 * @returns Formatted error message with field-level details
 */
function formatZodError(error: ZodError): string {
  const errors = error.issues.map((err: ZodIssue) => {
    const field = err.path.join('.');
    return `${field}: ${err.message}`;
  });
  return errors.join(', ');
}

/**
 * Generic validation middleware factory
 * 
 * @param schema - Zod schema to validate against
 * @param target - Which part of the request to validate (body, query, params)
 * @returns Express middleware function
 * 
 * @example
 * router.post('/messages', validate(sendMessageSchema, 'body'), controller.sendMessage);
 */
export const validate = (schema: ZodSchema, target: ValidationTarget = 'body') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate the specified part of the request
      const validated = await schema.parseAsync(req[target]);
      
      // Replace with validated data (coerced types, defaults applied)
      req[target] = validated;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = formatZodError(error);
        return next(new AppError(message, 400));
      }
      next(error);
    }
  };
};

/**
 * Validate multiple targets in a single middleware
 * 
 * @param schemas - Object with schemas for different targets
 * @returns Express middleware function
 * 
 * @example
 * router.get('/messages', validateMultiple({
 *   params: conversationIdSchema,
 *   query: paginationSchema
 * }), controller.getMessages);
 */
export const validateMultiple = (schemas: Partial<Record<ValidationTarget, ZodSchema>>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate each specified target
      for (const [target, schema] of Object.entries(schemas)) {
        if (schema) {
          const validated = await schema.parseAsync(req[target as ValidationTarget]);
          req[target as ValidationTarget] = validated;
        }
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = formatZodError(error);
        return next(new AppError(message, 400));
      }
      next(error);
    }
  };
};

/**
 * Common validation schemas (reusable)
 */

// MongoDB ObjectId validation
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

// Pagination schemas
export const paginationOffsetSchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export const paginationCursorSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

// Common param schemas
export const conversationIdParamSchema = z.object({
  conversationId: objectIdSchema,
});

export const messageIdParamSchema = z.object({
  messageId: objectIdSchema,
});

export const userIdParamSchema = z.object({
  userId: objectIdSchema,
});

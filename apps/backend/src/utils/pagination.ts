/**
 * Cursor-based Pagination Utility
 * 
 * Implements stable, scalable pagination using createdAt + _id as cursor
 * Direction: newest → oldest (reverse chronological, natural for chat)
 * 
 * Key features:
 * - O(1) performance (no skip/offset)
 * - Prevents duplicates during realtime updates
 * - Opaque cursor (base64 encoded)
 * - hasNextPage determined via limit + 1 strategy
 */

import { CursorData, CursorPaginationQuery, PaginatedResponse } from '../types/pagination.types.js';
import AppError from './AppError.js';

/**
 * Encode cursor data to opaque base64 string
 * 
 * @param createdAt - ISO date string
 * @param id - MongoDB ObjectId as string
 * @returns base64 encoded cursor string
 */
export function encodeCursor(createdAt: Date | string, id: string): string {
  const cursorData: CursorData = {
    createdAt: typeof createdAt === 'string' ? createdAt : createdAt.toISOString(),
    _id: id,
  };
  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

/**
 * Decode opaque cursor string to cursor data
 * 
 * @param cursor - base64 encoded cursor string
 * @returns decoded cursor data
 * @throws AppError if cursor is invalid
 */
export function decodeCursor(cursor: string): CursorData {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const cursorData: CursorData = JSON.parse(decoded);

    // Validate cursor structure
    if (!cursorData.createdAt || !cursorData._id) {
      throw new Error('Invalid cursor structure');
    }

    // Validate date is valid ISO string
    const date = new Date(cursorData.createdAt);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date in cursor');
    }

    return cursorData;
  } catch (error) {
    throw new AppError('Invalid pagination cursor', 400);
  }
}

/**
 * Parse and validate pagination parameters
 * 
 * @param cursor - opaque cursor string (optional)
 * @param limit - number of items per page (optional, default: 20, max: 100)
 * @returns validated pagination query options
 */
export function parsePaginationParams(
  cursor?: string,
  limit?: string | number
): CursorPaginationQuery {
  const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;
  
  // Validate limit
  const validatedLimit = Math.min(
    Math.max(parsedLimit || 20, 1), // Default 20, min 1
    100 // Max 100 to prevent abuse
  );

  // Parse cursor if provided
  const decodedCursor = cursor ? decodeCursor(cursor) : undefined;

  return {
    limit: validatedLimit,
    cursor: decodedCursor,
  };
}

/**
 * Build MongoDB query for cursor-based pagination
 * 
 * Supports reverse chronological order (newest first)
 * Query: createdAt < cursor.createdAt OR (createdAt = cursor.createdAt AND _id < cursor._id)
 * 
 * @param cursor - decoded cursor data (optional)
 * @returns MongoDB query object
 */
export function buildCursorQuery(cursor?: CursorData): any {
  if (!cursor) {
    return {}; // No cursor = fetch from beginning
  }

  // Cursor-based query: find records older than cursor position
  // For reverse chronological (newest first):
  // WHERE (createdAt < cursor.createdAt) OR (createdAt = cursor.createdAt AND _id < cursor._id)
  return {
    $or: [
      { createdAt: { $lt: new Date(cursor.createdAt) } },
      {
        createdAt: new Date(cursor.createdAt),
        _id: { $lt: cursor._id },
      },
    ],
  };
}

/**
 * Build paginated response with hasNextPage and nextCursor
 * 
 * Uses limit + 1 strategy:
 * - Fetch limit + 1 items
 * - If we got limit + 1 items, hasNextPage = true
 * - Return only limit items
 * - nextCursor = cursor of last returned item
 * 
 * @param items - fetched items (limit + 1)
 * @param limit - requested limit
 * @param getCursorData - function to extract cursor data from item
 * @returns paginated response
 */
export function buildPaginatedResponse<T extends { createdAt: Date; _id: any }>(
  items: T[],
  limit: number
): PaginatedResponse<T> {
  const hasNextPage = items.length > limit;
  const data = hasNextPage ? items.slice(0, limit) : items;

  const nextCursor =
    hasNextPage && data.length > 0
      ? encodeCursor(data[data.length - 1].createdAt, data[data.length - 1]._id.toString())
      : null;

  return {
    data,
    pagination: {
      hasNextPage,
      nextCursor,
      limit,
    },
  };
}

/**
 * Validate that a model has required pagination indexes
 * 
 * Required compound index: { createdAt: -1, _id: -1 }
 * This supports efficient cursor-based queries
 * 
 * @param model - Mongoose model
 * @param modelName - Model name for error messages
 * @throws Error if required index is missing
 */
export function validatePaginationIndexes(model: any, modelName: string): void {
  const indexes = model.schema.indexes();
  
  const hasRequiredIndex = indexes.some((index: any) => {
    const fields = index[0];
    return (
      fields.createdAt === -1 &&
      fields._id === -1
    );
  });

  if (!hasRequiredIndex) {
    console.warn(
      `[Pagination Warning] ${modelName} is missing compound index { createdAt: -1, _id: -1 }. ` +
      `This will cause slow pagination queries. Add: schema.index({ createdAt: -1, _id: -1 });`
    );
  }
}

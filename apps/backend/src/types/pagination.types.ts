/**
 * Pagination Types
 * 
 * Cursor-based pagination for scalable, real-time chat applications
 * Uses createdAt + _id for stable, deterministic ordering
 */

/**
 * Cursor format: base64 encoded JSON string
 * Example: { "createdAt": "2026-01-31T12:00:00.000Z", "_id": "507f1f77bcf86cd799439011" }
 */
export type CursorData = {
  createdAt: string; // ISO date string
  _id: string; // MongoDB ObjectId as string
};

/**
 * Pagination request parameters
 */
export interface PaginationParams {
  cursor?: string; // Opaque cursor (base64 encoded)
  limit?: number; // Number of items per page (default: 20)
}

/**
 * Pagination response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    hasNextPage: boolean;
    nextCursor: string | null;
    limit: number;
  };
}

/**
 * Internal pagination query options
 */
export interface CursorPaginationQuery {
  limit: number;
  cursor?: CursorData;
}

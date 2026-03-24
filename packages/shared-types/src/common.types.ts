export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total?: number;
  hasMore?: boolean;
}

export type DeliveryState = 'sending' | 'sent' | 'delivered' | 'read';

export type ConversationType = 'direct' | 'group';

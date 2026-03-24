import type { HttpClient, HttpClientConfig, RequestOptions } from './types.js';
import { ApiError } from './errors.js';

export function createClient(config: HttpClientConfig): HttpClient {
  const { baseUrl, getAuthToken, timeout: defaultTimeout = 30000 } = config;

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', headers = {}, body, timeout = defaultTimeout } = options;

    const url = `${baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Attach auth token if available
      const authHeaders: Record<string, string> = {};
      if (getAuthToken) {
        const token = await getAuthToken();
        if (token) {
          authHeaders.Authorization = `Bearer ${token}`;
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorCode: string | undefined;
        let errorDetails: unknown;

        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
          errorCode = errorData.error?.code || errorData.code;
          errorDetails = errorData.error?.details || errorData.details;
        } catch {
          // Response is not JSON, use default error message
        }

        throw new ApiError(response.status, errorMessage, errorCode, errorDetails);
      }

      // Handle empty responses (204, etc.)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError(408, 'Request timeout');
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new ApiError(0, 'Network error: Unable to reach server');
      }

      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Fallback for unknown errors
      throw new ApiError(500, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  return {
    request,
    get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'GET' }),
    post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'POST', body }),
    put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'PUT', body }),
    patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'PATCH', body }),
    delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'DELETE' }),
  };
}

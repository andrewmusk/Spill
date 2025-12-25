'use client';

import { useAuth } from '@clerk/nextjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface ApiResponse<T> {
  data: T;
  meta?: {
    nextCursor?: string;
    traceId?: string;
  };
}

export interface ApiError {
  error: {
    type: string;
    message: string;
    fields?: Record<string, string[]>;
  };
  meta?: {
    traceId?: string;
  };
}

/**
 * Hook to create an API client that automatically includes Clerk auth token
 */
export function useApiClient() {
  const { getToken } = useAuth();

  return {
    async get<T>(path: string): Promise<ApiResponse<T>> {
      const token = await getToken();
      const response = await fetch(`${API_URL}${path}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          error: {
            type: 'UNKNOWN_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
        }));
        throw new Error(error.error.message || 'Request failed');
      }

      return response.json();
    },

    async post<T>(path: string, body: any): Promise<ApiResponse<T>> {
      const token = await getToken();
      const response = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          error: {
            type: 'UNKNOWN_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
        }));
        throw new Error(error.error.message || 'Request failed');
      }

      return response.json();
    },
  };
}

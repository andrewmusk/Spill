import { prisma } from './prisma.js';

/**
 * Pagination utilities
 */
export interface PaginationOptions {
  cursor?: string;
  limit?: number;
  maxLimit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function validatePaginationParams(
  options: PaginationOptions
): { cursor?: string; limit: number } {
  const maxLimit = options.maxLimit || 100;
  const defaultLimit = 20;
  
  const limit = Math.min(
    Math.max(1, options.limit || defaultLimit),
    maxLimit
  );

  return {
    cursor: options.cursor,
    limit,
  };
}

export function createPaginatedResult<T extends { id: string }>(
  data: T[],
  requestedLimit: number
): PaginatedResult<T> {
  const hasMore = data.length > requestedLimit;
  const items = hasMore ? data.slice(0, -1) : data;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.id : null;

  return {
    data: items,
    nextCursor,
    hasMore,
  };
}

/**
 * Transaction utilities
 */
export async function runInTransaction<T>(
  operations: (tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(operations);
}

/**
 * Query building utilities
 */
export interface CursorPaginationOptions {
  cursor?: string;
  limit: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

export function buildCursorQuery(options: CursorPaginationOptions) {
  const { cursor, limit, orderBy = { createdAt: 'desc' } } = options;
  
  return {
    take: limit + 1, // Take one extra to check if there are more results
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor },
    }),
    orderBy,
  };
}

/**
 * Time utilities for database queries
 */
export function getTimeRangeFilter(
  timeRange: 'hour' | 'day' | 'week' | 'month' | 'year'
): Date {
  const now = new Date();
  
  switch (timeRange) {
    case 'hour':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case 'day':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      throw new Error(`Invalid time range: ${timeRange}`);
  }
}

/**
 * Search utilities
 */
export function buildSearchFilter(
  query: string,
  fields: string[]
): { OR: Array<Record<string, { contains: string; mode: 'insensitive' }>> } {
  const searchTerms = query.trim().split(/\s+/).filter(term => term.length > 0);
  
  if (searchTerms.length === 0) {
    return { OR: [] };
  }

  return {
    OR: searchTerms.flatMap(term =>
      fields.map(field => ({
        [field]: {
          contains: term,
          mode: 'insensitive' as const,
        },
      }))
    ),
  };
}

/**
 * Batch operation utilities
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize = 100
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Soft delete utilities (if needed in the future)
 */
export function buildSoftDeleteFilter(includeSoftDeleted = false) {
  if (includeSoftDeleted) {
    return {};
  }
  
  return {
    deletedAt: null,
  };
}

/**
 * Health check utilities
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;
    
    return {
      connected: true,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      connected: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Query logging utilities
 */
export function logSlowQuery(query: string, duration: number, threshold = 1000) {
  if (duration > threshold) {
    console.warn(`Slow query detected (${duration}ms):`, query);
  }
} 
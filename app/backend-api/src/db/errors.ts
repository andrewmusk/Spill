import { Prisma } from '../../generated/prisma';

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class NotFoundError extends DatabaseError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND');
  }
}

export class ConflictError extends DatabaseError {
  constructor(message: string, public field?: string) {
    super(message, 'CONFLICT');
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

/**
 * Maps Prisma errors to domain-specific errors
 */
export function mapPrismaError(error: unknown): DatabaseError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = error.meta?.target as string;
        return new ConflictError(
          `A record with this ${field} already exists`,
          field
        );
      
      case 'P2025':
        // Record not found
        return new NotFoundError('Record');
      
      case 'P2003':
        // Foreign key constraint violation
        return new ValidationError('Referenced record does not exist');
      
      case 'P2014':
        // Required relation violation
        return new ValidationError('Required relation is missing');
      
      default:
        return new DatabaseError(
          `Database operation failed: ${error.message}`,
          error.code,
          error
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new ValidationError(error.message);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new DatabaseError(
      'Database connection failed',
      'CONNECTION_ERROR',
      error
    );
  }

  // Unknown error
  return new DatabaseError(
    error instanceof Error ? error.message : 'Unknown database error',
    'UNKNOWN_ERROR',
    error
  );
}

/**
 * Wrapper for database operations that handles error mapping
 */
export async function withErrorMapping<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapPrismaError(error);
  }
} 
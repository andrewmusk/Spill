import { ValidationError } from '../../db/errors.js';

/**
 * General utility validations
 */
export class GeneralValidations {
  static validatePaginationParams(cursor?: string, limit?: number, maxLimit = 100): { cursor?: string; limit: number } {
    let validatedLimit = 20; // default
    
    if (limit !== undefined) {
      if (typeof limit !== 'number' || limit < 1) {
        throw new ValidationError('Limit must be a positive number');
      }
      
      if (limit > maxLimit) {
        throw new ValidationError(`Limit cannot exceed ${maxLimit}`);
      }
      
      validatedLimit = limit;
    }

    if (cursor !== undefined && (typeof cursor !== 'string' || cursor.trim().length === 0)) {
      throw new ValidationError('Cursor must be a non-empty string');
    }

    return {
      cursor,
      limit: validatedLimit,
    };
  }

  static validateSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      throw new ValidationError('Search query is required and must be a string');
    }
    
    const trimmedQuery = query.trim();
    
    if (trimmedQuery.length === 0) {
      throw new ValidationError('Search query cannot be empty or only whitespace');
    }
    
    if (trimmedQuery.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters long');
    }
    
    if (trimmedQuery.length > 100) {
      throw new ValidationError('Search query must be no more than 100 characters long');
    }
    
    return trimmedQuery;
  }

  static validateId(id: string, resourceName: string): void {
    if (!id || typeof id !== 'string') {
      throw new ValidationError(`${resourceName} ID is required and must be a string`);
    }
    
    if (id.trim().length === 0) {
      throw new ValidationError(`${resourceName} ID cannot be empty or only whitespace`);
    }
  }

  static validateIds(ids: string[], resourceName: string): void {
    if (!Array.isArray(ids)) {
      throw new ValidationError(`${resourceName} IDs must be an array`);
    }
    
    if (ids.length === 0) {
      throw new ValidationError(`${resourceName} IDs array cannot be empty`);
    }
    
    ids.forEach((id, index) => {
      if (!id || typeof id !== 'string') {
        throw new ValidationError(`${resourceName} ID at index ${index} is required and must be a string`);
      }
      
      if (id.trim().length === 0) {
        throw new ValidationError(`${resourceName} ID at index ${index} cannot be empty or only whitespace`);
      }
    });
  }
} 
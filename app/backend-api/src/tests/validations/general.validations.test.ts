import { describe, it, expect } from 'vitest';
import { ValidationError } from '../../db/errors.js';
import { GeneralValidations } from '../../lib/validations/general.validations.js';

describe('GeneralValidations', () => {
  describe('validatePaginationParams', () => {
    it('should accept valid pagination params', () => {
      const result1 = GeneralValidations.validatePaginationParams();
      expect(result1).toEqual({ cursor: undefined, limit: 20 });

      const result2 = GeneralValidations.validatePaginationParams('cursor123', 50);
      expect(result2).toEqual({ cursor: 'cursor123', limit: 50 });

      const result3 = GeneralValidations.validatePaginationParams(undefined, 10, 200);
      expect(result3).toEqual({ cursor: undefined, limit: 10 });
    });

    it('should reject invalid pagination params', () => {
      const invalidCases = [
        { cursor: undefined, limit: 0, error: 'Limit must be a positive number' },
        { cursor: undefined, limit: -1, error: 'Limit must be a positive number' },
        { cursor: undefined, limit: 101, error: 'Limit cannot exceed 100' },
        { cursor: '', limit: undefined, error: 'Cursor must be a non-empty string' },
        { cursor: '   ', limit: undefined, error: 'Cursor must be a non-empty string' }
      ];

      invalidCases.forEach(({ cursor, limit, error }) => {
        expect(() => GeneralValidations.validatePaginationParams(cursor, limit))
          .toThrow(new ValidationError(error));
      });
    });

    it('should respect custom maxLimit', () => {
      expect(() => GeneralValidations.validatePaginationParams(undefined, 150, 200))
        .not.toThrow();

      expect(() => GeneralValidations.validatePaginationParams(undefined, 250, 200))
        .toThrow(new ValidationError('Limit cannot exceed 200'));
    });
  });

  describe('validateSearchQuery', () => {
    it('should accept valid search queries', () => {
      const validQueries = ['test', 'search query', 'user123', 'A'.repeat(100)];
      
      validQueries.forEach(query => {
        const result = GeneralValidations.validateSearchQuery(query);
        expect(result).toBe(query.trim());
      });
    });

    it('should trim search queries', () => {
      const result = GeneralValidations.validateSearchQuery('  search  ');
      expect(result).toBe('search');
    });

    it('should reject invalid search queries', () => {
      const invalidCases = [
        { value: '', error: 'Search query is required and must be a string' },
        { value: '   ', error: 'Search query cannot be empty or only whitespace' },
        { value: 'a', error: 'Search query must be at least 2 characters long' },
        { value: 'A'.repeat(101), error: 'Search query must be no more than 100 characters long' },
        { value: null, error: 'Search query is required and must be a string' },
        { value: undefined, error: 'Search query is required and must be a string' },
        { value: 123, error: 'Search query is required and must be a string' }
      ];

      invalidCases.forEach(({ value, error }) => {
        expect(() => GeneralValidations.validateSearchQuery(value as any))
          .toThrow(new ValidationError(error));
      });
    });
  });

  describe('validateId', () => {
    it('should accept valid IDs', () => {
      expect(() => GeneralValidations.validateId('valid-id-123', 'User')).not.toThrow();
      expect(() => GeneralValidations.validateId('another_id', 'Poll')).not.toThrow();
    });

    it('should reject invalid IDs', () => {
      const invalidCases = [
        { id: '', resource: 'User', error: 'User ID is required and must be a string' },
        { id: '   ', resource: 'User', error: 'User ID cannot be empty or only whitespace' },
        { id: null as any, resource: 'Poll', error: 'Poll ID is required and must be a string' },
        { id: undefined as any, resource: 'Vote', error: 'Vote ID is required and must be a string' },
        { id: 123 as any, resource: 'User', error: 'User ID is required and must be a string' }
      ];

      invalidCases.forEach(({ id, resource, error }) => {
        expect(() => GeneralValidations.validateId(id, resource))
          .toThrow(new ValidationError(error));
      });
    });
  });

  describe('validateIds', () => {
    it('should accept valid ID arrays', () => {
      expect(() => GeneralValidations.validateIds(['id1', 'id2', 'id3'], 'User')).not.toThrow();
      expect(() => GeneralValidations.validateIds(['single-id'], 'Poll')).not.toThrow();
    });

    it('should reject invalid ID arrays', () => {
      const invalidCases = [
        { ids: 'not an array' as any, resource: 'User', error: 'User IDs must be an array' },
        { ids: [], resource: 'Poll', error: 'Poll IDs array cannot be empty' },
        { ids: ['valid', '', 'also-valid'], resource: 'User', error: 'User ID at index 1 is required and must be a string' },
        { ids: ['valid', null, 'also-valid'] as any, resource: 'Vote', error: 'Vote ID at index 1 is required and must be a string' },
        { ids: [123, 'valid'] as any, resource: 'Poll', error: 'Poll ID at index 0 is required and must be a string' }
      ];

      invalidCases.forEach(({ ids, resource, error }) => {
        expect(() => GeneralValidations.validateIds(ids, resource))
          .toThrow(new ValidationError(error));
      });
    });
  });
}); 
import { describe, it, expect } from 'vitest';
import { ValidationError } from '../../db/errors.js';
import { UserValidations } from '../../lib/validations/user.validations.js';

describe('UserValidations', () => {
  describe('validateHandle', () => {
    it('should accept valid handles', () => {
      const validHandles = [
        'user123',
        'test_user',
        'user-name',
        'a1',
        'username',
        'test123_user',
        'user_123-test'
      ];

      validHandles.forEach(handle => {
        expect(() => UserValidations.validateHandle(handle)).not.toThrow();
      });
    });

    it('should reject invalid handles', () => {
      const invalidCases = [
        { value: '', error: 'Handle is required and must be a string' },
        { value: 'a', error: 'Handle must be at least 2 characters long' },
        { value: 'x'.repeat(51), error: 'Handle must be no more than 50 characters long' },
        { value: '_user', error: 'Handle must start with a letter or number' },
        { value: '-user', error: 'Handle must start with a letter or number' },
        { value: 'user space', error: 'Handle can only contain letters, numbers, underscores, and hyphens' },
        { value: 'user@domain', error: 'Handle can only contain letters, numbers, underscores, and hyphens' },
        { value: 'user.name', error: 'Handle can only contain letters, numbers, underscores, and hyphens' },
        { value: 'user!', error: 'Handle can only contain letters, numbers, underscores, and hyphens' }
      ];

      invalidCases.forEach(({ value, error }) => {
        expect(() => UserValidations.validateHandle(value))
          .toThrow(new ValidationError(error));
      });
    });

    it('should reject non-string handles', () => {
      const nonStrings = [null, undefined, 123, {}, [], true];
      
      nonStrings.forEach(value => {
        expect(() => UserValidations.validateHandle(value as any))
          .toThrow(new ValidationError('Handle is required and must be a string'));
      });
    });
  });

  describe('validateDisplayName', () => {
    it('should accept valid display names', () => {
      const validNames = [
        'John Doe',
        'Alice Smith',
        'User Name With Spaces',
        'Name with émojis 🚀',
        'A'.repeat(100), // Max length
      ];

      validNames.forEach(name => {
        expect(() => UserValidations.validateDisplayName(name)).not.toThrow();
      });
    });

    it('should accept null and undefined display names', () => {
      expect(() => UserValidations.validateDisplayName(null)).not.toThrow();
      expect(() => UserValidations.validateDisplayName(undefined)).not.toThrow();
    });

    it('should reject invalid display names', () => {
      const invalidCases = [
        { value: '', error: 'Display name cannot be empty or only whitespace' },
        { value: '   ', error: 'Display name cannot be empty or only whitespace' },
        { value: '\t\n', error: 'Display name cannot be empty or only whitespace' },
        { value: 'A'.repeat(101), error: 'Display name must be no more than 100 characters long' },
        { value: 123, error: 'Display name must be a string' },
        { value: {}, error: 'Display name must be a string' }
      ];

      invalidCases.forEach(({ value, error }) => {
        expect(() => UserValidations.validateDisplayName(value as any))
          .toThrow(new ValidationError(error));
      });
    });
  });

  describe('validateUserIds', () => {
    it('should accept valid different user IDs', () => {
      expect(() => UserValidations.validateUserIds('user1', 'user2', 'follow')).not.toThrow();
    });

    it('should reject same user IDs', () => {
      expect(() => UserValidations.validateUserIds('user1', 'user1', 'follow'))
        .toThrow(new ValidationError('Cannot follow yourself'));
    });

    it('should reject empty user IDs', () => {
      expect(() => UserValidations.validateUserIds('', 'user2', 'follow'))
        .toThrow(new ValidationError('Both user IDs are required for follow'));
      
      expect(() => UserValidations.validateUserIds('user1', '', 'follow'))
        .toThrow(new ValidationError('Both user IDs are required for follow'));
    });

    it('should use custom operation name in error messages', () => {
      expect(() => UserValidations.validateUserIds('user1', 'user1', 'block'))
        .toThrow(new ValidationError('Cannot block yourself'));
      
      expect(() => UserValidations.validateUserIds('user1', 'user1', 'mute'))
        .toThrow(new ValidationError('Cannot mute yourself'));
    });
  });
}); 
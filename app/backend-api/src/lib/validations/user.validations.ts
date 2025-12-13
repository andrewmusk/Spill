import { ValidationError } from '../../db/errors.js';

/**
 * User validation functions
 */
export class UserValidations {
  static validateHandle(handle: string): void {
    if (!handle || typeof handle !== 'string') {
      throw new ValidationError('Handle is required and must be a string');
    }
    
    if (handle.length < 2) {
      throw new ValidationError('Handle must be at least 2 characters long');
    }
    
    if (handle.length > 50) {
      throw new ValidationError('Handle must be no more than 50 characters long');
    }
    
    // Allow letters, numbers, underscores, and hyphens
    if (!/^[a-zA-Z0-9_-]+$/.test(handle)) {
      throw new ValidationError('Handle can only contain letters, numbers, underscores, and hyphens');
    }
    
    // Must start with a letter or number
    if (!/^[a-zA-Z0-9]/.test(handle)) {
      throw new ValidationError('Handle must start with a letter or number');
    }
  }

  static validateDisplayName(displayName: string | null | undefined): void {
    if (displayName !== null && displayName !== undefined) {
      if (typeof displayName !== 'string') {
        throw new ValidationError('Display name must be a string');
      }
      
      if (displayName.length > 100) {
        throw new ValidationError('Display name must be no more than 100 characters long');
      }
      
      if (displayName.trim().length === 0) {
        throw new ValidationError('Display name cannot be empty or only whitespace');
      }
    }
  }

  static validateUserIds(userId1: string, userId2: string, operation: string): void {
    if (!userId1 || !userId2) {
      throw new ValidationError(`Both user IDs are required for ${operation}`);
    }
    
    if (userId1 === userId2) {
      throw new ValidationError(`Cannot ${operation} yourself`);
    }
  }
} 
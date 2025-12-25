/**
 * Pure data integrity check functions
 * No Prisma, no side effects - just validation logic
 */

/**
 * Validate poll question
 */
export function validateQuestion(question: string): void {
  if (!question || typeof question !== 'string') {
    throw new Error('Poll question is required and must be a string');
  }

  if (question.trim().length === 0) {
    throw new Error('Poll question cannot be empty or only whitespace');
  }

  if (question.length > 500) {
    throw new Error('Poll question must be no more than 500 characters long');
  }
}

/**
 * Validate handle format
 */
export function validateHandle(handle: string): void {
  if (!handle || typeof handle !== 'string') {
    throw new Error('Handle is required and must be a string');
  }

  if (handle.length < 2) {
    throw new Error('Handle must be at least 2 characters long');
  }

  if (handle.length > 50) {
    throw new Error('Handle must be no more than 50 characters long');
  }

  // Allow letters, numbers, underscores, and hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(handle)) {
    throw new Error('Handle can only contain letters, numbers, underscores, and hyphens');
  }

  // Must start with a letter or number
  if (!/^[a-zA-Z0-9]/.test(handle)) {
    throw new Error('Handle must start with a letter or number');
  }
}

/**
 * Validate display name
 */
export function validateDisplayName(displayName: string | null | undefined): void {
  if (displayName !== null && displayName !== undefined) {
    if (typeof displayName !== 'string') {
      throw new Error('Display name must be a string');
    }

    if (displayName.length > 100) {
      throw new Error('Display name must be no more than 100 characters long');
    }

    if (displayName.trim().length === 0) {
      throw new Error('Display name cannot be empty or only whitespace');
    }
  }
}

/**
 * Validate user IDs for operations
 */
export function validateUserIds(userId1: string, userId2: string, operation: string): void {
  if (!userId1 || !userId2) {
    throw new Error(`Both user IDs are required for ${operation}`);
  }

  if (userId1 === userId2) {
    throw new Error(`Cannot ${operation} yourself`);
  }
}

/**
 * Validate slider value is within range
 */
export function validateSliderValue(
  value: number,
  minValue: number | null,
  maxValue: number | null
): void {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Slider value must be a valid number');
  }

  if (minValue !== null && value < minValue) {
    throw new Error(`Value must be at least ${minValue}`);
  }

  if (maxValue !== null && value > maxValue) {
    throw new Error(`Value must be at most ${maxValue}`);
  }
}

/**
 * Validate poll expiration date
 */
export function validatePollExpiration(expiresAt: Date | null | undefined): void {
  if (expiresAt !== null && expiresAt !== undefined) {
    if (!(expiresAt instanceof Date)) {
      throw new Error('expiresAt must be a valid Date object');
    }

    if (expiresAt <= new Date()) {
      throw new Error('Poll expiration date must be in the future');
    }

    // Don't allow polls to expire more than 1 year in the future
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    if (expiresAt > oneYearFromNow) {
      throw new Error('Poll expiration date cannot be more than 1 year in the future');
    }
  }
}

/**
 * Validate media URLs
 */
export function validateMediaUrls(mediaUrls: string[] | null | undefined): void {
  if (mediaUrls !== null && mediaUrls !== undefined) {
    if (!Array.isArray(mediaUrls)) {
      throw new Error('mediaUrls must be an array');
    }

    if (mediaUrls.length > 4) {
      throw new Error('Cannot have more than 4 media URLs');
    }

    mediaUrls.forEach((url, index) => {
      if (typeof url !== 'string') {
        throw new Error(`Media URL ${index + 1} must be a string`);
      }

      if (url.trim().length === 0) {
        throw new Error(`Media URL ${index + 1} cannot be empty`);
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch {
        throw new Error(`Media URL ${index + 1} is not a valid URL`);
      }
    });
  }
}


import { ValidationError } from '../../db/errors.js';
import type { CreatePollData } from '../../db/index.js';

/**
 * Poll validation functions
 */
export class PollValidations {
  static validateQuestion(question: string): void {
    if (!question || typeof question !== 'string') {
      throw new ValidationError('Poll question is required and must be a string');
    }
    
    if (question.trim().length === 0) {
      throw new ValidationError('Poll question cannot be empty or only whitespace');
    }
    
    if (question.length > 500) {
      throw new ValidationError('Poll question must be no more than 500 characters long');
    }
  }

  static validateDiscretePollData(data: CreatePollData): void {
    if (data.isContinuous) {
      return; // Skip validation for continuous polls
    }

    if (!data.selectionType) {
      throw new ValidationError('Discrete polls require a selection type');
    }

    if (!data.options || data.options.length < 2) {
      throw new ValidationError('Discrete polls require at least 2 options');
    }

    if (data.options.length > 10) {
      throw new ValidationError('Discrete polls cannot have more than 10 options');
    }

    // Validate each option
    data.options.forEach((option, index) => {
      if (!option.text || typeof option.text !== 'string') {
        throw new ValidationError(`Option ${index + 1} text is required and must be a string`);
      }
      
      if (option.text.trim().length === 0) {
        throw new ValidationError(`Option ${index + 1} cannot be empty or only whitespace`);
      }
      
      if (option.text.length > 200) {
        throw new ValidationError(`Option ${index + 1} must be no more than 200 characters long`);
      }
      
      if (typeof option.position !== 'number' || option.position < 1) {
        throw new ValidationError(`Option ${index + 1} must have a valid position (positive number)`);
      }
    });

    // Check for duplicate positions
    const positions = data.options.map(opt => opt.position);
    const uniquePositions = new Set(positions);
    if (positions.length !== uniquePositions.size) {
      throw new ValidationError('Options cannot have duplicate positions');
    }

    // Check for duplicate option texts
    const texts = data.options.map(opt => opt.text.trim().toLowerCase());
    const uniqueTexts = new Set(texts);
    if (texts.length !== uniqueTexts.size) {
      throw new ValidationError('Options cannot have duplicate text');
    }

    // Validate maxSelections for MULTIPLE selection type
    if (data.selectionType === 'MULTIPLE') {
      if (!data.maxSelections || data.maxSelections < 1) {
        throw new ValidationError('Multiple selection polls require maxSelections to be at least 1');
      }
      
      if (data.maxSelections > data.options.length) {
        throw new ValidationError('maxSelections cannot be greater than the number of options');
      }
    }

    // Ensure continuous poll fields are not set
    if (data.minValue !== undefined || data.maxValue !== undefined || data.step !== undefined) {
      throw new ValidationError('Discrete polls cannot have minValue, maxValue, or step');
    }
  }

  static validateContinuousPollData(data: CreatePollData): void {
    if (!data.isContinuous) {
      return; // Skip validation for discrete polls
    }

    if (data.minValue === undefined || data.maxValue === undefined) {
      throw new ValidationError('Continuous polls require both minValue and maxValue');
    }

    if (typeof data.minValue !== 'number' || typeof data.maxValue !== 'number') {
      throw new ValidationError('minValue and maxValue must be numbers');
    }

    if (data.minValue >= data.maxValue) {
      throw new ValidationError('minValue must be less than maxValue');
    }

    if (data.step !== undefined) {
      if (typeof data.step !== 'number' || data.step <= 0) {
        throw new ValidationError('step must be a positive number');
      }
      
      if (data.step > (data.maxValue - data.minValue)) {
        throw new ValidationError('step cannot be larger than the range (maxValue - minValue)');
      }
    }

    // Ensure discrete poll fields are not set
    if (data.options && data.options.length > 0) {
      throw new ValidationError('Continuous polls cannot have options');
    }
    
    if (data.selectionType !== undefined) {
      throw new ValidationError('Continuous polls cannot have a selection type');
    }
    
    if (data.maxSelections !== undefined) {
      throw new ValidationError('Continuous polls cannot have maxSelections');
    }
  }

  static validateSliderValue(value: number, minValue: number | null, maxValue: number | null): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new ValidationError('Slider value must be a valid number');
    }

    if (minValue !== null && value < minValue) {
      throw new ValidationError(`Value must be at least ${minValue}`);
    }

    if (maxValue !== null && value > maxValue) {
      throw new ValidationError(`Value must be at most ${maxValue}`);
    }
  }

  static validatePollExpiration(expiresAt: Date | null | undefined): void {
    if (expiresAt !== null && expiresAt !== undefined) {
      if (!(expiresAt instanceof Date)) {
        throw new ValidationError('expiresAt must be a valid Date object');
      }
      
      if (expiresAt <= new Date()) {
        throw new ValidationError('Poll expiration date must be in the future');
      }
      
      // Don't allow polls to expire more than 1 year in the future
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      
      if (expiresAt > oneYearFromNow) {
        throw new ValidationError('Poll expiration date cannot be more than 1 year in the future');
      }
    }
  }

  static validateMediaUrls(mediaUrls: string[] | null | undefined): void {
    if (mediaUrls !== null && mediaUrls !== undefined) {
      if (!Array.isArray(mediaUrls)) {
        throw new ValidationError('mediaUrls must be an array');
      }
      
      if (mediaUrls.length > 4) {
        throw new ValidationError('Cannot have more than 4 media URLs');
      }
      
      mediaUrls.forEach((url, index) => {
        if (typeof url !== 'string') {
          throw new ValidationError(`Media URL ${index + 1} must be a string`);
        }
        
        if (url.trim().length === 0) {
          throw new ValidationError(`Media URL ${index + 1} cannot be empty`);
        }
        
        // Basic URL validation
        try {
          new URL(url);
        } catch {
          throw new ValidationError(`Media URL ${index + 1} is not a valid URL`);
        }
      });
    }
  }
} 
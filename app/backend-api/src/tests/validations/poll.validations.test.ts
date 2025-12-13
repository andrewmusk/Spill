import { describe, it, expect } from 'vitest';
import { ValidationError } from '../../db/errors.js';
import { PollValidations } from '../../lib/validations/poll.validations.js';

describe('PollValidations', () => {
  describe('validateQuestion', () => {
    it('should accept valid questions', () => {
      const validQuestions = [
        'What is your favorite color?',
        'Rate this movie',
        'A'.repeat(500), // Max length
        'Question with émojis 🤔?'
      ];

      validQuestions.forEach(question => {
        expect(() => PollValidations.validateQuestion(question)).not.toThrow();
      });
    });

    it('should reject invalid questions', () => {
      const invalidCases = [
        { value: '', error: 'Poll question is required and must be a string' },
        { value: '   ', error: 'Poll question cannot be empty or only whitespace' },
        { value: '\t\n', error: 'Poll question cannot be empty or only whitespace' },
        { value: 'A'.repeat(501), error: 'Poll question must be no more than 500 characters long' },
        { value: null, error: 'Poll question is required and must be a string' },
        { value: undefined, error: 'Poll question is required and must be a string' },
        { value: 123, error: 'Poll question is required and must be a string' }
      ];

      invalidCases.forEach(({ value, error }) => {
        expect(() => PollValidations.validateQuestion(value as any))
          .toThrow(new ValidationError(error));
      });
    });
  });

  describe('validateDiscretePollData', () => {
    it('should accept valid discrete poll data', () => {
      const validData = {
        ownerId: 'user1',
        question: 'Test question?',
        isContinuous: false,
        selectionType: 'SINGLE' as const,
        visibility: 'PUBLIC' as const,
        options: [
          { text: 'Option 1', position: 1 },
          { text: 'Option 2', position: 2 }
        ]
      };

      expect(() => PollValidations.validateDiscretePollData(validData)).not.toThrow();
    });

    it('should accept valid multiple selection poll', () => {
      const validData = {
        ownerId: 'user1',
        question: 'Test question?',
        isContinuous: false,
        selectionType: 'MULTIPLE' as const,
        maxSelections: 2,
        visibility: 'PUBLIC' as const,
        options: [
          { text: 'Option 1', position: 1 },
          { text: 'Option 2', position: 2 },
          { text: 'Option 3', position: 3 }
        ]
      };

      expect(() => PollValidations.validateDiscretePollData(validData)).not.toThrow();
    });

    it('should skip validation for continuous polls', () => {
      const continuousData = {
        ownerId: 'user1',
        question: 'Test question?',
        isContinuous: true,
        minValue: 1,
        maxValue: 10
      };

      expect(() => PollValidations.validateDiscretePollData(continuousData)).not.toThrow();
    });

    it('should reject discrete polls without selection type', () => {
      const invalidData = {
        ownerId: 'user1',
        question: 'Test question?',
        isContinuous: false,
        options: [
          { text: 'Option 1', position: 1 },
          { text: 'Option 2', position: 2 }
        ]
      };

      expect(() => PollValidations.validateDiscretePollData(invalidData))
        .toThrow(new ValidationError('Discrete polls require a selection type'));
    });

    it('should reject discrete polls with fewer than 2 options', () => {
      const invalidData = {
        ownerId: 'user1',
        question: 'Test question?',
        isContinuous: false,
        selectionType: 'SINGLE' as const,
        options: [{ text: 'Only option', position: 1 }]
      };

      expect(() => PollValidations.validateDiscretePollData(invalidData))
        .toThrow(new ValidationError('Discrete polls require at least 2 options'));
    });

    it('should reject discrete polls with more than 10 options', () => {
      const options = Array.from({ length: 11 }, (_, i) => ({ 
        text: `Option ${i + 1}`, 
        position: i + 1 
      }));

      const invalidData = {
        ownerId: 'user1',
        question: 'Test question?',
        isContinuous: false,
        selectionType: 'SINGLE' as const,
        options
      };

      expect(() => PollValidations.validateDiscretePollData(invalidData))
        .toThrow(new ValidationError('Discrete polls cannot have more than 10 options'));
    });

    it('should reject options with invalid text', () => {
      const invalidCases = [
        {
          options: [{ text: '', position: 1 }, { text: 'Valid', position: 2 }],
          error: 'Option 1 text is required and must be a string'
        },
        {
          options: [{ text: '   ', position: 1 }, { text: 'Valid', position: 2 }],
          error: 'Option 1 cannot be empty or only whitespace'
        },
        {
          options: [{ text: 'A'.repeat(201), position: 1 }, { text: 'Valid', position: 2 }],
          error: 'Option 1 must be no more than 200 characters long'
        }
      ];

      invalidCases.forEach(({ options, error }) => {
        const invalidData = {
          ownerId: 'user1',
          question: 'Test question?',
          isContinuous: false,
          selectionType: 'SINGLE' as const,
          options
        };

        expect(() => PollValidations.validateDiscretePollData(invalidData))
          .toThrow(new ValidationError(error));
      });
    });

    it('should reject duplicate option positions', () => {
      const invalidData = {
        ownerId: 'user1',
        question: 'Test question?',
        isContinuous: false,
        selectionType: 'SINGLE' as const,
        options: [
          { text: 'Option 1', position: 1 },
          { text: 'Option 2', position: 1 } // Duplicate position
        ]
      };

      expect(() => PollValidations.validateDiscretePollData(invalidData))
        .toThrow(new ValidationError('Options cannot have duplicate positions'));
    });

    it('should reject duplicate option texts', () => {
      const invalidData = {
        ownerId: 'user1',
        question: 'Test question?',
        isContinuous: false,
        selectionType: 'SINGLE' as const,
        options: [
          { text: 'Same Option', position: 1 },
          { text: 'Same Option', position: 2 } // Duplicate text
        ]
      };

      expect(() => PollValidations.validateDiscretePollData(invalidData))
        .toThrow(new ValidationError('Options cannot have duplicate text'));
    });

    it('should validate maxSelections for MULTIPLE polls', () => {
      const invalidCases = [
        {
          data: {
            ownerId: 'user1',
            question: 'Test question?',
            isContinuous: false,
            selectionType: 'MULTIPLE' as const,
            options: [
              { text: 'Option 1', position: 1 },
              { text: 'Option 2', position: 2 }
            ]
          },
          error: 'Multiple selection polls require maxSelections to be at least 1'
        },
        {
          data: {
            ownerId: 'user1',
            question: 'Test question?',
            isContinuous: false,
            selectionType: 'MULTIPLE' as const,
            maxSelections: 3,
            options: [
              { text: 'Option 1', position: 1 },
              { text: 'Option 2', position: 2 }
            ]
          },
          error: 'maxSelections cannot be greater than the number of options'
        }
      ];

      invalidCases.forEach(({ data, error }) => {
        expect(() => PollValidations.validateDiscretePollData(data))
          .toThrow(new ValidationError(error));
      });
    });

    it('should reject continuous poll fields on discrete polls', () => {
      const invalidData = {
        ownerId: 'user1',
        question: 'Test question?',
        isContinuous: false,
        selectionType: 'SINGLE' as const,
        minValue: 1,
        maxValue: 10,
        options: [
          { text: 'Option 1', position: 1 },
          { text: 'Option 2', position: 2 }
        ]
      };

      expect(() => PollValidations.validateDiscretePollData(invalidData))
        .toThrow(new ValidationError('Discrete polls cannot have minValue, maxValue, or step'));
    });
  });

  describe('validateContinuousPollData', () => {
    it('should accept valid continuous poll data', () => {
      const validData = {
        ownerId: 'user1',
        question: 'Rate this?',
        isContinuous: true,
        minValue: 1,
        maxValue: 10,
        step: 1
      };

      expect(() => PollValidations.validateContinuousPollData(validData)).not.toThrow();
    });

    it('should skip validation for discrete polls', () => {
      const discreteData = {
        ownerId: 'user1',
        question: 'Test question?',
        isContinuous: false,
        selectionType: 'SINGLE' as const,
        options: [
          { text: 'Option 1', position: 1 },
          { text: 'Option 2', position: 2 }
        ]
      };

      expect(() => PollValidations.validateContinuousPollData(discreteData)).not.toThrow();
    });

    it('should reject continuous polls without minValue or maxValue', () => {
      const invalidCases = [
        {
          data: { ownerId: 'user1', question: 'Test?', isContinuous: true, maxValue: 10 },
          error: 'Continuous polls require both minValue and maxValue'
        },
        {
          data: { ownerId: 'user1', question: 'Test?', isContinuous: true, minValue: 1 },
          error: 'Continuous polls require both minValue and maxValue'
        }
      ];

      invalidCases.forEach(({ data, error }) => {
        expect(() => PollValidations.validateContinuousPollData(data))
          .toThrow(new ValidationError(error));
      });
    });

    it('should reject invalid minValue/maxValue combinations', () => {
      const invalidCases = [
        {
          data: { ownerId: 'user1', question: 'Test?', isContinuous: true, minValue: 10, maxValue: 5 },
          error: 'minValue must be less than maxValue'
        },
        {
          data: { ownerId: 'user1', question: 'Test?', isContinuous: true, minValue: 5, maxValue: 5 },
          error: 'minValue must be less than maxValue'
        }
      ];

      invalidCases.forEach(({ data, error }) => {
        expect(() => PollValidations.validateContinuousPollData(data))
          .toThrow(new ValidationError(error));
      });
    });

    it('should validate step values', () => {
      const invalidCases = [
        {
          data: { ownerId: 'user1', question: 'Test?', isContinuous: true, minValue: 1, maxValue: 10, step: 0 },
          error: 'step must be a positive number'
        },
        {
          data: { ownerId: 'user1', question: 'Test?', isContinuous: true, minValue: 1, maxValue: 10, step: 15 },
          error: 'step cannot be larger than the range (maxValue - minValue)'
        }
      ];

      invalidCases.forEach(({ data, error }) => {
        expect(() => PollValidations.validateContinuousPollData(data))
          .toThrow(new ValidationError(error));
      });
    });

    it('should reject discrete poll fields on continuous polls', () => {
      const invalidData = {
        ownerId: 'user1',
        question: 'Test?',
        isContinuous: true,
        minValue: 1,
        maxValue: 10,
        options: [{ text: 'Option 1', position: 1 }]
      };

      expect(() => PollValidations.validateContinuousPollData(invalidData))
        .toThrow(new ValidationError('Continuous polls cannot have options'));
    });
  });

  describe('validateSliderValue', () => {
    it('should accept valid slider values', () => {
      expect(() => PollValidations.validateSliderValue(5, 1, 10)).not.toThrow();
      expect(() => PollValidations.validateSliderValue(7.5, 1, 10)).not.toThrow();
      expect(() => PollValidations.validateSliderValue(1, 1, 10)).not.toThrow(); // Min value
      expect(() => PollValidations.validateSliderValue(10, 1, 10)).not.toThrow(); // Max value
      expect(() => PollValidations.validateSliderValue(5, null, null)).not.toThrow(); // No limits
    });

    it('should reject invalid slider values', () => {
      const invalidCases = [
        { value: NaN, min: 1, max: 10, error: 'Slider value must be a valid number' },
        { value: 'string' as any, min: 1, max: 10, error: 'Slider value must be a valid number' },
        { value: 0, min: 1, max: 10, error: 'Value must be at least 1' },
        { value: 15, min: 1, max: 10, error: 'Value must be at most 10' }
      ];

      invalidCases.forEach(({ value, min, max, error }) => {
        expect(() => PollValidations.validateSliderValue(value, min, max))
          .toThrow(new ValidationError(error));
      });
    });
  });

  describe('validatePollExpiration', () => {
    it('should accept valid expiration dates', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      expect(() => PollValidations.validatePollExpiration(futureDate)).not.toThrow();
      expect(() => PollValidations.validatePollExpiration(null)).not.toThrow();
      expect(() => PollValidations.validatePollExpiration(undefined)).not.toThrow();
    });

    it('should reject invalid expiration dates', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const farFutureDate = new Date();
      farFutureDate.setFullYear(farFutureDate.getFullYear() + 2); // 2 years from now

      const invalidCases = [
        { value: pastDate, error: 'Poll expiration date must be in the future' },
        { value: farFutureDate, error: 'Poll expiration date cannot be more than 1 year in the future' },
        { value: 'invalid date' as any, error: 'expiresAt must be a valid Date object' }
      ];

      invalidCases.forEach(({ value, error }) => {
        expect(() => PollValidations.validatePollExpiration(value))
          .toThrow(new ValidationError(error));
      });
    });
  });

  describe('validateMediaUrls', () => {
    it('should accept valid media URLs', () => {
      const validUrls = [
        ['https://example.com/image.jpg'],
        ['https://cdn.example.com/video.mp4', 'https://example.com/audio.mp3'],
        [] // Empty array
      ];

      validUrls.forEach(urls => {
        expect(() => PollValidations.validateMediaUrls(urls)).not.toThrow();
      });

      expect(() => PollValidations.validateMediaUrls(null)).not.toThrow();
      expect(() => PollValidations.validateMediaUrls(undefined)).not.toThrow();
    });

    it('should reject invalid media URLs', () => {
      const invalidCases = [
        { value: 'not an array' as any, error: 'mediaUrls must be an array' },
        { value: Array(5).fill('https://example.com/image.jpg'), error: 'Cannot have more than 4 media URLs' },
        { value: [''], error: 'Media URL 1 cannot be empty' },
        { value: ['invalid-url'], error: 'Media URL 1 is not a valid URL' },
        { value: [123] as any, error: 'Media URL 1 must be a string' }
      ];

      invalidCases.forEach(({ value, error }) => {
        expect(() => PollValidations.validateMediaUrls(value))
          .toThrow(new ValidationError(error));
      });
    });
  });
}); 
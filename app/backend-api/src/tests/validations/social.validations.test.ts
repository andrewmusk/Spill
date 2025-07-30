import { describe, it, expect } from 'vitest';
import { ValidationError } from '../../db/errors.js';
import { SocialValidations } from '../../lib/validations/social.validations.js';

describe('SocialValidations', () => {
  describe('validateFollowData', () => {
    it('should accept valid follow data', () => {
      expect(() => SocialValidations.validateFollowData('user1', 'user2')).not.toThrow();
    });

    it('should reject invalid follow data', () => {
      expect(() => SocialValidations.validateFollowData('user1', 'user1'))
        .toThrow(new ValidationError('Cannot follow yourself'));
    });

    it('should reject empty user IDs in follow data', () => {
      expect(() => SocialValidations.validateFollowData('', 'user2'))
        .toThrow(new ValidationError('Both user IDs are required for follow'));
      
      expect(() => SocialValidations.validateFollowData('user1', ''))
        .toThrow(new ValidationError('Both user IDs are required for follow'));
    });
  });

  describe('validateBlockData', () => {
    it('should accept valid block data', () => {
      expect(() => SocialValidations.validateBlockData('user1', 'user2')).not.toThrow();
    });

    it('should reject invalid block data', () => {
      expect(() => SocialValidations.validateBlockData('user1', 'user1'))
        .toThrow(new ValidationError('Cannot block yourself'));
    });

    it('should reject empty user IDs in block data', () => {
      expect(() => SocialValidations.validateBlockData('', 'user2'))
        .toThrow(new ValidationError('Both user IDs are required for block'));
      
      expect(() => SocialValidations.validateBlockData('user1', ''))
        .toThrow(new ValidationError('Both user IDs are required for block'));
    });
  });

  describe('validateMuteData', () => {
    it('should accept valid mute data', () => {
      expect(() => SocialValidations.validateMuteData('user1', 'user2')).not.toThrow();
    });

    it('should reject invalid mute data', () => {
      expect(() => SocialValidations.validateMuteData('user1', 'user1'))
        .toThrow(new ValidationError('Cannot mute yourself'));
    });

    it('should reject empty user IDs in mute data', () => {
      expect(() => SocialValidations.validateMuteData('', 'user2'))
        .toThrow(new ValidationError('Both user IDs are required for mute'));
      
      expect(() => SocialValidations.validateMuteData('user1', ''))
        .toThrow(new ValidationError('Both user IDs are required for mute'));
    });
  });
}); 
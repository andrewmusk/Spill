import { UserValidations } from './user.validations.js';

/**
 * Social validation functions
 */
export class SocialValidations {
  static validateFollowData(followerId: string, followeeId: string): void {
    UserValidations.validateUserIds(followerId, followeeId, 'follow');
  }

  static validateBlockData(blockerId: string, blockedId: string): void {
    UserValidations.validateUserIds(blockerId, blockedId, 'block');
  }

  static validateMuteData(muterId: string, mutedId: string): void {
    UserValidations.validateUserIds(muterId, mutedId, 'mute');
  }
} 
// Database client
export { prisma } from '../lib/prisma.js';

// Error types and utilities
export * from './errors.js';

// Repositories
export { UserRepository } from './repositories/user.repository.js';
export { PollRepository } from './repositories/poll.repository.js';
export { SocialRepository } from './repositories/social.repository.js';

// Import for instances
import { UserRepository } from './repositories/user.repository.js';
import { PollRepository } from './repositories/poll.repository.js';
import { SocialRepository } from './repositories/social.repository.js';

// Repository instances (singletons)
export const userRepository = new UserRepository();
export const pollRepository = new PollRepository();
export const socialRepository = new SocialRepository();

// Type exports for convenience
export type {
  CreateUserData,
  UpdateUserData,
  UserWithCounts,
} from './repositories/user.repository.js';

export type {
  CreatePollData,
  UpdatePollData,
  PollWithDetails,
  PollFeedItem,
} from './repositories/poll.repository.js';

export type {
  FollowData,
  FollowRequestData,
  BlockData,
  MuteData,
} from './repositories/social.repository.js'; 
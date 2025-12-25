import { PollRepository } from '../repos/poll.repository.js';
import { SocialRepository } from '../repos/social.repository.js';
import { NotFoundError, ValidationError } from '../db/errors.js';
import { canViewPoll } from '../domain/visibility.js';
import type { PollVisibility } from '../domain/visibility.js';

const pollRepository = new PollRepository();
const socialRepository = new SocialRepository();

export class PollService {
  // Placeholder - to be implemented with full poll CRUD operations
  // This will follow the pattern: call domain functions, call repos, handle transactions
}

export const pollService = new PollService();


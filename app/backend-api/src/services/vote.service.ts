import { PollRepository } from '../repos/poll.repository.js';
import { NotFoundError, ValidationError } from '../db/errors.js';

const pollRepository = new PollRepository();

export class VoteService {
  // Placeholder - to be implemented with full vote operations
  // This will follow the pattern: call domain functions, call repos, handle transactions
}

export const voteService = new VoteService();


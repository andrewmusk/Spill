import { prisma } from '../../lib/prisma.js';
import { withErrorMapping, NotFoundError, ValidationError } from '../errors.js';
import { PollValidations } from '../../lib/validations/poll.validations.js';
import { SocialRepository } from './social.repository.js';
import { randomBytes } from 'crypto';
import type { Poll, PollOption, Vote, SliderResponse, PollVisibility, SelectionType } from '../../../generated/prisma';

// Create instance to avoid circular dependency
const socialRepository = new SocialRepository();

export interface CreatePollData {
  ownerId: string;
  question: string;
  isContinuous: boolean;
  selectionType?: SelectionType;
  maxSelections?: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  visibility?: PollVisibility;
  expiresAt?: Date;
  mediaUrls?: string[];
  options?: Array<{ text: string; position: number }>;
}

export interface UpdatePollData {
  question?: string;
  visibility?: PollVisibility;
  expiresAt?: Date;
  mediaUrls?: string[];
}

export interface PollWithDetails extends Poll {
  owner: {
    id: string;
    handle: string;
    displayName: string | null;
  };
  options: PollOption[];
  votes: Array<Vote & {
    voter: {
      id: string;
      handle: string;
    };
  }>;
  sliderResponses: Array<SliderResponse & {
    user: {
      id: string;
      handle: string;
    };
  }>;
  _count: {
    votes: number;
    sliderResponses: number;
  };
}

export interface PollFeedItem extends Poll {
  owner: {
    id: string;
    handle: string;
    displayName: string | null;
  };
  options: PollOption[];
  _count: {
    votes: number;
    sliderResponses: number;
  };
  userVoted?: boolean;
  userResponse?: number;
}

export class PollRepository {
  /**
   * Generate a cryptographically secure token for private link polls
   */
  private generatePrivateLinkToken(): string {
    // Generate 32 random bytes and convert to base64url (URL-safe)
    return randomBytes(32).toString('base64url');
  }

  async create(data: CreatePollData): Promise<Poll> {
    const { options, ...pollData } = data;

    // Use centralized validation functions
    PollValidations.validateQuestion(data.question);
    PollValidations.validateDiscretePollData(data);
    PollValidations.validateContinuousPollData(data);
    PollValidations.validatePollExpiration(data.expiresAt);
    PollValidations.validateMediaUrls(data.mediaUrls);

    // Generate private link token if visibility is PRIVATE_LINK
    const privateLinkToken = data.visibility === 'PRIVATE_LINK' 
      ? this.generatePrivateLinkToken() 
      : undefined;

    return withErrorMapping(() =>
      prisma.poll.create({
        data: {
          ...pollData,
          privateLinkToken,
          ...(options && {
            options: {
              create: options,
            },
          }),
        },
        include: {
          options: true,
        },
      })
    );
  }

  async findById(id: string): Promise<Poll | null> {
    return withErrorMapping(() =>
      prisma.poll.findUnique({
        where: { id },
      })
    );
  }

  async findByIdOrThrow(id: string): Promise<Poll> {
    const poll = await this.findById(id);
    if (!poll) {
      throw new NotFoundError('Poll', id);
    }
    return poll;
  }

  async findWithDetails(id: string): Promise<PollWithDetails | null> {
    return withErrorMapping(() =>
      prisma.poll.findUnique({
        where: { id },
        include: {
          owner: {
            select: {
              id: true,
              handle: true,
              displayName: true,
            },
          },
          options: {
            orderBy: { position: 'asc' },
          },
          votes: {
            include: {
              voter: {
                select: {
                  id: true,
                  handle: true,
                },
              },
            },
          },
          sliderResponses: {
            include: {
              user: {
                select: {
                  id: true,
                  handle: true,
                },
              },
            },
          },
          _count: {
            select: {
              votes: true,
              sliderResponses: true,
            },
          },
        },
      })
    );
  }

  async update(id: string, data: UpdatePollData): Promise<Poll> {
    return withErrorMapping(() =>
      prisma.poll.update({
        where: { id },
        data,
      })
    );
  }

  async delete(id: string): Promise<void> {
    await withErrorMapping(() =>
      prisma.poll.delete({
        where: { id },
      })
    );
  }

  async getFeed(
    viewerId: string,
    cursor?: string,
    limit = 20,
    visibility?: PollVisibility
  ): Promise<PollFeedItem[]> {
    // Get user's following list and mutual follows for visibility checks
    const [followingIds, blockedIds] = await Promise.all([
      socialRepository.getFollowingUserIds(viewerId),
      socialRepository.getBlockedUserIds(viewerId),
    ]);

    // Build visibility filter
    // PRIVATE_LINK polls should never appear in feeds (they're link-only)
    // FRIENDS_ONLY polls only appear if viewer is friends with owner
    const visibilityFilter: any = {
      NOT: { visibility: 'PRIVATE_LINK' }, // Never show private link polls in feeds
    };

    if (visibility) {
      visibilityFilter.visibility = visibility;
    } else {
      // For FRIENDS_ONLY polls, we need to check if viewer is friends with owner
      // This is complex in a single query, so we'll filter in application logic
      visibilityFilter.OR = [
        { visibility: 'PUBLIC' },
        {
          visibility: 'FRIENDS_ONLY',
          ownerId: { in: followingIds }, // Will be further filtered by mutual follows check
        },
      ];
    }

    const polls = await withErrorMapping(() =>
      prisma.poll.findMany({
        where: {
          ...visibilityFilter,
          // Don't show expired polls
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
          // Don't show polls from blocked users
          ownerId: { notIn: blockedIds },
          owner: {
            blocked: {
              none: {
                blockerId: viewerId,
              },
            },
          },
        },
        include: {
          owner: {
            select: {
              id: true,
              handle: true,
              displayName: true,
            },
          },
          options: {
            orderBy: { position: 'asc' },
          },
          _count: {
            select: {
              votes: true,
              sliderResponses: true,
            },
          },
        },
        take: limit + 1, // Take one extra to check if there are more
        ...(cursor && {
          skip: 1,
          cursor: { id: cursor },
        }),
        orderBy: { createdAt: 'desc' },
      })
    );

    // Filter FRIENDS_ONLY polls to only show those where viewer is actually friends with owner
    const filteredPolls = await Promise.all(
      polls.map(async (poll) => {
        if (poll.visibility === 'FRIENDS_ONLY' && poll.ownerId !== viewerId) {
          const mutuals = await socialRepository.getMutualFollows(viewerId, poll.ownerId);
          if (!mutuals.areMutuals) {
            return null; // Not friends, exclude from feed
          }
        }
        return poll;
      })
    );

    // Remove null entries and limit to requested amount
    return filteredPolls.filter((p): p is PollFeedItem => p !== null).slice(0, limit);
  }

  async getUserPolls(
    userId: string,
    cursor?: string,
    limit = 20
  ): Promise<Poll[]> {
    return withErrorMapping(() =>
      prisma.poll.findMany({
        where: {
          ownerId: userId,
        },
        include: {
          options: {
            orderBy: { position: 'asc' },
          },
          _count: {
            select: {
              votes: true,
              sliderResponses: true,
            },
          },
        },
        take: limit,
        ...(cursor && {
          skip: 1,
          cursor: { id: cursor },
        }),
        orderBy: { createdAt: 'desc' },
      })
    );
  }

  async vote(pollId: string, voterId: string, optionId: string): Promise<Vote> {
    // Check if poll is discrete and not expired
    const poll = await this.findByIdOrThrow(pollId);
    if (poll.isContinuous) {
      throw new ValidationError('Cannot vote on continuous polls');
    }
    if (poll.expiresAt && poll.expiresAt < new Date()) {
      throw new ValidationError('Poll has expired');
    }

    // Check if user already voted for this option
    const existingVote = await withErrorMapping(() =>
      prisma.vote.findUnique({
        where: {
          pollId_voterId_optionId: {
            pollId,
            voterId,
            optionId,
          },
        },
      })
    );

    if (existingVote) {
      // User already voted for this option, return existing vote
      return existingVote;
    }

    // Check if user has other votes on this poll (indicates a vote change/flip-flop)
    const existingVotes = await this.getUserVoteForPoll(pollId, voterId);
    const flipFlopCount = existingVotes.length > 0 
      ? Math.max(...existingVotes.map(v => v.flipFlopCount)) + 1 
      : 0;

    return withErrorMapping(() =>
      prisma.vote.create({
        data: {
          pollId,
          voterId,
          optionId,
          flipFlopCount,
        },
      })
    );
  }

  async removeVote(pollId: string, voterId: string, optionId: string): Promise<void> {
    await withErrorMapping(() =>
      prisma.vote.delete({
        where: {
          pollId_voterId_optionId: {
            pollId,
            voterId,
            optionId,
          },
        },
      })
    );
  }

  async submitSliderResponse(
    pollId: string,
    userId: string,
    value: number
  ): Promise<SliderResponse> {
    // Check if poll is continuous and not expired
    const poll = await this.findByIdOrThrow(pollId);
    if (!poll.isContinuous) {
      throw new ValidationError('Cannot submit slider response on discrete polls');
    }
    if (poll.expiresAt && poll.expiresAt < new Date()) {
      throw new ValidationError('Poll has expired');
    }
    // Use centralized validation
    PollValidations.validateSliderValue(value, poll.minValue, poll.maxValue);

    // Check if user already has a response (indicates a change/flip-flop)
    const existingResponse = await this.getUserSliderResponse(pollId, userId);
    const flipFlopCount = existingResponse 
      ? existingResponse.flipFlopCount + 1 
      : 0;

    return withErrorMapping(() =>
      prisma.sliderResponse.upsert({
        where: {
          pollId_userId: {
            pollId,
            userId,
          },
        },
        update: {
          value,
          flipFlopCount,
        },
        create: {
          pollId,
          userId,
          value,
          flipFlopCount,
        },
      })
    );
  }

  async skipPoll(userId: string, pollId: string): Promise<void> {
    await withErrorMapping(() =>
      prisma.skippedPoll.upsert({
        where: {
          userId_pollId: {
            userId,
            pollId,
          },
        },
        update: {},
        create: {
          userId,
          pollId,
        },
      })
    );
  }

  async getUserVoteForPoll(pollId: string, userId: string): Promise<Vote[]> {
    return withErrorMapping(() =>
      prisma.vote.findMany({
        where: {
          pollId,
          voterId: userId,
        },
      })
    );
  }

  async getUserSliderResponse(pollId: string, userId: string): Promise<SliderResponse | null> {
    return withErrorMapping(() =>
      prisma.sliderResponse.findUnique({
        where: {
          pollId_userId: {
            pollId,
            userId,
          },
        },
      })
    );
  }

  /**
   * Check if a user can view a poll based on visibility and relationships
   */
  async canViewPoll(pollId: string, viewerId: string | null, privateLinkToken?: string): Promise<boolean> {
    const poll = await this.findByIdOrThrow(pollId);

    // PRIVATE_LINK polls require the token
    if (poll.visibility === 'PRIVATE_LINK') {
      if (!privateLinkToken || poll.privateLinkToken !== privateLinkToken) {
        return false;
      }
      return true; // Token matches, can view
    }

    // PUBLIC polls are visible to everyone
    if (poll.visibility === 'PUBLIC') {
      return true;
    }

    // FRIENDS_ONLY polls require mutual follows
    if (poll.visibility === 'FRIENDS_ONLY') {
      if (!viewerId) {
        return false; // Must be authenticated
      }
      if (poll.ownerId === viewerId) {
        return true; // Owner can always view their own polls
      }
      // Check if viewer and owner are mutual follows (friends)
      const mutuals = await socialRepository.getMutualFollows(viewerId, poll.ownerId);
      return mutuals.areMutuals;
    }

    return false;
  }

  /**
   * Check if a user can vote on a poll based on visibility and relationships
   */
  async canVoteOnPoll(pollId: string, voterId: string, privateLinkToken?: string): Promise<boolean> {
    // Must be able to view to vote
    const canView = await this.canViewPoll(pollId, voterId, privateLinkToken);
    if (!canView) {
      return false;
    }

    const poll = await this.findByIdOrThrow(pollId);
    
    // Check if poll is expired
    if (poll.expiresAt && poll.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Find poll by private link token
   */
  async findByPrivateLinkToken(token: string): Promise<Poll | null> {
    return withErrorMapping(() =>
      prisma.poll.findUnique({
        where: {
          privateLinkToken: token,
        },
      })
    );
  }

  /**
   * Update vote visibility settings
   */
  async updateVoteVisibility(
    voteId: string,
    voterId: string,
    data: {
      isHidden?: boolean;
      isSharedPublicly?: boolean;
      publicComment?: string | null;
    }
  ): Promise<Vote> {
    // Verify the vote belongs to the voter
    const vote = await withErrorMapping(() =>
      prisma.vote.findUnique({
        where: { id: voteId },
      })
    );

    if (!vote) {
      throw new NotFoundError('Vote', voteId);
    }

    if (vote.voterId !== voterId) {
      throw new ValidationError('Cannot update vote visibility for another user\'s vote');
    }

    // If sharing publicly, verify the poll is public
    if (data.isSharedPublicly === true) {
      const poll = await this.findByIdOrThrow(vote.pollId);
      if (poll.visibility !== 'PUBLIC') {
        throw new ValidationError('Can only share votes publicly on public polls');
      }
    }

    return withErrorMapping(() =>
      prisma.vote.update({
        where: { id: voteId },
        data,
      })
    );
  }

  /**
   * Update slider response visibility settings
   */
  async updateSliderResponseVisibility(
    responseId: string,
    userId: string,
    data: {
      isHidden?: boolean;
      isSharedPublicly?: boolean;
      publicComment?: string | null;
    }
  ): Promise<SliderResponse> {
    // Verify the response belongs to the user
    const response = await withErrorMapping(() =>
      prisma.sliderResponse.findUnique({
        where: { id: responseId },
      })
    );

    if (!response) {
      throw new NotFoundError('SliderResponse', responseId);
    }

    if (response.userId !== userId) {
      throw new ValidationError('Cannot update response visibility for another user\'s response');
    }

    // If sharing publicly, verify the poll is public
    if (data.isSharedPublicly === true) {
      const poll = await this.findByIdOrThrow(response.pollId);
      if (poll.visibility !== 'PUBLIC') {
        throw new ValidationError('Can only share responses publicly on public polls');
      }
    }

    return withErrorMapping(() =>
      prisma.sliderResponse.update({
        where: { id: responseId },
        data,
      })
    );
  }
} 
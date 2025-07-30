import { prisma } from '../../lib/prisma.js';
import { withErrorMapping, NotFoundError, ValidationError } from '../errors.js';
import { PollValidations } from '../../lib/validations/poll.validations.js';
import type { Poll, PollOption, Vote, SliderResponse, PollVisibility, SelectionType } from '../../../generated/prisma';

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
  async create(data: CreatePollData): Promise<Poll> {
    const { options, ...pollData } = data;

    // Use centralized validation functions
    PollValidations.validateQuestion(data.question);
    PollValidations.validateDiscretePollData(data);
    PollValidations.validateContinuousPollData(data);
    PollValidations.validatePollExpiration(data.expiresAt);
    PollValidations.validateMediaUrls(data.mediaUrls);

    return withErrorMapping(() =>
      prisma.poll.create({
        data: {
          ...pollData,
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
    // This is a simplified feed - in a real app you'd have more complex logic
    // for filtering based on follows, blocks, mutes, etc.
    return withErrorMapping(() =>
      prisma.poll.findMany({
        where: {
          ...(visibility && { visibility }),
          // Don't show expired polls
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
          // Don't show polls from blocked users (simplified)
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
        take: limit,
        ...(cursor && {
          skip: 1,
          cursor: { id: cursor },
        }),
        orderBy: { createdAt: 'desc' },
      })
    );
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

    return withErrorMapping(() =>
      prisma.vote.create({
        data: {
          pollId,
          voterId,
          optionId,
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
        },
        create: {
          pollId,
          userId,
          value,
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
} 
import { prisma } from '../../lib/prisma.js';
import { PollRepository } from '../../db/repositories/poll.repository.js';
import { SocialRepository } from '../../db/repositories/social.repository.js';
import { UserRepository } from '../../db/repositories/user.repository.js';
import { NotFoundError } from '../../db/errors.js';

const pollRepository = new PollRepository();
const socialRepository = new SocialRepository();
const userRepository = new UserRepository();

export class AdminService {
  /**
   * Get platform health information
   */
  async getHealth() {
    return {
      ok: true,
      service: 'spill-backend',
      version: '1.0.0',
      commitSha: process.env.COMMIT_SHA || 'unknown',
      env: process.env.NODE_ENV || 'development',
      now: new Date().toISOString(),
    };
  }

  /**
   * Get database health and statistics
   */
  async getDbHealth() {
    // Extract DB host and name from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || '';
    const urlMatch = dbUrl.match(/postgresql:\/\/(?:[^:]+):(?:[^@]+)@([^:]+):(\d+)\/(.+)/);
    const dbHost = urlMatch ? urlMatch[1] : 'unknown';
    const dbName = urlMatch ? urlMatch[3] : 'unknown';

    // Get latest migration
    const migrations = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
      SELECT migration_name, finished_at 
      FROM _prisma_migrations 
      WHERE finished_at IS NOT NULL 
      ORDER BY finished_at DESC 
      LIMIT 1
    `;
    const latestMigration = migrations[0]?.migration_name || null;

    // Get counts
    const [userCount, pollCount, responseCount] = await Promise.all([
      prisma.user.count(),
      prisma.poll.count(),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count 
        FROM (
          SELECT id FROM "Vote"
          UNION ALL
          SELECT id FROM "SliderResponse"
        ) as responses
      `,
    ]);

    const responseCountNum = Number(responseCount[0]?.count || 0);

    return {
      ok: true,
      dbHost,
      dbName,
      migration: {
        latestApplied: latestMigration,
      },
      counts: {
        users: userCount,
        polls: pollCount,
        responses: responseCountNum,
      },
    };
  }

  /**
   * Search users by query (handle, email via Clerk, or userId)
   */
  async searchUsers(query: string | undefined, limit: number, cursor?: string) {
    const where: any = {};

    if (query) {
      where.OR = [
        { handle: { contains: query, mode: 'insensitive' } },
        { displayName: { contains: query, mode: 'insensitive' } },
        { id: query },
        { clerkId: query },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            polls: true,
            followers: true,
            following: true,
            votes: true,
            sliderResponses: true,
          },
        },
      },
    });

    const hasMore = users.length > limit;
    const data = hasMore ? users.slice(0, limit) : users;
    const nextCursor = hasMore ? data[data.length - 1]!.id : undefined;

    return {
      data,
      meta: {
        nextCursor,
      },
    };
  }

  /**
   * Get full user details with relationships
   */
  async getUserDetails(userId: string) {
    const user = await userRepository.findByIdOrThrow(userId);

    const [
      polls,
      votes,
      sliderResponses,
      followers,
      following,
      blocked,
      blockers,
      muted,
      muters,
    ] = await Promise.all([
      prisma.poll.count({ where: { ownerId: userId } }),
      prisma.vote.count({ where: { voterId: userId } }),
      prisma.sliderResponse.count({ where: { userId } }),
      prisma.follow.count({ where: { followeeId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.block.findMany({
        where: { blockerId: userId },
        include: {
          blocked: {
            select: {
              id: true,
              handle: true,
              displayName: true,
            },
          },
        },
      }),
      prisma.block.findMany({
        where: { blockedId: userId },
        include: {
          blocker: {
            select: {
              id: true,
              handle: true,
              displayName: true,
            },
          },
        },
      }),
      prisma.mute.findMany({
        where: { muterId: userId },
        include: {
          muted: {
            select: {
              id: true,
              handle: true,
              displayName: true,
            },
          },
        },
      }),
      prisma.mute.findMany({
        where: { mutedId: userId },
        include: {
          muter: {
            select: {
              id: true,
              handle: true,
              displayName: true,
            },
          },
        },
      }),
    ]);

    return {
      ...user,
      counts: {
        polls,
        votes,
        sliderResponses,
        followers,
        following,
      },
      relationships: {
        blocked: blocked.map(b => b.blocked),
        blockedBy: blockers.map(b => b.blocker),
        muted: muted.map(m => m.muted),
        mutedBy: muters.map(m => m.muter),
      },
    };
  }

  /**
   * Search polls
   */
  async searchPolls(query: string | undefined, limit: number, cursor?: string) {
    const where: any = {};

    if (query) {
      where.OR = [
        { question: { contains: query, mode: 'insensitive' } },
        { id: query },
        { owner: { handle: { contains: query, mode: 'insensitive' } } },
      ];
    }

    const polls = await prisma.poll.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            handle: true,
            displayName: true,
          },
        },
        options: true,
        _count: {
          select: {
            votes: true,
            sliderResponses: true,
          },
        },
      },
    });

    const hasMore = polls.length > limit;
    const data = hasMore ? polls.slice(0, limit) : polls;
    const nextCursor = hasMore ? data[data.length - 1]!.id : undefined;

    return {
      data,
      meta: {
        nextCursor,
      },
    };
  }

  /**
   * Get poll details
   */
  async getPollDetails(pollId: string) {
    const poll = await pollRepository.findByIdOrThrow(pollId);

    const [options, voteCount, sliderResponseCount, votes, sliderResponses] = await Promise.all([
      prisma.pollOption.findMany({
        where: { pollId },
        orderBy: { position: 'asc' },
        include: {
          _count: {
            select: {
              votes: true,
            },
          },
        },
      }),
      prisma.vote.count({ where: { pollId } }),
      prisma.sliderResponse.count({ where: { pollId } }),
      prisma.vote.findMany({
        where: { pollId },
        include: {
          voter: {
            select: {
              id: true,
              handle: true,
              displayName: true,
            },
          },
          option: {
            select: {
              id: true,
              text: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sliderResponse.findMany({
        where: { pollId },
        include: {
          user: {
            select: {
              id: true,
              handle: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      ...poll,
      options,
      counts: {
        votes: voteCount,
        sliderResponses: sliderResponseCount,
      },
      responseDistribution: poll.isContinuous
        ? {
            type: 'slider',
            responses: sliderResponses.map(r => ({
              userId: r.userId,
              user: r.user,
              value: r.value,
              createdAt: r.createdAt,
            })),
          }
        : {
            type: 'discrete',
            options: options.map(opt => ({
              optionId: opt.id,
              optionText: opt.text,
              voteCount: opt._count.votes,
            })),
          },
    };
  }

  /**
   * Get poll responses with pagination
   */
  async getPollResponses(pollId: string, limit: number, cursor?: string) {
    // Check if poll exists
    await pollRepository.findByIdOrThrow(pollId);

    // Get poll type
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: { isContinuous: true },
    });

    if (!poll) {
      throw new NotFoundError('Poll', pollId);
    }

    if (poll.isContinuous) {
      // Slider responses
      const responses = await prisma.sliderResponse.findMany({
        where: { pollId },
        take: limit + 1,
        ...(cursor && {
          skip: 1,
          cursor: { id: cursor },
        }),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              handle: true,
              displayName: true,
            },
          },
        },
      });

      const hasMore = responses.length > limit;
      const data = hasMore ? responses.slice(0, limit) : responses;
      const nextCursor = hasMore ? data[data.length - 1]!.id : undefined;

      return {
        data,
        meta: {
          nextCursor,
        },
      };
    } else {
      // Votes
      const votes = await prisma.vote.findMany({
        where: { pollId },
        take: limit + 1,
        ...(cursor && {
          skip: 1,
          cursor: { id: cursor },
        }),
        orderBy: { createdAt: 'desc' },
        include: {
          voter: {
            select: {
              id: true,
              handle: true,
              displayName: true,
            },
          },
          option: {
            select: {
              id: true,
              text: true,
            },
          },
        },
      });

      const hasMore = votes.length > limit;
      const data = hasMore ? votes.slice(0, limit) : votes;
      const nextCursor = hasMore ? data[data.length - 1]!.id : undefined;

      return {
        data,
        meta: {
          nextCursor,
        },
      };
    }
  }

  /**
   * Search responses (votes and slider responses)
   */
  async searchResponses(userId: string | undefined, pollId: string | undefined, limit: number, cursor?: string) {
    // Get both votes and slider responses
    const voteWhere: any = {};
    const sliderWhere: any = {};
    
    if (userId) {
      voteWhere.voterId = userId;
      sliderWhere.userId = userId;
    }
    if (pollId) {
      voteWhere.pollId = pollId;
      sliderWhere.pollId = pollId;
    }

    const [votes, sliderResponses] = await Promise.all([
      prisma.vote.findMany({
        where: voteWhere,
        take: limit + 1,
        ...(cursor && {
          skip: 1,
          cursor: { id: cursor },
        }),
        orderBy: { createdAt: 'desc' },
        include: {
          poll: {
            select: {
              id: true,
              question: true,
            },
          },
          option: {
            select: {
              id: true,
              text: true,
            },
          },
          voter: {
            select: {
              id: true,
              handle: true,
              displayName: true,
            },
          },
        },
      }),
      prisma.sliderResponse.findMany({
        where: sliderWhere,
        take: limit + 1,
        ...(cursor && {
          skip: 1,
          cursor: { id: cursor },
        }),
        orderBy: { createdAt: 'desc' },
        include: {
          poll: {
            select: {
              id: true,
              question: true,
            },
          },
          user: {
            select: {
              id: true,
              handle: true,
              displayName: true,
            },
          },
        },
      }),
    ]);

    // Combine and sort by createdAt
    const allResponses = [
      ...votes.map(v => ({ type: 'vote' as const, ...v })),
      ...sliderResponses.map(r => ({ type: 'slider' as const, ...r })),
    ].sort((a, b) => {
      const aTime = 'createdAt' in a ? a.createdAt.getTime() : 0;
      const bTime = 'createdAt' in b ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    });

    const hasMore = allResponses.length > limit;
    const data = hasMore ? allResponses.slice(0, limit) : allResponses;
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1]!.id : undefined;

    return {
      data,
      meta: {
        nextCursor,
      },
    };
  }

  /**
   * Simulate visibility check for a target (poll, response, or profile)
   */
  async simulateVisibility(viewerUserId: string, targetType: 'poll' | 'response' | 'profile', targetId: string) {
    const viewer = await userRepository.findByIdOrThrow(viewerUserId);

    if (targetType === 'poll') {
      const canView = await pollRepository.canViewPoll(targetId, viewerUserId);
      const poll = await pollRepository.findByIdOrThrow(targetId);
      
      let reason = 'OK';
      if (!canView) {
        if (poll.visibility === 'PRIVATE_LINK') {
          reason = 'PRIVATE_LINK_REQUIRED';
        } else if (poll.visibility === 'FRIENDS_ONLY') {
          const mutuals = await socialRepository.getMutualFollows(viewerUserId, poll.ownerId);
          reason = mutuals.areMutuals ? 'OK' : 'NOT_MUTUALS';
        } else {
          reason = 'BLOCKED';
        }
      }

      return {
        allowed: canView,
        reason,
        debug: {
          pollId: targetId,
          pollVisibility: poll.visibility,
          viewerId: viewerUserId,
          ownerId: poll.ownerId,
          isOwner: poll.ownerId === viewerUserId,
        },
      };
    } else if (targetType === 'response') {
      // Check if response exists and get poll
      const vote = await prisma.vote.findUnique({
        where: { id: targetId },
        include: { poll: true },
      });
      const sliderResponse = await prisma.sliderResponse.findUnique({
        where: { id: targetId },
        include: { poll: true },
      });

      if (!vote && !sliderResponse) {
        throw new NotFoundError('Response', targetId);
      }

      const response = vote || sliderResponse;
      const pollId = response!.pollId;

      // Check if can view poll first
      const canViewPoll = await pollRepository.canViewPoll(pollId, viewerUserId);
      
      let reason = 'OK';
      if (!canViewPoll) {
        reason = 'CANNOT_VIEW_POLL';
      } else if (vote && vote.voterId !== viewerUserId && vote.isHidden) {
        reason = 'VOTE_HIDDEN';
      } else if (sliderResponse && sliderResponse.userId !== viewerUserId && sliderResponse.isHidden) {
        reason = 'RESPONSE_HIDDEN';
      }

      return {
        allowed: canViewPoll && !(vote?.isHidden || sliderResponse?.isHidden),
        reason,
        debug: {
          responseId: targetId,
          responseType: vote ? 'vote' : 'slider',
          pollId,
          viewerId: viewerUserId,
          responseOwnerId: vote ? vote.voterId : sliderResponse!.userId,
          isOwner: (vote ? vote.voterId : sliderResponse!.userId) === viewerUserId,
          isHidden: vote ? vote.isHidden : sliderResponse!.isHidden,
        },
      };
    } else if (targetType === 'profile') {
      const targetUser = await userRepository.findByIdOrThrow(targetId);
      
      let reason = 'OK';
      let allowed = true;

      if (targetUser.isPrivate && targetUser.id !== viewerUserId) {
        const mutuals = await socialRepository.getMutualFollows(viewerUserId, targetUser.id);
        if (!mutuals.areMutuals) {
          allowed = false;
          reason = 'PRIVATE_NOT_MUTUALS';
        }
      }

      // Check blocks
      const isBlocked = await socialRepository.isBlocked(viewerUserId, targetUser.id);
      const isBlockedBy = await socialRepository.isBlocked(targetUser.id, viewerUserId);
      if (isBlocked || isBlockedBy) {
        allowed = false;
        reason = 'BLOCKED';
      }

      return {
        allowed,
        reason,
        debug: {
          profileId: targetId,
          viewerId: viewerUserId,
          isPrivate: targetUser.isPrivate,
          isOwner: targetUser.id === viewerUserId,
          isBlocked,
          isBlockedBy,
        },
      };
    }

    throw new Error(`Unknown target type: ${targetType}`);
  }
}

export const adminService = new AdminService();

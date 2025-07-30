import { prisma } from '../../lib/prisma.js';
import { withErrorMapping, NotFoundError, ConflictError } from '../errors.js';
import { SocialValidations } from '../../lib/validations/social.validations.js';
import type { Follow, Block, Mute } from '../../../generated/prisma';

export interface FollowData {
  followerId: string;
  followeeId: string;
}

export interface BlockData {
  blockerId: string;
  blockedId: string;
}

export interface MuteData {
  muterId: string;
  mutedId: string;
}

export class SocialRepository {
  // Follow operations
  async follow(data: FollowData): Promise<Follow> {
    const { followerId, followeeId } = data;
    
    // Use centralized validation
    SocialValidations.validateFollowData(followerId, followeeId);

    // Check if already following
    const existing = await this.isFollowing(followerId, followeeId);
    if (existing) {
      throw new ConflictError('Already following this user');
    }

    // Check if blocked
    const isBlocked = await this.isBlocked(followeeId, followerId);
    if (isBlocked) {
      throw new ConflictError('Cannot follow a user who has blocked you');
    }

    return withErrorMapping(() =>
      prisma.follow.create({
        data,
      })
    );
  }

  async unfollow(followerId: string, followeeId: string): Promise<void> {
    await withErrorMapping(() =>
      prisma.follow.delete({
        where: {
          followerId_followeeId: {
            followerId,
            followeeId,
          },
        },
      })
    );
  }

  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const follow = await withErrorMapping(() =>
      prisma.follow.findUnique({
        where: {
          followerId_followeeId: {
            followerId,
            followeeId,
          },
        },
      })
    );
    return !!follow;
  }

  async getFollowRelation(followerId: string, followeeId: string): Promise<Follow | null> {
    return withErrorMapping(() =>
      prisma.follow.findUnique({
        where: {
          followerId_followeeId: {
            followerId,
            followeeId,
          },
        },
      })
    );
  }

  async getMutualFollows(userId1: string, userId2: string): Promise<{
    user1FollowsUser2: boolean;
    user2FollowsUser1: boolean;
    areMutuals: boolean;
  }> {
    const [follow1, follow2] = await Promise.all([
      this.isFollowing(userId1, userId2),
      this.isFollowing(userId2, userId1),
    ]);

    return {
      user1FollowsUser2: follow1,
      user2FollowsUser1: follow2,
      areMutuals: follow1 && follow2,
    };
  }

  // Block operations
  async block(data: BlockData): Promise<Block> {
    const { blockerId, blockedId } = data;
    
    // Use centralized validation
    SocialValidations.validateBlockData(blockerId, blockedId);

    // Remove any existing follow relationships
    await Promise.allSettled([
      this.unfollow(blockerId, blockedId).catch(() => {}), // Ignore if not following
      this.unfollow(blockedId, blockerId).catch(() => {}), // Ignore if not following
    ]);

    return withErrorMapping(() =>
      prisma.block.upsert({
        where: {
          blockerId_blockedId: {
            blockerId,
            blockedId,
          },
        },
        update: {
          blockedAt: new Date(),
        },
        create: data,
      })
    );
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    await withErrorMapping(() =>
      prisma.block.delete({
        where: {
          blockerId_blockedId: {
            blockerId,
            blockedId,
          },
        },
      })
    );
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await withErrorMapping(() =>
      prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId,
            blockedId,
          },
        },
      })
    );
    return !!block;
  }

  async getBlockRelation(blockerId: string, blockedId: string): Promise<Block | null> {
    return withErrorMapping(() =>
      prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId,
            blockedId,
          },
        },
      })
    );
  }

  async getBlockedUsers(userId: string, cursor?: string, limit = 20) {
    return withErrorMapping(() =>
      prisma.user.findMany({
        where: {
          blockers: {
            some: {
              blockerId: userId,
            },
          },
        },
        take: limit,
        ...(cursor && {
          skip: 1,
          cursor: { id: cursor },
        }),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          handle: true,
          displayName: true,
          isPrivate: true,
        },
      })
    );
  }

  // Mute operations
  async mute(data: MuteData): Promise<Mute> {
    const { muterId, mutedId } = data;
    
    // Use centralized validation
    SocialValidations.validateMuteData(muterId, mutedId);

    return withErrorMapping(() =>
      prisma.mute.upsert({
        where: {
          muterId_mutedId: {
            muterId,
            mutedId,
          },
        },
        update: {
          mutedAt: new Date(),
        },
        create: data,
      })
    );
  }

  async unmute(muterId: string, mutedId: string): Promise<void> {
    await withErrorMapping(() =>
      prisma.mute.delete({
        where: {
          muterId_mutedId: {
            muterId,
            mutedId,
          },
        },
      })
    );
  }

  async isMuted(muterId: string, mutedId: string): Promise<boolean> {
    const mute = await withErrorMapping(() =>
      prisma.mute.findUnique({
        where: {
          muterId_mutedId: {
            muterId,
            mutedId,
          },
        },
      })
    );
    return !!mute;
  }

  async getMuteRelation(muterId: string, mutedId: string): Promise<Mute | null> {
    return withErrorMapping(() =>
      prisma.mute.findUnique({
        where: {
          muterId_mutedId: {
            muterId,
            mutedId,
          },
        },
      })
    );
  }

  async getMutedUsers(userId: string, cursor?: string, limit = 20) {
    return withErrorMapping(() =>
      prisma.user.findMany({
        where: {
          muters: {
            some: {
              muterId: userId,
            },
          },
        },
        take: limit,
        ...(cursor && {
          skip: 1,
          cursor: { id: cursor },
        }),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          handle: true,
          displayName: true,
          isPrivate: true,
        },
      })
    );
  }

  // Combined relationship checks
  async getRelationshipStatus(userId: string, targetUserId: string): Promise<{
    following: boolean;
    followedBy: boolean;
    blocking: boolean;
    blockedBy: boolean;
    muting: boolean;
    mutedBy: boolean;
    areMutuals: boolean;
  }> {
    const [
      following,
      followedBy,
      blocking,
      blockedBy,
      muting,
      mutedBy,
    ] = await Promise.all([
      this.isFollowing(userId, targetUserId),
      this.isFollowing(targetUserId, userId),
      this.isBlocked(userId, targetUserId),
      this.isBlocked(targetUserId, userId),
      this.isMuted(userId, targetUserId),
      this.isMuted(targetUserId, userId),
    ]);

    return {
      following,
      followedBy,
      blocking,
      blockedBy,
      muting,
      mutedBy,
      areMutuals: following && followedBy,
    };
  }

  // Batch operations for feed filtering
  async getBlockedUserIds(userId: string): Promise<string[]> {
    const blocks = await withErrorMapping(() =>
      prisma.block.findMany({
        where: {
          OR: [
            { blockerId: userId },
            { blockedId: userId },
          ],
        },
        select: {
          blockerId: true,
          blockedId: true,
        },
      })
    );

    // Return both users we blocked and users who blocked us
    const blockedIds = new Set<string>();
    blocks.forEach(block => {
      if (block.blockerId === userId) {
        blockedIds.add(block.blockedId);
      } else {
        blockedIds.add(block.blockerId);
      }
    });

    return Array.from(blockedIds);
  }

  async getMutedUserIds(userId: string): Promise<string[]> {
    const mutes = await withErrorMapping(() =>
      prisma.mute.findMany({
        where: {
          muterId: userId,
        },
        select: {
          mutedId: true,
        },
      })
    );

    return mutes.map(mute => mute.mutedId);
  }

  async getFollowingUserIds(userId: string): Promise<string[]> {
    const follows = await withErrorMapping(() =>
      prisma.follow.findMany({
        where: {
          followerId: userId,
        },
        select: {
          followeeId: true,
        },
      })
    );

    return follows.map(follow => follow.followeeId);
  }
} 
import { prisma } from '../lib/prisma.js';
import { withErrorMapping, NotFoundError } from '../db/errors.js';
import { UserValidations } from '../lib/validations/user.validations.js';
import type { User, Prisma } from '../../generated/prisma';

export interface CreateUserData {
  clerkId: string;
  handle: string;
  displayName?: string | null;
  isPrivate?: boolean;
}

export interface UpdateUserData {
  displayName?: string | null;
  bio?: string | null;
  isPrivate?: boolean;
  hideVotesFromFriends?: boolean;
}

export interface UserWithCounts extends User {
  _count: {
    polls: number;
    followers: number;
    following: number;
  };
}

export class UserRepository {
  async create(data: CreateUserData): Promise<User> {
    // Use centralized validation functions
    UserValidations.validateHandle(data.handle);
    UserValidations.validateDisplayName(data.displayName);

    return withErrorMapping(() =>
      prisma.user.create({
        data,
      })
    );
  }

  async findById(id: string): Promise<User | null> {
    return withErrorMapping(() =>
      prisma.user.findUnique({
        where: { id },
      })
    );
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }
    return user;
  }

  async findByHandle(handle: string): Promise<User | null> {
    return withErrorMapping(() =>
      prisma.user.findUnique({
        where: { handle },
      })
    );
  }

  async findByHandleOrThrow(handle: string): Promise<User> {
    const user = await this.findByHandle(handle);
    if (!user) {
      throw new NotFoundError('User', handle);
    }
    return user;
  }

  async findByClerkId(clerkId: string): Promise<User | null> {
    return withErrorMapping(() =>
      prisma.user.findUnique({
        where: { clerkId },
      })
    );
  }

  async findWithCounts(id: string): Promise<UserWithCounts | null> {
    return withErrorMapping(() =>
      prisma.user.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              polls: true,
              followers: true,
              following: true,
            },
          },
        },
      })
    );
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    // Use centralized validation functions
    UserValidations.validateDisplayName(data.displayName);

    return withErrorMapping(() =>
      prisma.user.update({
        where: { id },
        data,
      })
    );
  }

  async delete(id: string): Promise<void> {
    await withErrorMapping(() =>
      prisma.user.delete({
        where: { id },
      })
    );
  }

  async search(query: string, limit = 20): Promise<User[]> {
    return withErrorMapping(() =>
      prisma.user.findMany({
        where: {
          OR: [
            { handle: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: [
          { handle: 'asc' },
        ],
      })
    );
  }

  async getFollowers(userId: string, cursor?: string, limit = 20): Promise<User[]> {
    return withErrorMapping(() =>
      prisma.user.findMany({
        where: {
          following: {
            some: {
              followeeId: userId,
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

  async getFollowing(userId: string, cursor?: string, limit = 20): Promise<User[]> {
    return withErrorMapping(() =>
      prisma.user.findMany({
        where: {
          followers: {
            some: {
              followerId: userId,
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
} 
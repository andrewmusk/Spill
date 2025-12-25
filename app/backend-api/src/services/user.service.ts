import { UserRepository } from '../repos/user.repository.js';
import { SocialRepository } from '../repos/social.repository.js';
import { NotFoundError } from '../db/errors.js';
import { clerkClient } from '@clerk/express';
import { AuthenticationError } from '../lib/auth/index.js';

const userRepository = new UserRepository();
const socialRepository = new SocialRepository();

export class UserService {
  /**
   * Get or create user by Clerk ID (Just-in-Time provisioning)
   */
  async getOrCreateUser(clerkId: string) {
    try {
      // Try to find existing user
      let user = await userRepository.findByClerkId(clerkId);

      if (user) {
        return user;
      }

      // User doesn't exist, create a new one
      // First, fetch user details from Clerk
      const clerkUser = await clerkClient.users.getUser(clerkId);

      // Generate a unique handle from Clerk user data
      const baseHandle = this.generateHandle(clerkUser);
      const handle = await this.ensureUniqueHandle(baseHandle);

      // Create user in our database
      user = await userRepository.create({
        clerkId,
        handle,
        displayName: this.generateDisplayName(clerkUser),
        isPrivate: false, // Default to public profiles
      });

      console.log(`✅ Created new user: ${user.handle} (${clerkId})`);
      return user;
    } catch (error) {
      console.error('Failed to get or create user:', error);
      throw new AuthenticationError('UNAUTHORIZED', 'User provisioning failed');
    }
  }

  /**
   * Get user by Clerk ID
   */
  async getUserByClerkId(clerkId: string) {
    try {
      return await userRepository.findByClerkId(clerkId);
    } catch (error) {
      console.error('Failed to get user by Clerk ID:', error);
      return null;
    }
  }

  /**
   * Get user by handle
   */
  async getUserByHandle(handle: string, viewerId: string | null) {
    const user = await userRepository.findByHandleOrThrow(handle);

    // Get relationship status for visibility checks
    let areMutuals = false;
    if (viewerId) {
      const mutuals = await socialRepository.getMutualFollows(viewerId || '', user.id);
      areMutuals = mutuals.areMutuals;
    }

    // Check if profile should be visible
    const isOwner = viewerId === user.id;
    const canView = isOwner || !user.isPrivate || areMutuals;

    if (!canView) {
      throw new NotFoundError('User', handle);
    }

    // Get counts
    const userWithCounts = await userRepository.findWithCounts(user.id);
    if (!userWithCounts) {
      throw new NotFoundError('User', handle);
    }

    return {
      user: {
        id: userWithCounts.id,
        handle: userWithCounts.handle,
        displayName: userWithCounts.displayName,
        isPrivate: userWithCounts.isPrivate,
        createdAt: userWithCounts.createdAt,
        stats: {
          followers: userWithCounts._count.followers,
          following: userWithCounts._count.following,
          polls: userWithCounts._count.polls,
        },
      },
    };
  }

  /**
   * Search users
   */
  async searchUsers(query: string, limit: number, cursor?: string) {
    const users = await userRepository.search(query, limit + 1);

    const hasMore = users.length > limit;
    const resultUsers = hasMore ? users.slice(0, limit) : users;
    const nextCursor = hasMore && resultUsers.length > 0 ? resultUsers[resultUsers.length - 1].id : null;

    return {
      data: {
        users: resultUsers.map((u) => ({
          id: u.id,
          handle: u.handle,
          displayName: u.displayName,
          isPrivate: u.isPrivate,
          createdAt: u.createdAt,
        })),
      },
      meta: {
        nextCursor,
      },
    };
  }

  /**
   * Update user profile from Clerk data
   */
  async updateUserFromClerk(clerkId: string) {
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const user = await userRepository.findByClerkId(clerkId);
      if (!user) {
        throw new NotFoundError('User', clerkId);
      }

      return await userRepository.update(user.id, {
        displayName: this.generateDisplayName(clerkUser),
      });
    } catch (error) {
      console.error('Failed to update user from Clerk:', error);
      throw error;
    }
  }

  /**
   * Generate a handle from Clerk user data
   */
  private generateHandle(clerkUser: any): string {
    // Try to use email username, otherwise use first name, otherwise fallback
    const email = clerkUser.emailAddresses?.[0]?.emailAddress;
    if (email) {
      return email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    if (clerkUser.firstName) {
      return clerkUser.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    // Fallback to user ID suffix
    return `user${clerkUser.id.slice(-6)}`;
  }

  /**
   * Generate display name from Clerk user data
   */
  private generateDisplayName(clerkUser: any): string | null {
    if (clerkUser.firstName || clerkUser.lastName) {
      return [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');
    }

    return null;
  }

  /**
   * Ensure handle is unique by appending numbers if needed
   */
  private async ensureUniqueHandle(baseHandle: string): Promise<string> {
    let handle = baseHandle;
    let counter = 1;

    while (await this.isHandleTaken(handle)) {
      handle = `${baseHandle}${counter}`;
      counter++;

      // Prevent infinite loops
      if (counter > 1000) {
        throw new Error('Unable to generate unique handle');
      }
    }

    return handle;
  }

  /**
   * Check if a handle is already taken
   */
  private async isHandleTaken(handle: string): Promise<boolean> {
    const existingUser = await userRepository.findByHandle(handle);
    return !!existingUser;
  }
}

// Export singleton instance
export const userService = new UserService();

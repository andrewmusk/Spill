import { prisma } from '../lib/prisma.js';
import { clerkClient } from '@clerk/express';
import { AuthenticationError } from '../lib/auth/index.js';

export class UserService {
  /**
   * Get or create user by Clerk ID (Just-in-Time provisioning)
   */
  async getOrCreateUser(clerkId: string) {
    try {
      // Try to find existing user
      let user = await prisma.user.findUnique({
        where: { clerkId },
      });

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
      user = await prisma.user.create({
        data: {
          clerkId,
          handle,
          displayName: this.generateDisplayName(clerkUser),
          isPrivate: false, // Default to public profiles
        },
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
      return await prisma.user.findUnique({
        where: { clerkId },
      });
    } catch (error) {
      console.error('Failed to get user by Clerk ID:', error);
      return null;
    }
  }

  /**
   * Update user profile from Clerk data
   */
  async updateUserFromClerk(clerkId: string) {
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      
      return await prisma.user.update({
        where: { clerkId },
        data: {
          displayName: this.generateDisplayName(clerkUser),
          updatedAt: new Date(),
        },
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
    const existingUser = await prisma.user.findUnique({
      where: { handle },
    });
    
    return !!existingUser;
  }
}

// Export singleton instance
export const userService = new UserService(); 
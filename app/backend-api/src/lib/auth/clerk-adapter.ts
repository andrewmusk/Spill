import type { Request } from 'express';
import { clerkClient, getAuth } from '@clerk/express';
import type { AuthAdapter, AuthUser } from './auth-adapter.js';
import { AuthenticationError } from './auth-adapter.js';
import { env } from '../../config/env.js';

export class ClerkAuthAdapter implements AuthAdapter {
  private readonly secretKey: string;

  constructor() {
    this.secretKey = env.CLERK_SECRET_KEY;
  }

  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      // For server-side verification, we'll use the Clerk SDK's verification
      // This is a simplified approach - in practice, you might need to verify JWT directly
      return null; // Placeholder - actual verification happens in middleware
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  getAuthUser(req: Request): AuthUser | null {
    try {
      const auth = getAuth(req);
      
      if (!auth?.userId) {
        return null;
      }

      // Extract user data from Clerk auth object
      return {
        id: auth.userId,
        userId: auth.userId,
        // Additional user data would be populated by middleware
        // when fetching from Clerk or local database
      };
    } catch (error) {
      console.error('Failed to get auth user:', error);
      return null;
    }
  }

  isAuthenticated(req: Request): boolean {
    const auth = getAuth(req);
    return !!auth?.userId;
  }

  /**
   * Get full user details from Clerk API
   */
  async getUserDetails(userId: string) {
    try {
      const user = await clerkClient.users.getUser(userId);
      return {
        id: user.id,
        userId: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    } catch (error) {
      console.error('Failed to fetch user details from Clerk:', error);
      throw new AuthenticationError('UNAUTHORIZED', 'Failed to fetch user details');
    }
  }
} 
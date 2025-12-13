import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '../../services/user.service.js';
import { AuthenticationError } from '../../lib/auth/index.js';
import type { PrismaClient } from '../../../generated/prisma/index.js';

// Extend global types for test prisma instance
declare global {
  var testPrisma: PrismaClient;
}

// Mock Clerk client
vi.mock('@clerk/express', () => ({
  clerkClient: {
    users: {
      getUser: vi.fn(),
    },
  },
}));

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    vi.clearAllMocks();
  });

  describe('getOrCreateUser', () => {
    it('should return existing user if found', async () => {
      const existingUser = await globalThis.testPrisma.user.create({
        data: {
          clerkId: 'existing_clerk_id',
          handle: 'existinguser',
          displayName: 'Existing User',
        },
      });

      const result = await userService.getOrCreateUser('existing_clerk_id');

      expect(result.id).toBe(existingUser.id);
      expect(result.handle).toBe('existinguser');
    });

    it('should create new user from Clerk data', async () => {
      const { clerkClient } = await import('@clerk/express');
      (clerkClient.users.getUser as any).mockResolvedValue({
        id: 'new_clerk_id',
        emailAddresses: [{ emailAddress: 'newuser@example.com' }],
        firstName: 'New',
        lastName: 'User',
      });

      const result = await userService.getOrCreateUser('new_clerk_id');

      expect(result.clerkId).toBe('new_clerk_id');
      expect(result.handle).toBe('newuser');
      expect(result.displayName).toBe('New User');
    });

    it('should handle users without email by using firstName', async () => {
      const { clerkClient } = await import('@clerk/express');
      (clerkClient.users.getUser as any).mockResolvedValue({
        id: 'no_email_clerk_id',
        emailAddresses: [],
        firstName: 'NoEmail',
        lastName: 'User',
      });

      const result = await userService.getOrCreateUser('no_email_clerk_id');

      expect(result.handle).toBe('noemail');
      expect(result.displayName).toBe('NoEmail User');
    });

    it('should create fallback handle for users without email or name', async () => {
      const { clerkClient } = await import('@clerk/express');
      (clerkClient.users.getUser as any).mockResolvedValue({
        id: 'minimal_clerk_id_123456',
        emailAddresses: [],
        firstName: null,
        lastName: null,
      });

      const result = await userService.getOrCreateUser('minimal_clerk_id_123456');

      expect(result.handle).toBe('user123456');
      expect(result.displayName).toBeNull();
    });

    it('should handle duplicate handles by appending numbers', async () => {
      // Create existing user with handle 'testuser'
      await globalThis.testPrisma.user.create({
        data: {
          clerkId: 'existing_user',
          handle: 'testuser',
          displayName: 'Existing User',
        },
      });

      const { clerkClient } = await import('@clerk/express');
      (clerkClient.users.getUser as any).mockResolvedValue({
        id: 'duplicate_clerk_id',
        emailAddresses: [{ emailAddress: 'testuser@example.com' }],
        firstName: 'Test',
        lastName: 'User',
      });

      const result = await userService.getOrCreateUser('duplicate_clerk_id');

      expect(result.handle).toBe('testuser1');
    });

    it('should throw AuthenticationError when Clerk API fails', async () => {
      const { clerkClient } = await import('@clerk/express');
      (clerkClient.users.getUser as any).mockRejectedValue(new Error('Clerk API error'));

      await expect(userService.getOrCreateUser('failing_clerk_id'))
        .rejects
        .toThrow(AuthenticationError);
    });
  });

  describe('getUserByClerkId', () => {
    it('should return user if found', async () => {
      const user = await globalThis.testPrisma.user.create({
        data: {
          clerkId: 'test_clerk_id',
          handle: 'testuser',
          displayName: 'Test User',
        },
      });

      const result = await userService.getUserByClerkId('test_clerk_id');

      expect(result?.id).toBe(user.id);
    });

    it('should return null if user not found', async () => {
      const result = await userService.getUserByClerkId('nonexistent_clerk_id');
      expect(result).toBeNull();
    });
  });

  describe('updateUserFromClerk', () => {
    it('should update user with latest Clerk data', async () => {
      const user = await globalThis.testPrisma.user.create({
        data: {
          clerkId: 'update_test_clerk_id',
          handle: 'updatetest',
          displayName: 'Old Name',
        },
      });

      const { clerkClient } = await import('@clerk/express');
      (clerkClient.users.getUser as any).mockResolvedValue({
        id: 'update_test_clerk_id',
        emailAddresses: [{ emailAddress: 'updated@example.com' }],
        firstName: 'Updated',
        lastName: 'Name',
      });

      const result = await userService.updateUserFromClerk('update_test_clerk_id');

      expect(result.displayName).toBe('Updated Name');
      expect(result.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
    });
  });

  describe('Handle Generation Logic', () => {
    it('should sanitize email handles properly', async () => {
      const { clerkClient } = await import('@clerk/express');
      (clerkClient.users.getUser as any).mockResolvedValue({
        id: 'sanitize_test',
        emailAddresses: [{ emailAddress: 'test+user-123@example.com' }],
        firstName: 'Test',
        lastName: 'User',
      });

      const result = await userService.getOrCreateUser('sanitize_test');

      expect(result.handle).toBe('testuser123');
    });

    it('should handle very long email usernames', async () => {
      const { clerkClient } = await import('@clerk/express');
      (clerkClient.users.getUser as any).mockResolvedValue({
        id: 'long_email_test',
        emailAddresses: [{ emailAddress: 'verylongemailusernamethatexceedsnormallimits@example.com' }],
        firstName: 'Long',
        lastName: 'User',
      });

      const result = await userService.getOrCreateUser('long_email_test');

      expect(result.handle.length).toBeGreaterThan(0);
      expect(result.handle).toBe('verylongemailusernamethatexceedsnormallimits');
    });
  });
}); 
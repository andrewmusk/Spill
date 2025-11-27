import { describe, it, expect, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import { app } from '../../server.js';
import { userService } from '../../services/user.service.js';
import type { PrismaClient } from '../../../generated/prisma/index.js';

// Extend global types for test prisma instance
declare global {
  var testPrisma: PrismaClient;
}

// Mock Clerk middleware and functions
vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (req: any, res: any, next: any) => next(),
  getAuth: vi.fn(),
  clerkClient: {
    users: {
      getUser: vi.fn(),
    },
  },
}));

const request = supertest(app);

describe('Authentication Integration Tests', () => {
  const mockClerkUser = {
    id: 'clerk_test_user_123',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'Test',
    lastName: 'User',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Middleware', () => {
    it('should reject requests without authentication', async () => {
      const { getAuth } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: null });

      const response = await request
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toMatchObject({
        error: {
          type: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        meta: {
          traceId: expect.any(String),
        },
      });
    });

    it('should accept valid authentication tokens', async () => {
      const { getAuth, clerkClient } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: 'clerk_test_user_123' });
      (clerkClient.users.getUser as any).mockResolvedValue(mockClerkUser);

      const response = await request
        .get('/api/auth/me')
        .expect(200);

      expect(response.body.data.user).toMatchObject({
        handle: expect.any(String),
        displayName: 'Test User',
      });
    });

    it('should handle Clerk API failures gracefully', async () => {
      const { getAuth, clerkClient } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: 'clerk_test_user_123' });
      (clerkClient.users.getUser as any).mockRejectedValue(new Error('Clerk API error'));

      const response = await request
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error.type).toBe('UNAUTHORIZED');
    });
  });

  describe('User Provisioning (JIT)', () => {
    it('should create new user on first authentication', async () => {
      const { getAuth, clerkClient } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: 'new_clerk_user_456' });
      (clerkClient.users.getUser as any).mockResolvedValue({
        id: 'new_clerk_user_456',
        emailAddresses: [{ emailAddress: 'newuser@example.com' }],
        firstName: 'New',
        lastName: 'User',
      });

      const response = await request
        .get('/api/auth/me')
        .expect(200);

      const user = response.body.data.user;
      expect(user).toMatchObject({
        handle: 'newuser',
        displayName: 'New User',
      });

      // Verify user was created in database
      const dbUser = await globalThis.testPrisma.user.findUnique({
        where: { clerkId: 'new_clerk_user_456' }
      });
      expect(dbUser).toBeTruthy();
      expect(dbUser?.handle).toBe('newuser');
    });

    it('should handle duplicate handles by appending numbers', async () => {
      // Create a user with handle 'testuser'
      await globalThis.testPrisma.user.create({
        data: {
          clerkId: 'existing_user',
          handle: 'testuser',
          displayName: 'Existing User',
        },
      });

      const { getAuth, clerkClient } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: 'new_duplicate_user' });
      (clerkClient.users.getUser as any).mockResolvedValue({
        id: 'new_duplicate_user',
        emailAddresses: [{ emailAddress: 'testuser@example.com' }],
        firstName: 'Test',
        lastName: 'User',
      });

      const response = await request
        .get('/api/auth/me')
        .expect(200);

      expect(response.body.data.user.handle).toBe('testuser1');
    });

    it('should reuse existing users on subsequent requests', async () => {
      const existingUser = await globalThis.testPrisma.user.create({
        data: {
          clerkId: 'existing_clerk_user',
          handle: 'existing',
          displayName: 'Existing User',
        },
      });

      const { getAuth, clerkClient } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: 'existing_clerk_user' });
      (clerkClient.users.getUser as any).mockResolvedValue(mockClerkUser);

      const response = await request
        .get('/api/auth/me')
        .expect(200);

      expect(response.body.data.user.id).toBe(existingUser.id);
      
      // Should not create duplicate users
      const userCount = await globalThis.testPrisma.user.count({
        where: { clerkId: 'existing_clerk_user' }
      });
      expect(userCount).toBe(1);
    });
  });

  describe('Profile Management', () => {
    it('should update user profile', async () => {
      const user = await globalThis.testPrisma.user.create({
        data: {
          clerkId: 'profile_test_user',
          handle: 'profiletest',
          displayName: 'Profile Test',
        },
      });

      const { getAuth } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: 'profile_test_user' });

      const response = await request
        .patch('/api/auth/me')
        .send({
          displayName: 'Updated Name',
          isPrivate: true,
        })
        .expect(200);

      expect(response.body.data.user).toMatchObject({
        displayName: 'Updated Name',
        isPrivate: true,
      });
    });

    it('should sync profile from Clerk', async () => {
      const user = await globalThis.testPrisma.user.create({
        data: {
          clerkId: 'sync_test_user',
          handle: 'synctest',
          displayName: 'Old Name',
        },
      });

      const { getAuth, clerkClient } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: 'sync_test_user' });
      (clerkClient.users.getUser as any).mockResolvedValue({
        id: 'sync_test_user',
        emailAddresses: [{ emailAddress: 'sync@example.com' }],
        firstName: 'Synced',
        lastName: 'Name',
      });

      const response = await request
        .post('/api/auth/sync')
        .expect(200);

      expect(response.body.data.user.displayName).toBe('Synced Name');
    });
  });

  describe('Error Handling', () => {
    it('should return structured error responses', async () => {
      const response = await request
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toMatchObject({
        error: {
          type: expect.any(String),
          message: expect.any(String),
        },
        meta: {
          traceId: expect.any(String),
        },
      });
    });

    it('should handle malformed request bodies', async () => {
      const { getAuth } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: 'test_user' });

      await globalThis.testPrisma.user.create({
        data: {
          clerkId: 'test_user',
          handle: 'testuser',
          displayName: 'Test User',
        },
      });

      const response = await request
        .patch('/api/auth/me')
        .send('invalid json')
        .expect(400);
    });
  });
}); 
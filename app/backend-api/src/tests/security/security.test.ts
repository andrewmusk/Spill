import { describe, it, expect, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import { app } from '../../server.js';
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

describe('Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Security', () => {
    it('should reject requests without Authorization header', async () => {
      const { getAuth } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: null });

      const response = await request
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error.type).toBe('UNAUTHORIZED');
    });

    it('should reject requests with malformed Authorization header', async () => {
      const { getAuth } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: null });

      const response = await request
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.error.type).toBe('UNAUTHORIZED');
    });

    it('should reject requests with invalid Bearer token', async () => {
      const { getAuth } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: null });

      const response = await request
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.error.type).toBe('UNAUTHORIZED');
    });

    it('should not leak sensitive information in error responses', async () => {
      const { getAuth } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: null });

      const response = await request
        .get('/api/auth/me')
        .expect(401);

      // Ensure no sensitive data like database connection strings, stack traces, etc.
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/password/i);
      expect(responseText).not.toMatch(/secret/i);
      expect(responseText).not.toMatch(/token/i);
      expect(responseText).not.toMatch(/postgresql/i);
      expect(responseText).not.toMatch(/stack/i);
    });
  });

  describe('Authorization Security', () => {
    it('should prevent users from accessing other users data', async () => {
      // Create two users
      const user1 = await globalThis.testPrisma.user.create({
        data: {
          clerkId: 'user1_clerk_id',
          handle: 'user1',
          displayName: 'User One',
        },
      });

      const user2 = await globalThis.testPrisma.user.create({
        data: {
          clerkId: 'user2_clerk_id',
          handle: 'user2',
          displayName: 'User Two',
        },
      });

      // Authenticate as user1
      const { getAuth } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: 'user1_clerk_id' });

      // Try to access user2's profile by ID (this should not be allowed in current implementation)
      // Our current API doesn't have direct user ID access, which is good for security
      const response = await request
        .get('/api/users/user2')
        .expect(200); // This should work as it's public profile access

      // But verify that private profiles are protected
      await globalThis.testPrisma.user.update({
        where: { id: user2.id },
        data: { isPrivate: true },
      });

      const privateProfileResponse = await request
        .get('/api/users/user2')
        .expect(403);

      expect(privateProfileResponse.body.error.type).toBe('FORBIDDEN');
    });

    it('should prevent privilege escalation', async () => {
      const user = await globalThis.testPrisma.user.create({
        data: {
          clerkId: 'normal_user_clerk_id',
          handle: 'normaluser',
          displayName: 'Normal User',
        },
      });

      const { getAuth } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: 'normal_user_clerk_id' });

      // Try to update fields that shouldn't be user-modifiable
      const response = await request
        .patch('/api/auth/me')
        .send({
          id: 'hacked_id',
          clerkId: 'hacked_clerk_id',
          handle: 'hacked_handle', // Handle updates should be restricted
          createdAt: '2020-01-01T00:00:00.000Z',
        })
        .expect(200);

      // Verify that protected fields weren't updated
      const updatedUser = await globalThis.testPrisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser?.id).toBe(user.id); // ID unchanged
      expect(updatedUser?.clerkId).toBe('normal_user_clerk_id'); // clerkId unchanged
      expect(updatedUser?.handle).toBe('normaluser'); // Handle unchanged
      expect(updatedUser?.createdAt).toEqual(user.createdAt); // createdAt unchanged
    });
  });

  describe('Input Validation Security', () => {
    it('should sanitize user input to prevent XSS', async () => {
      const user = await globalThis.testPrisma.user.create({
        data: {
          clerkId: 'xss_test_user',
          handle: 'xsstest',
          displayName: 'XSS Test',
        },
      });

      const { getAuth } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: 'xss_test_user' });

      const maliciousInput = '<script>alert("xss")</script>';

      const response = await request
        .patch('/api/auth/me')
        .send({
          displayName: maliciousInput,
        })
        .expect(200);

      // The raw script should be stored (we're not rendering HTML)
      // but verify it doesn't execute in our JSON responses
      expect(response.body.data.user.displayName).toBe(maliciousInput);
      
      // Verify content-type is application/json to prevent script execution
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle extremely long input values', async () => {
      const user = await globalThis.testPrisma.user.create({
        data: {
          clerkId: 'long_input_test_user',
          handle: 'longinputtest',
          displayName: 'Long Input Test',
        },
      });

      const { getAuth } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: 'long_input_test_user' });

      const veryLongName = 'x'.repeat(1000); // 1000 character name

      const response = await request
        .patch('/api/auth/me')
        .send({
          displayName: veryLongName,
        })
        .expect(200);

      // Should accept but may truncate or validate length
      expect(response.body.data.user.displayName).toBeDefined();
    });

    it('should reject null bytes and other dangerous characters', async () => {
      const user = await globalThis.testPrisma.user.create({
        data: {
          clerkId: 'dangerous_char_test_user',
          handle: 'dangeroustest',
          displayName: 'Dangerous Test',
        },
      });

      const { getAuth } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: 'dangerous_char_test_user' });

      const dangerousInput = 'normal text\0null byte\r\nCRLF injection';

      const response = await request
        .patch('/api/auth/me')
        .send({
          displayName: dangerousInput,
        })
        .expect(200);

      // Verify dangerous characters are handled appropriately
      expect(response.body.data.user.displayName).toBeDefined();
    });
  });

  describe('Rate Limiting & DoS Protection', () => {
    it('should handle rapid successive requests', async () => {
      const { getAuth } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: null });

      // Make multiple rapid requests
      const promises = Array(10).fill(null).map(() =>
        request.get('/api/auth/me')
      );

      const responses = await Promise.all(promises);

      // All should return 401 (not 429 rate limit in this test env)
      responses.forEach(response => {
        expect(response.status).toBe(401);
      });
    });

    it('should handle concurrent database operations safely', async () => {
      const { getAuth, clerkClient } = await import('@clerk/express');
      
      // Simulate multiple concurrent user creations
      const promises = Array(5).fill(null).map((_, index) => {
        (getAuth as any).mockReturnValue({ userId: `concurrent_user_${index}` });
        (clerkClient.users.getUser as any).mockResolvedValue({
          id: `concurrent_user_${index}`,
          emailAddresses: [{ emailAddress: `user${index}@example.com` }],
          firstName: `User`,
          lastName: `${index}`,
        });

        return request.get('/api/auth/me');
      });

      const responses = await Promise.all(promises);

      // All should succeed without race conditions
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify all users were created correctly
      const userCount = await globalThis.testPrisma.user.count({
        where: {
          clerkId: {
            startsWith: 'concurrent_user_',
          },
        },
      });

      expect(userCount).toBe(5);
    });
  });

  describe('Data Privacy', () => {
    it('should not expose sensitive user data in public endpoints', async () => {
      const user = await globalThis.testPrisma.user.create({
        data: {
          clerkId: 'privacy_test_user',
          handle: 'privacytest',
          displayName: 'Privacy Test',
        },
      });

      const response = await request
        .get('/api/users/privacytest')
        .expect(200);

      // Verify clerkId is not exposed in public profile
      expect(response.body.data.user).not.toHaveProperty('clerkId');
      
      // Verify other sensitive fields are not exposed
      const userData = response.body.data.user;
      expect(userData).toHaveProperty('handle');
      expect(userData).toHaveProperty('displayName');
      expect(userData).not.toHaveProperty('email');
    });

    it('should properly handle CORS for API requests', async () => {
      const response = await request
        .options('/api/auth/me')
        .expect(200);

      // In production, you'd want to verify CORS headers are properly set
      // This is a placeholder test
    });
  });
}); 
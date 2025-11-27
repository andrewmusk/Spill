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

describe('Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Response Time Benchmarks', () => {
    it('should respond to health checks under 100ms', async () => {
      const startTime = Date.now();
      
      const response = await request
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(100);
      expect(response.body.data.status).toBe('healthy');
    }, 5000);

    it('should handle authentication requests under 500ms', async () => {
      const { getAuth, clerkClient } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: 'perf_test_user' });
      (clerkClient.users.getUser as any).mockResolvedValue({
        id: 'perf_test_user',
        emailAddresses: [{ emailAddress: 'perf@example.com' }],
        firstName: 'Performance',
        lastName: 'Test',
      });

      const startTime = Date.now();
      
      const response = await request
        .get('/api/auth/me')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(500);
      expect(response.body.data.user).toBeDefined();
    }, 10000);

    it('should handle database operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple users to test bulk operations
      const userPromises = Array(10).fill(null).map((_, index) =>
        globalThis.testPrisma.user.create({
          data: {
            clerkId: `bulk_test_user_${index}`,
            handle: `bulkuser${index}`,
            displayName: `Bulk User ${index}`,
          },
        })
      );
      
      await Promise.all(userPromises);
      
      const creationTime = Date.now() - startTime;
      
      // Should create 10 users in under 1 second
      expect(creationTime).toBeLessThan(1000);
      
      // Test querying them back
      const queryStartTime = Date.now();
      
      const users = await globalThis.testPrisma.user.findMany({
        where: {
          clerkId: {
            startsWith: 'bulk_test_user_',
          },
        },
      });
      
      const queryTime = Date.now() - queryStartTime;
      
      expect(queryTime).toBeLessThan(100);
      expect(users).toHaveLength(10);
    }, 15000);
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent health checks', async () => {
      const concurrentRequests = 20;
      const startTime = Date.now();
      
      const promises = Array(concurrentRequests).fill(null).map(() =>
        request.get('/health')
      );
      
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe('healthy');
      });
      
      // Average response time per request should be reasonable
      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(200);
    }, 10000);

    it('should handle concurrent user creation without race conditions', async () => {
      const { getAuth, clerkClient } = await import('@clerk/express');
      
      const concurrentUsers = 10;
      const startTime = Date.now();
      
      const promises = Array(concurrentUsers).fill(null).map((_, index) => {
        (getAuth as any).mockReturnValue({ userId: `concurrent_perf_user_${index}` });
        (clerkClient.users.getUser as any).mockResolvedValue({
          id: `concurrent_perf_user_${index}`,
          emailAddresses: [{ emailAddress: `perfuser${index}@example.com` }],
          firstName: `Perf`,
          lastName: `User${index}`,
        });

        return request.get('/api/auth/me');
      });
      
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Verify all users were created without duplicates
      const userCount = await globalThis.testPrisma.user.count({
        where: {
          clerkId: {
            startsWith: 'concurrent_perf_user_',
          },
        },
      });
      
      expect(userCount).toBe(concurrentUsers);
      
      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(5000);
    }, 15000);
  });

  describe('Memory and Resource Usage', () => {
    it('should not have memory leaks with repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Make many requests to test for memory leaks
      for (let i = 0; i < 50; i++) {
        await request.get('/health');
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }, 30000);

    it('should handle large payloads efficiently', async () => {
      const { getAuth } = await import('@clerk/express');
      (getAuth as any).mockReturnValue({ userId: 'large_payload_user' });

      await globalThis.testPrisma.user.create({
        data: {
          clerkId: 'large_payload_user',
          handle: 'largepayload',
          displayName: 'Large Payload User',
        },
      });

      const largeDisplayName = 'A'.repeat(1000); // 1KB display name
      
      const startTime = Date.now();
      
      const response = await request
        .patch('/api/auth/me')
        .send({
          displayName: largeDisplayName,
        })
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(1000);
      expect(response.body.data.user.displayName).toBe(largeDisplayName);
    }, 10000);
  });

  describe('Database Performance', () => {
    it('should handle complex queries efficiently', async () => {
      // Create test data
      const users = await Promise.all(
        Array(20).fill(null).map((_, index) =>
          globalThis.testPrisma.user.create({
            data: {
              clerkId: `query_test_user_${index}`,
              handle: `queryuser${index}`,
              displayName: `Query User ${index}`,
              isPrivate: index % 2 === 0, // Every other user is private
            },
          })
        )
      );

      const startTime = Date.now();
      
      // Complex query with filtering and counting
      const [publicUsers, privateCount] = await Promise.all([
        globalThis.testPrisma.user.findMany({
          where: {
            isPrivate: false,
            displayName: {
              contains: 'Query User',
            },
          },
          select: {
            id: true,
            handle: true,
            displayName: true,
            _count: {
              select: {
                polls: true,
                followers: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        globalThis.testPrisma.user.count({
          where: {
            isPrivate: true,
            clerkId: {
              startsWith: 'query_test_user_',
            },
          },
        }),
      ]);
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(200);
      expect(publicUsers.length).toBe(10); // Half the users are public
      expect(privateCount).toBe(10); // Half the users are private
    }, 10000);
  });

  describe('Monitoring Endpoints Performance', () => {
    it('should provide metrics quickly', async () => {
      const startTime = Date.now();
      
      const response = await request
        .get('/monitoring/metrics')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      expect(responseTime).toBeLessThan(1000);
      expect(response.body.data.metrics).toBeDefined();
      expect(response.body.data.metrics.database.responseTime).toBeLessThan(100);
    }, 5000);
  });
}); 
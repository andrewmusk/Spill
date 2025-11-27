import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuthentication } from '../../http/middleware/auth.middleware.js';

const router = Router();

// Basic metrics (public for monitoring tools)
router.get('/metrics', async (req, res, next) => {
  try {
    const startTime = Date.now();
    
    // Test database connectivity
    const dbTestStart = Date.now();
    await prisma.$queryRaw`SELECT 1 as test`;
    const dbResponseTime = Date.now() - dbTestStart;

    // Get basic stats
    const [userCount, pollCount] = await Promise.all([
      prisma.user.count(),
      prisma.poll.count(),
    ]);

    // Memory usage
    const memoryUsage = process.memoryUsage();
    
    // System uptime
    const uptime = process.uptime();
    
    const totalResponseTime = Date.now() - startTime;

    res.json({
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        metrics: {
          database: {
            responseTime: dbResponseTime,
            status: 'connected',
            connections: 'active', // Could be enhanced with actual connection pool stats
          },
          application: {
            uptime: Math.round(uptime),
            responseTime: totalResponseTime,
            memory: {
              used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
              total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
              external: Math.round(memoryUsage.external / 1024 / 1024), // MB
            },
          },
          business: {
            totalUsers: userCount,
            totalPolls: pollCount,
          },
        },
      },
      meta: {
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    console.error('Metrics endpoint failed:', error);
    res.status(500).json({
      error: {
        type: 'METRICS_ERROR',
        message: 'Failed to collect metrics',
      },
      meta: {
        traceId: req.headers['x-request-id'],
      },
    });
  }
});

// Detailed health check for ops teams (protected)
router.get('/detailed', requireAuthentication(), async (req, res, next) => {
  try {
    const startTime = Date.now();
    
    // Comprehensive database tests
    const dbTests = {
      connectivity: false,
      readOps: false,
      writeOps: false,
      transactionOps: false,
    };

    try {
      // Test basic connectivity
      await prisma.$queryRaw`SELECT NOW() as timestamp`;
      dbTests.connectivity = true;

      // Test read operations
      await prisma.user.findFirst();
      dbTests.readOps = true;

      // Test write operations (create and delete a test record)
      await prisma.$transaction(async (tx) => {
        const testUser = await tx.user.create({
          data: {
            clerkId: `health_check_${Date.now()}`,
            handle: `healthcheck${Date.now()}`,
            displayName: 'Health Check Test User',
          },
        });
        
        await tx.user.delete({
          where: { id: testUser.id },
        });
      });
      
      dbTests.writeOps = true;
      dbTests.transactionOps = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Authentication system health
    const authHealth = {
      middleware: true, // If we got here, auth middleware is working
      userProvisioning: true, // req.user should exist if auth passed
    };

    // Performance metrics
    const performanceMetrics = {
      responseTime: Date.now() - startTime,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };

    // Recent error counts (could be enhanced with actual error tracking)
    const errorMetrics = {
      lastHour: 0, // Placeholder - implement with actual error tracking
      last24Hours: 0,
      criticalErrors: 0,
    };

    res.json({
      data: {
        status: Object.values(dbTests).every(Boolean) ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbTests,
          authentication: authHealth,
          performance: performanceMetrics,
          errors: errorMetrics,
        },
        recommendations: generateHealthRecommendations(dbTests, performanceMetrics),
      },
      meta: {
        traceId: req.headers['x-request-id'],
        user: req.user?.handle,
      },
    });
  } catch (error) {
    console.error('Detailed health check failed:', error);
    next(error);
  }
});

// Auth-specific health metrics
router.get('/auth-metrics', requireAuthentication(), async (req, res, next) => {
  try {
    // Get authentication-related metrics
    const recentUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    const privateUsers = await prisma.user.count({
      where: { isPrivate: true },
    });

    const usersWithDisplayNames = await prisma.user.count({
      where: {
        displayName: {
          not: null,
        },
      },
    });

    res.json({
      data: {
        authentication: {
          newUsersLast24h: recentUsers,
          privateProfiles: privateUsers,
          profilesWithDisplayNames: usersWithDisplayNames,
          jitProvisioningHealth: 'operational', // Could be calculated based on error rates
        },
        currentUser: {
          id: req.user?.id,
          handle: req.user?.handle,
          isPrivate: req.user?.isPrivate,
          accountAge: req.user?.createdAt ? 
            Math.floor((Date.now() - req.user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 
            null,
        },
      },
      meta: {
        traceId: req.headers['x-request-id'],
      },
    });
  } catch (error) {
    console.error('Auth metrics failed:', error);
    next(error);
  }
});

function generateHealthRecommendations(dbTests: any, performanceMetrics: any): string[] {
  const recommendations: string[] = [];

  if (!dbTests.connectivity) {
    recommendations.push('Database connectivity issues detected - check connection settings');
  }

  if (!dbTests.writeOps) {
    recommendations.push('Database write operations failing - check permissions and disk space');
  }

  if (performanceMetrics.responseTime > 1000) {
    recommendations.push('High response times detected - consider performance optimization');
  }

  const memoryUsage = process.memoryUsage();
  const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  if (memoryUsedMB > 500) {
    recommendations.push('High memory usage detected - monitor for memory leaks');
  }

  if (recommendations.length === 0) {
    recommendations.push('All systems operating normally');
  }

  return recommendations;
}

export { router as monitoringRoutes }; 